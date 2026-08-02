import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getIndexStats, pruneStaleJobs, upsertJobs } from "@/lib/rag/store";
import { scrapeAllJobs } from "@/lib/scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorizeIngest(req: Request, secret: string): boolean {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * GET — index stats (no secrets).
 * POST — protected mini-ingest (requires INGEST_SECRET).
 */
export async function GET() {
  try {
    const stats = await getIndexStats();
    return NextResponse.json({
      ok: true,
      count: stats.count,
      newestLastSeen: stats.newestLastSeen,
      oldestLastSeen: stats.oldestLastSeen,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to read index stats" },
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
        error: "Bulk ingest via API is disabled.",
      },
      { status: 405 },
    );
  }

  if (!authorizeIngest(req, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Server is missing required configuration" },
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
      count: stats.count,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ingest failed" },
      { status: 500 },
    );
  }
}
