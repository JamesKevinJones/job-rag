import { scrapeAllJobs } from "../src/lib/scraper";
import {
  getIndexStats,
  pruneStaleJobs,
  upsertJobs,
} from "../src/lib/rag/store";

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Copy .env.local.example to .env.local.",
    );
    process.exit(1);
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }

  console.log("Scraping RemoteOK, Remotive, and HTML listings…");
  const jobs = await scrapeAllJobs();
  console.log(`Normalized ${jobs.length} unique jobs.`);

  console.log("Embedding + upserting into jobs-index.json…");
  const { upserted } = await upsertJobs(jobs);
  console.log(`Upserted ${upserted} jobs (lastSeen refreshed).`);

  console.log("Pruning jobs with lastSeen older than 48 hours…");
  const pruned = await pruneStaleJobs();
  console.log(`Pruned ${pruned} stale rows.`);

  const stats = await getIndexStats();
  console.log(`Index ready: ${stats.count} jobs at ${stats.dbPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
