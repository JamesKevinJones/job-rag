import { scrapeHtmlListings } from "@/lib/scraper/html";
import { fetchRemoteOkJobs } from "@/lib/scraper/remoteok";
import { fetchRemotiveJobs } from "@/lib/scraper/remotive";
import type { JobListing } from "@/lib/scraper/types";

export type { JobListing } from "@/lib/scraper/types";
export { JobListingSchema } from "@/lib/scraper/types";

export async function scrapeAllJobs(options?: {
  remoteOkLimit?: number;
  remotiveLimit?: number;
  htmlLimit?: number;
}): Promise<JobListing[]> {
  const [remoteok, remotive, html] = await Promise.all([
    fetchRemoteOkJobs(options?.remoteOkLimit ?? 80),
    fetchRemotiveJobs(options?.remotiveLimit ?? 80),
    scrapeHtmlListings(options?.htmlLimit ?? 40),
  ]);

  const byId = new Map<string, JobListing>();
  const byUrl = new Map<string, string>();

  for (const job of [...remoteok, ...remotive, ...html]) {
    const urlKey = job.url.split("?")[0].toLowerCase();
    const existingId = byUrl.get(urlKey);
    if (existingId && existingId !== job.jobId) {
      // Prefer API rows (richer descriptions) over HTML stubs.
      const existing = byId.get(existingId);
      if (existing && existing.description.length >= job.description.length) {
        continue;
      }
      byId.delete(existingId);
    }
    byId.set(job.jobId, job);
    byUrl.set(urlKey, job.jobId);
  }

  return [...byId.values()];
}
