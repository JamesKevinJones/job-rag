import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredJob } from "@/lib/rag/store";

const loadAllJobs = vi.fn<() => Promise<StoredJob[]>>();
const embedQuery = vi.fn<(text: string) => Promise<number[]>>();

vi.mock("@/lib/rag/store", () => ({ loadAllJobs: () => loadAllJobs() }));
vi.mock("@/lib/rag/embeddings", () => ({
  embedQuery: (text: string) => embedQuery(text),
}));

const { describeFilters, extractFilters, hybridRetrieve, matchesFilters } =
  await import("@/lib/rag/retrieve");

function job(overrides: Partial<StoredJob>): StoredJob {
  return {
    jobId: "id",
    title: "Engineer",
    company: "Acme",
    location: "Remote",
    tags: "",
    description: "",
    url: "https://example.com/job",
    source: "remoteok",
    scrapedAt: 0,
    lastSeen: 0,
    text: "",
    vector: [],
    ...overrides,
  };
}

beforeEach(() => {
  loadAllJobs.mockReset();
  embedQuery.mockReset();
});

describe("extractFilters", () => {
  it("pulls tags, location and a remote-only flag out of plain language", () => {
    const f = extractFilters("Senior Python backend jobs in Europe, remote please");
    expect(f.tags).toEqual(expect.arrayContaining(["python", "backend", "senior"]));
    expect(f.locationHints).toEqual(["europe"]);
    expect(f.remoteOnly).toBe(true);
  });

  it("maps named boards to their source ids, WWR to the HTML scraper", () => {
    expect(extractFilters("anything on remotive or wwr").sources).toEqual([
      "remotive",
      "html",
    ]);
  });

  it("does not read 'remotely' as a remote-only request", () => {
    expect(extractFilters("roles loosely related to data, remotely possible").remoteOnly)
      .toBe(false);
  });
});

describe("matchesFilters", () => {
  const remoteReact = job({ title: "React developer", tags: "react,typescript" });

  it("keeps a job whose tags or text mention a requested tag", () => {
    expect(matchesFilters(remoteReact, extractFilters("react roles"))).toBe(true);
    expect(matchesFilters(remoteReact, extractFilters("rust roles"))).toBe(false);
  });

  it("treats an empty location as remote but rejects an on-site city", () => {
    const filters = extractFilters("remote react");
    expect(matchesFilters(job({ ...remoteReact, location: "" }), filters)).toBe(true);
    expect(matchesFilters(job({ ...remoteReact, location: "Berlin office" }), filters))
      .toBe(false);
  });

  it("enforces a requested source", () => {
    const filters = extractFilters("react on remotive");
    expect(matchesFilters(remoteReact, filters)).toBe(false);
    expect(matchesFilters({ ...remoteReact, source: "remotive" }, filters)).toBe(true);
  });
});

describe("describeFilters", () => {
  it("is null when the query has no structure to filter on", () => {
    expect(describeFilters(extractFilters("hello"))).toBeNull();
  });
});

describe("hybridRetrieve", () => {
  it("ranks by cosine similarity when the index carries vectors", async () => {
    loadAllJobs.mockResolvedValue([
      job({ jobId: "far", vector: [0, 1] }),
      job({ jobId: "near", vector: [1, 0.1] }),
    ]);
    embedQuery.mockResolvedValue([1, 0]);

    const { jobs, usedFallback } = await hybridRetrieve("anything", 2);

    expect(jobs.map((j) => j.jobId)).toEqual(["near", "far"]);
    expect(jobs[0]!.score).toBeGreaterThan(jobs[1]!.score);
    expect(usedFallback).toBe(false);
  });

  it("falls back to keyword scoring, without embedding, for an unembedded index", async () => {
    loadAllJobs.mockResolvedValue([
      job({ jobId: "go", title: "Go engineer", description: "kubernetes" }),
      job({ jobId: "k8s", title: "Platform engineer", description: "kubernetes terraform" }),
    ]);

    const { jobs } = await hybridRetrieve("kubernetes terraform", 2);

    expect(embedQuery).not.toHaveBeenCalled();
    expect(jobs[0]!.jobId).toBe("k8s");
  });

  it("widens to the whole index, and says so, when the filters match nothing", async () => {
    loadAllJobs.mockResolvedValue([job({ jobId: "only", title: "Designer" })]);

    const { jobs, usedFallback } = await hybridRetrieve("rust jobs", 6);

    expect(usedFallback).toBe(true);
    expect(jobs.map((j) => j.jobId)).toEqual(["only"]);
  });

  it("returns nothing, rather than throwing, for an empty index", async () => {
    loadAllJobs.mockResolvedValue([]);
    const { jobs } = await hybridRetrieve("react", 6);
    expect(jobs).toEqual([]);
    expect(embedQuery).not.toHaveBeenCalled();
  });
});
