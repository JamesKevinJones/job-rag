import * as cheerio from "cheerio";
import {
  CACHE_TTL_MS,
  HTML_LISTING_SOURCES,
  REQUEST_DELAY_MS,
} from "@/lib/scraper/sources";
import {
  readCachedJson,
  sleep,
  writeCachedJson,
} from "@/lib/scraper/cache";
import {
  type JobListing,
  normalizeTags,
} from "@/lib/scraper/types";

/**
 * Cheerio scrape of public listing HTML as a third corpus signal.
 * Complements API sources; deduped later by jobId/url.
 */
export async function scrapeHtmlListings(limit = 40): Promise<JobListing[]> {
  const jobs: JobListing[] = [];

  for (const source of HTML_LISTING_SOURCES) {
    const cacheKey = `html:${source.id}:v3`;
    const cached = await readCachedJson<JobListing[]>(cacheKey, CACHE_TTL_MS);
    if (cached) {
      jobs.push(...cached);
      continue;
    }

    await sleep(REQUEST_DELAY_MS);
    const res = await fetch(source.url, {
      headers: {
        Accept: "text/html",
        "User-Agent":
          "JobMatchRAG/1.0 (+local; respectful scrape; contact: local)",
      },
    });
    if (!res.ok) {
      console.warn(`HTML scrape failed for ${source.url}: ${res.status}`);
      continue;
    }

    const html = await res.text();
    const parsed =
      source.kind === "wwr-list" ? parseWeWorkRemotely(html) : [];

    await writeCachedJson(cacheKey, parsed);
    jobs.push(...parsed);
  }

  return jobs.slice(0, limit);
}

function parseWeWorkRemotely(html: string): JobListing[] {
  const $ = cheerio.load(html);
  const now = Date.now();
  const jobs: JobListing[] = [];

  $('a[href*="/remote-jobs/"]').each((_, el) => {
    const anchor = $(el);
    const href = anchor.attr("href");
    if (!href || href.includes("find-your-plan")) return;

    const url = href.startsWith("http")
      ? href
      : `https://weworkremotely.com${href}`;
    const slug = href.split("/").filter(Boolean).pop() || "";
    if (!slug || slug.includes("?")) return;

    // Prefer structured children when present
    let company = anchor.find(".company").first().text().trim();
    let title = anchor.find(".title").first().text().trim();
    const location =
      anchor.find(".region").first().text().trim() ||
      anchor.find(".location").first().text().trim() ||
      "Remote";

    if (!title || !company) {
      const parsed = parseWwrSlug(slug);
      title = title || parsed.title;
      company = company || parsed.company;
    }

    if (!title || title.toLowerCase() === "post a job") return;

    const tags = normalizeTags([
      ...anchor
        .find(".tag, .category")
        .map((__, tag) => $(tag).text())
        .get(),
      "remote",
      "programming",
      ...title.toLowerCase().split(/\W+/).filter((t) => t.length > 3).slice(0, 4),
    ]);

    jobs.push({
      jobId: `html:wwr:${slug}`,
      title,
      company,
      location: location || "Remote",
      tags,
      description: `${title} at ${company}. Location: ${location}. Listed on We Work Remotely.`,
      url: url.split("?")[0],
      source: "html",
      scrapedAt: now,
    });
  });

  const dedup = new Map<string, JobListing>();
  for (const job of jobs) dedup.set(job.jobId, job);
  return [...dedup.values()];
}

/** Derive rough title/company from WWR slug: company-role-words */
function parseWwrSlug(slug: string): { company: string; title: string } {
  const parts = slug.split("-").filter(Boolean);
  if (parts.length < 2) {
    return { company: "Unknown", title: slug.replace(/-/g, " ") };
  }

  // Heuristic: first 1–3 tokens are company-ish if remaining looks like a role
  const roleWords = new Set([
    "engineer",
    "developer",
    "designer",
    "manager",
    "lead",
    "senior",
    "junior",
    "staff",
    "principal",
    "fullstack",
    "frontend",
    "backend",
    "product",
    "data",
    "devops",
    "qa",
    "sre",
    "mobile",
    "ios",
    "android",
    "software",
    "ai",
    "ml",
  ]);

  let splitAt = 1;
  for (let i = 1; i < Math.min(parts.length, 4); i++) {
    if (roleWords.has(parts[i]!)) {
      splitAt = i;
      break;
    }
    splitAt = i + 1;
  }

  const company = parts
    .slice(0, splitAt)
    .map(capitalize)
    .join(" ");
  const title = parts.slice(splitAt).map(capitalize).join(" ") || slug;

  return { company, title };
}

function capitalize(word: string): string {
  if (!word) return word;
  if (word.length <= 3 && word === word.toUpperCase()) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}
