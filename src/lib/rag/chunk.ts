import type { JobListing } from "@/lib/scraper/types";

/** Soft ceiling near embedding model practical input size. */
const MAX_CHARS = 24_000;

/**
 * Build one embeddable document per job (no token chunk splits).
 */
export function toEmbeddingDocument(job: JobListing): string {
  const parts = [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Source: ${job.source}`,
    `Tags: ${job.tags.join(", ") || "none"}`,
    `URL: ${job.url}`,
    "",
    "Description:",
    job.description || "(no description)",
  ];

  const text = parts.join("\n").trim();
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n…[truncated]`;
}

export function toStoreRow(
  job: JobListing,
  vector: number[],
  lastSeen: number,
): JobRecord {
  return {
    jobId: job.jobId,
    title: job.title,
    company: job.company,
    location: job.location,
    tags: job.tags.join(","),
    description: job.description,
    url: job.url,
    source: job.source,
    scrapedAt: job.scrapedAt,
    lastSeen,
    text: toEmbeddingDocument(job),
    vector,
  };
}

export type JobRecord = {
  jobId: string;
  title: string;
  company: string;
  location: string;
  tags: string;
  description: string;
  url: string;
  source: string;
  scrapedAt: number;
  lastSeen: number;
  text: string;
  vector: number[];
};
