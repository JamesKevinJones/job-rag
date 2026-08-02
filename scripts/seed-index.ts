/**
 * Seed the portable JSON index from live scrapes without embeddings.
 * Useful when OPENAI_API_KEY is not set yet; chat can still keyword-rank.
 * Run `npm run ingest` later to attach OpenAI embeddings.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scrapeAllJobs } from "../src/lib/scraper";
import { toStoreRow } from "../src/lib/rag/chunk";

async function main() {
  console.log("Scraping jobs for seed index (no embeddings)…");
  const jobs = await scrapeAllJobs({
    remoteOkLimit: 40,
    remotiveLimit: 40,
    htmlLimit: 30,
  });
  const now = Date.now();
  const rows = jobs.map((job) => toStoreRow(job, [], now));
  const out = {
    version: 1 as const,
    updatedAt: now,
    jobs: rows,
  };
  const file = path.join(process.cwd(), "data", "jobs-index.json");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(out), "utf8");
  console.log(`Wrote ${rows.length} jobs to ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
