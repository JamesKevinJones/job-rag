import {
  CACHE_TTL_MS,
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

type RemoteOkJob = {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  description?: string;
  url?: string;
  apply_url?: string;
  date?: string;
};

const API_URL = "https://remoteok.com/api";

export async function fetchRemoteOkJobs(limit = 80): Promise<JobListing[]> {
  const cacheKey = `remoteok:api:title-tech:${limit}`;
  const cached = await readCachedJson<JobListing[]>(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  await sleep(REQUEST_DELAY_MS);
  const res = await fetch(API_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "JobMatchRAG/1.0 (local research; contact: local)",
    },
  });
  if (!res.ok) {
    throw new Error(`RemoteOK API failed: ${res.status} ${res.statusText}`);
  }

  const payload = (await res.json()) as RemoteOkJob[];
  const now = Date.now();
  const titleTech =
    /\b(developer|engineer|engineering|software|frontend|front-end|backend|back-end|full.?stack|devops|sre|typescript|react|python|golang|rust|kubernetes|machine learning|data scientist|data engineer|ios|android|mobile engineer|security engineer|cloud|architect)\b/i;
  const ranked: JobListing[] = [];

  for (const row of payload) {
    if (!row.id || !row.position || !row.company) continue;
    const jobId = `remoteok:${row.id}`;
    const url =
      row.url ||
      row.apply_url ||
      (row.slug ? `https://remoteok.com/remote-jobs/${row.slug}` : null);
    if (!url) continue;

    const tags = normalizeTags(row.tags ?? []);
    if (!titleTech.test(row.position)) continue;

    ranked.push({
      jobId,
      title: row.position.trim(),
      company: row.company.trim(),
      location: (row.location || "Worldwide").trim() || "Worldwide",
      tags,
      description: stripHtml(row.description ?? ""),
      url,
      source: "remoteok",
      scrapedAt: now,
    });
  }

  const jobs = ranked.slice(0, limit);

  await writeCachedJson(cacheKey, jobs);
  return jobs;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
