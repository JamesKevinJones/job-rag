import { embedQuery } from "@/lib/rag/embeddings";
import { loadAllJobs, type StoredJob } from "@/lib/rag/store";

export type RetrievedJob = {
  jobId: string;
  title: string;
  company: string;
  location: string;
  tags: string[];
  description: string;
  url: string;
  source: string;
  score: number;
};

export type HybridFilters = {
  tags: string[];
  sources: string[];
  locationHints: string[];
  remoteOnly: boolean;
};

const KNOWN_TAGS = [
  "react",
  "typescript",
  "javascript",
  "python",
  "golang",
  "go",
  "rust",
  "java",
  "kotlin",
  "swift",
  "node",
  "nodejs",
  "nextjs",
  "next.js",
  "vue",
  "angular",
  "django",
  "flask",
  "rails",
  "aws",
  "gcp",
  "azure",
  "devops",
  "kubernetes",
  "docker",
  "machine learning",
  "ml",
  "ai",
  "data",
  "frontend",
  "backend",
  "full stack",
  "fullstack",
  "mobile",
  "ios",
  "android",
  "security",
  "design",
  "product",
  "senior",
  "junior",
  "staff",
  "lead",
];

export function extractFilters(query: string): HybridFilters {
  const q = query.toLowerCase();
  const tags = KNOWN_TAGS.filter((tag) => q.includes(tag));
  const sources: string[] = [];
  if (q.includes("remoteok")) sources.push("remoteok");
  if (q.includes("remotive")) sources.push("remotive");
  if (q.includes("we work remotely") || q.includes("wwr")) sources.push("html");

  const locationHints: string[] = [];
  for (const hint of [
    "europe",
    "usa",
    "united states",
    "uk",
    "india",
    "canada",
    "latam",
    "apac",
    "worldwide",
  ]) {
    if (q.includes(hint)) locationHints.push(hint);
  }

  const remoteOnly =
    /\bremote\b/.test(q) ||
    /\bwork from home\b/.test(q) ||
    /\bwfh\b/.test(q);

  return { tags, sources, locationHints, remoteOnly };
}

export function matchesFilters(job: StoredJob, filters: HybridFilters): boolean {
  if (filters.tags.length > 0) {
    const tagHay = job.tags.toLowerCase();
    const titleHay = `${job.title} ${job.description}`.toLowerCase();
    const hit = filters.tags.some(
      (tag) => tagHay.includes(tag) || titleHay.includes(tag),
    );
    if (!hit) return false;
  }

  if (filters.sources.length > 0 && !filters.sources.includes(job.source)) {
    return false;
  }

  if (filters.locationHints.length > 0) {
    const loc = job.location.toLowerCase();
    if (!filters.locationHints.some((hint) => loc.includes(hint))) return false;
  }

  if (filters.remoteOnly) {
    const loc = job.location.toLowerCase();
    const remote =
      loc.includes("remote") ||
      loc.includes("worldwide") ||
      loc.includes("anywhere") ||
      loc.length === 0;
    if (!remote) return false;
  }

  return true;
}

/** Human-readable filter summary (replaces LanceDB SQL where string). */
export function describeFilters(filters: HybridFilters): string | null {
  const parts: string[] = [];
  if (filters.tags.length) parts.push(`tags∈[${filters.tags.join(",")}]`);
  if (filters.sources.length) parts.push(`source∈[${filters.sources.join(",")}]`);
  if (filters.locationHints.length) {
    parts.push(`location∈[${filters.locationHints.join(",")}]`);
  }
  if (filters.remoteOnly) parts.push("remote");
  return parts.length ? parts.join(" AND ") : null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function keywordScore(query: string, job: StoredJob): number {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9#+.]+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return 0;
  const hay = `${job.title} ${job.company} ${job.tags} ${job.description}`.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (hay.includes(term)) hits += 1;
  }
  return hits / terms.length;
}

export async function hybridRetrieve(
  query: string,
  topK = 6,
): Promise<{
  jobs: RetrievedJob[];
  filters: HybridFilters;
  where: string | null;
  usedFallback: boolean;
}> {
  const all = await loadAllJobs();
  const filters = extractFilters(query);
  const where = describeFilters(filters);

  if (all.length === 0) {
    return { jobs: [], filters, where, usedFallback: false };
  }

  let pool = all.filter((job) => matchesFilters(job, filters));
  let usedFallback = false;
  if (pool.length === 0) {
    pool = all;
    usedFallback = true;
  }

  const hasVectors = pool.some((job) => job.vector?.length);
  let ranked: { job: StoredJob; score: number }[];

  if (hasVectors) {
    const queryVector = await embedQuery(query);
    ranked = pool.map((job) => ({
      job,
      score: cosineSimilarity(queryVector, job.vector ?? []),
    }));
  } else {
    ranked = pool.map((job) => ({
      job,
      score: keywordScore(query, job),
    }));
  }

  ranked.sort((a, b) => b.score - a.score);
  const jobs = ranked.slice(0, topK).map(({ job, score }) => ({
    jobId: job.jobId,
    title: job.title,
    company: job.company,
    location: job.location,
    tags: job.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    description: job.description,
    url: job.url,
    source: job.source,
    score,
  }));

  return { jobs, filters, where, usedFallback };
}
