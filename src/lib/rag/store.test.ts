import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredJob } from "@/lib/rag/store";
import type { JobListing } from "@/lib/scraper/types";

const embedTexts = vi.fn(async (texts: string[]) => texts.map(() => [0.5, 0.5]));
vi.mock("@/lib/rag/embeddings", () => ({
  embedTexts: (texts: string[]) => embedTexts(texts),
}));

const HOUR = 60 * 60 * 1000;
let dir: string;

// The store keeps a module-level cache and resolves data/ from process.cwd(),
// so every test gets a fresh module pointed at its own temp folder.
async function freshStore() {
  vi.resetModules();
  return import("@/lib/rag/store");
}

async function writeIndex(jobs: Partial<StoredJob>[]) {
  await mkdir(path.join(dir, "data"), { recursive: true });
  await writeFile(
    path.join(dir, "data", "jobs-index.json"),
    JSON.stringify({ version: 1, updatedAt: 0, jobs }),
  );
}

async function readIndexFile() {
  return JSON.parse(await readFile(path.join(dir, "data", "jobs-index.json"), "utf8"));
}

function listing(jobId: string): JobListing {
  return {
    jobId,
    title: `Job ${jobId}`,
    company: "Acme",
    location: "Remote",
    tags: ["react"],
    description: "Build things",
    url: `https://example.com/${jobId}`,
    source: "remotive",
    scrapedAt: 0,
  };
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "job-rag-store-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  embedTexts.mockClear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe("pruneStaleJobs", () => {
  it("drops listings not seen in the last 48 hours and keeps the rest", async () => {
    const now = Date.now();
    await writeIndex([
      { jobId: "fresh", lastSeen: now - 1 * HOUR },
      { jobId: "edge", lastSeen: now - 47 * HOUR },
      { jobId: "stale", lastSeen: now - 49 * HOUR },
    ]);
    const store = await freshStore();

    expect(await store.pruneStaleJobs()).toBe(1);
    expect((await store.loadAllJobs()).map((j) => j.jobId)).toEqual(["fresh", "edge"]);
    expect((await readIndexFile()).jobs).toHaveLength(2);
  });

  it("does not rewrite the file when nothing is stale", async () => {
    await writeIndex([{ jobId: "fresh", lastSeen: Date.now() }]);
    const store = await freshStore();

    expect(await store.pruneStaleJobs()).toBe(0);
    expect((await readIndexFile()).updatedAt).toBe(0);
  });
});

describe("upsertJobs", () => {
  it("embeds new listings and refreshes lastSeen on ones already indexed", async () => {
    await writeIndex([{ jobId: "a", lastSeen: 1, vector: [] }]);
    const store = await freshStore();

    const before = Date.now();
    expect(await store.upsertJobs([listing("a"), listing("b")])).toEqual({ upserted: 2 });

    const jobs = await store.loadAllJobs();
    expect(jobs.map((j) => j.jobId).sort()).toEqual(["a", "b"]);
    for (const j of jobs) {
      expect(j.lastSeen).toBeGreaterThanOrEqual(before);
      expect(j.vector).toEqual([0.5, 0.5]);
    }
    expect(embedTexts).toHaveBeenCalledTimes(1);
  });

  it("makes no embedding call for an empty batch", async () => {
    const store = await freshStore();
    expect(await store.upsertJobs([])).toEqual({ upserted: 0 });
    expect(embedTexts).not.toHaveBeenCalled();
  });
});

describe("loadAllJobs", () => {
  it("treats a missing index as empty", async () => {
    const store = await freshStore();
    expect(await store.loadAllJobs()).toEqual([]);
  });

  it("treats a corrupt index as empty instead of crashing the chat route", async () => {
    await mkdir(path.join(dir, "data"), { recursive: true });
    await writeFile(path.join(dir, "data", "jobs-index.json"), "{not json");
    const store = await freshStore();
    expect(await store.loadAllJobs()).toEqual([]);
  });
});
