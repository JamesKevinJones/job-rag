import { NextResponse } from "next/server";
import { getIndexStats, pruneStaleJobs, upsertJobs } from "@/lib/rag/store";
import { scrapeAllJobs } from "@/lib/scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET — index stats.
 * POST — optional protected mini-ingest (set INGEST_SECRET).
 * Prefer `npm run ingest` locally for full corpus refresh.
 */
export async function GET() {
  try {
    const stats = await getIndexStats();
    return NextResponse.json({
      ok: true,
      ...stats,
      ingestHint:
        "Run `npm run ingest` locally, or POST /api/ingest with Bearer INGEST_SECRET.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Bulk ingest via API is disabled. Set INGEST_SECRET or use `npm run ingest`.",
      },
      { status: 405 },
    );
  }

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const jobs = await scrapeAllJobs({
      remoteOkLimit: 25,
      remotiveLimit: 25,
      htmlLimit: 15,
    });
    const { upserted } = await upsertJobs(jobs);
    const pruned = await pruneStaleJobs();
    const stats = await getIndexStats();
    return NextResponse.json({
      ok: true,
      upserted,
      pruned,
      ...stats,
      note: "Serverless filesystem is ephemeral on Vercel — prefer CLI ingest + commit for durable index updates.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Ingest failed",
      },
      { status: 500 },
    );
  }
}
