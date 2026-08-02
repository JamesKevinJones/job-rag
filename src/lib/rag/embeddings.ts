import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const MODEL = openai.embedding("text-embedding-3-small");

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const batchSize = 64;
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
  const { embedding } = await embed({
    model: MODEL,
    value: text,
  });
  return embedding;
}
