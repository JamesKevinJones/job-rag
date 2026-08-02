import { NextResponse } from "next/server";
import { listJobs } from "@/lib/rag/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const jobs = await listJobs(200);
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      {
        jobs: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
