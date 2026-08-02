import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { JobListing } from "@/lib/scraper/types";
import { toStoreRow, type JobRecord } from "@/lib/rag/chunk";
import { embedTexts } from "@/lib/rag/embeddings";

export const STALE_MS = 48 * 60 * 60 * 1000;

export type StoredJob = JobRecord;

type JobIndexFile = {
  version: 1;
  updatedAt: number;
  jobs: StoredJob[];
};

function indexPath(): string {
  return path.join(process.cwd(), "data", "jobs-index.json");
}

export function dbPath(): string {
  return indexPath();
}

let memoryCache: JobIndexFile | null = null;

async function readIndex(): Promise<JobIndexFile> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await readFile(indexPath(), "utf8");
    const parsed = JSON.parse(raw) as JobIndexFile;
    if (!parsed?.jobs || !Array.isArray(parsed.jobs)) {
      return { version: 1, updatedAt: 0, jobs: [] };
    }
    memoryCache = parsed;
    return parsed;
  } catch {
    return { version: 1, updatedAt: 0, jobs: [] };
  }
}

async function writeIndex(index: JobIndexFile): Promise<void> {
  await mkdir(path.dirname(indexPath()), { recursive: true });
  const payload: JobIndexFile = {
    version: 1,
    updatedAt: Date.now(),
    jobs: index.jobs,
  };
  await writeFile(indexPath(), JSON.stringify(payload), "utf8");
  memoryCache = payload;
}

export async function loadAllJobs(): Promise<StoredJob[]> {
  const index = await readIndex();
  return index.jobs;
}

export async function upsertJobs(jobs: JobListing[]): Promise<{
  upserted: number;
}> {
  if (jobs.length === 0) return { upserted: 0 };

  const now = Date.now();
  const texts = jobs.map((job) => toStoreRow(job, [], now).text);
  const vectors = await embedTexts(texts);
  const incoming = new Map(
    jobs.map((job, i) => [job.jobId, toStoreRow(job, vectors[i]!, now)]),
  );

  const index = await readIndex();
  const byId = new Map(index.jobs.map((job) => [job.jobId, job]));

  for (const [id, row] of incoming) {
    byId.set(id, row);
  }

  index.jobs = [...byId.values()];
  await writeIndex(index);
  return { upserted: incoming.size };
}

export async function pruneStaleJobs(
  maxAgeMs: number = STALE_MS,
): Promise<number> {
  const index = await readIndex();
  const cutoff = Date.now() - maxAgeMs;
  const before = index.jobs.length;
  index.jobs = index.jobs.filter((job) => job.lastSeen >= cutoff);
  const pruned = before - index.jobs.length;
  if (pruned > 0) await writeIndex(index);
  return pruned;
}

export async function listJobs(limit = 100): Promise<
  Omit<StoredJob, "vector" | "text">[]
> {
  const jobs = await loadAllJobs();
  return jobs
    .slice()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, limit)
    .map(({ vector: _v, text: _t, ...rest }) => rest);
}

export async function getIndexStats(): Promise<{
  count: number;
  dbPath: string;
  newestLastSeen: number | null;
  oldestLastSeen: number | null;
}> {
  const jobs = await loadAllJobs();
  const times = jobs.map((j) => j.lastSeen).filter(Number.isFinite);
  return {
    count: jobs.length,
    dbPath: dbPath(),
    newestLastSeen: times.length ? Math.max(...times) : null,
    oldestLastSeen: times.length ? Math.min(...times) : null,
  };
}
