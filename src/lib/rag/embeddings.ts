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

  const batchSize = 32;
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { embeddings } = await embedMany({
      model: MODEL,
      values: batch,
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
