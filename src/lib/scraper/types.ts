import { z } from "zod";

export const JobListingSchema = z.object({
  jobId: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().default("Remote"),
  tags: z.array(z.string()).default([]),
  description: z.string().default(""),
  url: z.string().url(),
  source: z.enum(["remoteok", "remotive", "html"]),
  scrapedAt: z.number().int().nonnegative(),
});

export type JobListing = z.infer<typeof JobListingSchema>;

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}
