import { describe, expect, it, vi } from "vitest";
import type { JobListing } from "@/lib/scraper/types";

const remoteok = vi.fn<() => Promise<JobListing[]>>(async () => []);
const remotive = vi.fn<() => Promise<JobListing[]>>(async () => []);
const html = vi.fn<() => Promise<JobListing[]>>(async () => []);

vi.mock("@/lib/scraper/remoteok", () => ({ fetchRemoteOkJobs: () => remoteok() }));
vi.mock("@/lib/scraper/remotive", () => ({ fetchRemotiveJobs: () => remotive() }));
vi.mock("@/lib/scraper/html", () => ({ scrapeHtmlListings: () => html() }));

const { scrapeAllJobs } = await import("@/lib/scraper");

function listing(jobId: string, url: string, description: string): JobListing {
  return {
    jobId,
    title: "Engineer",
    company: "Acme",
    location: "Remote",
    tags: [],
    description,
    url,
    source: "remoteok",
    scrapedAt: 0,
  };
}

describe("scrapeAllJobs", () => {
  it("keeps one row per posting URL, ignoring the query string", async () => {
    remoteok.mockResolvedValueOnce([
      listing("api", "https://x.com/jobs/1?ref=remoteok", "full API description"),
    ]);
    html.mockResolvedValueOnce([listing("stub", "https://X.com/jobs/1", "stub")]);

    const jobs = await scrapeAllJobs();

    expect(jobs.map((j) => j.jobId)).toEqual(["api"]);
  });

  it("replaces a thin row when a later source has the richer description", async () => {
    remoteok.mockResolvedValueOnce([listing("thin", "https://x.com/jobs/2", "short")]);
    remotive.mockResolvedValueOnce([
      listing("rich", "https://x.com/jobs/2", "a much longer description"),
    ]);

    const jobs = await scrapeAllJobs();

    expect(jobs.map((j) => j.jobId)).toEqual(["rich"]);
  });

  it("keeps distinct postings from every source", async () => {
    remoteok.mockResolvedValueOnce([listing("a", "https://x.com/a", "")]);
    remotive.mockResolvedValueOnce([listing("b", "https://x.com/b", "")]);
    html.mockResolvedValueOnce([listing("c", "https://x.com/c", "")]);

    expect((await scrapeAllJobs()).map((j) => j.jobId).sort()).toEqual(["a", "b", "c"]);
  });
});
