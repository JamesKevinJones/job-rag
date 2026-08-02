import Link from "next/link";
import { listJobs } from "@/lib/rag/store";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  let jobs: Awaited<ReturnType<typeof listJobs>> = [];
  let error: string | null = null;

  try {
    jobs = await listJobs(200);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load jobs";
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-3xl text-[var(--ink)]">Indexed jobs</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {jobs.length} roles currently in LanceDB
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-[var(--ink-soft)] underline-offset-4 hover:underline"
        >
          Back to chat
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {!error && jobs.length === 0 && (
        <p className="text-[var(--ink-soft)]">
          No jobs yet. Run <code className="text-[var(--ink)]">npm run ingest</code>{" "}
          to scrape and index.
        </p>
      )}

      <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {jobs.map((job) => (
          <li key={job.jobId} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--ink)] hover:underline"
              >
                {job.title}
              </a>
              <p className="text-sm text-[var(--muted)]">
                {job.company} · {job.location} · {job.source}
              </p>
              {job.tags && (
                <p className="mt-1 text-xs text-[var(--muted)]">{job.tags}</p>
              )}
            </div>
            <p className="shrink-0 text-xs text-[var(--muted)]">
              lastSeen {new Date(job.lastSeen).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
