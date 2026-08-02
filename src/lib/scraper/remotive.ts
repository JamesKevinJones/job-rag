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

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location?: string;
  category?: string;
  tags?: string[];
  description?: string;
  job_type?: string;
};

type RemotiveResponse = {
  jobs?: RemotiveJob[];
};

const API_URL = "https://remotive.com/api/remote-jobs?category=software-dev";

export async function fetchRemotiveJobs(limit = 80): Promise<JobListing[]> {
  const cacheKey = `remotive:api:software-dev:${limit}`;
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
    throw new Error(`Remotive API failed: ${res.status} ${res.statusText}`);
  }

  const payload = (await res.json()) as RemotiveResponse;
  const now = Date.now();
  const jobs: JobListing[] = [];

  for (const row of payload.jobs ?? []) {
    if (!row.id || !row.title || !row.company_name || !row.url) continue;
    const tags = normalizeTags([
      ...(row.tags ?? []),
      row.category ?? "",
      row.job_type ?? "",
    ]);

    jobs.push({
      jobId: `remotive:${row.id}`,
      title: row.title.trim(),
      company: row.company_name.trim(),
      location:
        (row.candidate_required_location || "Remote").trim() || "Remote",
      tags,
      description: stripHtml(row.description ?? ""),
      url: row.url,
      source: "remotive",
      scrapedAt: now,
    });

    if (jobs.length >= limit) break;
  }

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
    .replace(/\s+/g, " ")
    .trim();
}
