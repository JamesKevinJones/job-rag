import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

const MODEL = google.embedding("gemini-embedding-001");

function ensureGeminiEnv() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  ensureGeminiEnv();
  if (texts.length === 0) return [];

  // Free tier: 32 long job documents in one request blew the per-minute token
  // budget by themselves (429 on every attempt). Eight fit, and six retries
  // back off ~126 s in total, long enough for a one-minute window to reset.
  const batchSize = 8;
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { embeddings } = await embedMany({
      model: MODEL,
      values: batch,
      maxRetries: 6,
    });
    vectors.push(...embeddings);
  }

  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  ensureGeminiEnv();
  const { embedding } = await embed({
    model: MODEL,
    value: text,
  });
  return embedding;
}
