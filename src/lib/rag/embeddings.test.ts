import { beforeEach, describe, expect, it, vi } from "vitest";

type EmbedManyArgs = { values: string[]; maxRetries?: number };
const embedMany = vi.fn(async ({ values }: EmbedManyArgs) => ({
  embeddings: values.map((v) => [v.length]),
}));

vi.mock("ai", () => ({ embedMany: (args: EmbedManyArgs) => embedMany(args), embed: vi.fn() }));
vi.mock("@ai-sdk/google", () => ({ google: { embedding: () => "model" } }));

const { embedTexts } = await import("@/lib/rag/embeddings");

beforeEach(() => {
  embedMany.mockClear();
});

describe("embedTexts", () => {
  // 32 long job documents in one request is ~32k tokens, over the free tier's
  // per-minute embedding budget on its own, so `npm run ingest` failed with 429.
  it("sends small batches, so one request fits the free tier's per-minute budget", async () => {
    const texts = Array.from({ length: 20 }, (_, i) => `doc ${i}`);

    const vectors = await embedTexts(texts);

    for (const [args] of embedMany.mock.calls) {
      expect(args.values.length).toBeLessThanOrEqual(8);
    }
    expect(vectors).toEqual(texts.map((t) => [t.length]));
  });

  it("retries long enough for a one-minute quota window to reset", async () => {
    await embedTexts(["doc"]);
    // Backoff starts at 2 s and doubles: 6 retries wait ~126 s in total.
    expect(embedMany.mock.calls[0]![0].maxRetries).toBeGreaterThanOrEqual(6);
  });
});
