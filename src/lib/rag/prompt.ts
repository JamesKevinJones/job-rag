import type { RetrievedJob } from "@/lib/rag/retrieve";

export function buildSystemPrompt(options: {
  jobs: RetrievedJob[];
  usedFallback: boolean;
  where: string | null;
}): string {
  const context = options.jobs
    .map(
      (job, i) =>
        `[${i + 1}] id=${job.jobId}
title=${job.title}
company=${job.company}
location=${job.location}
tags=${job.tags.join(", ")}
url=${job.url}
source=${job.source}
snippet=${job.description.slice(0, 900)}`,
    )
    .join("\n\n");

  return `You are JobMatch RAG, a concise career assistant that recommends jobs only from the indexed corpus below.

Rules:
- Use ONLY the jobs in CONTEXT. If none fit, say so clearly.
- Prefer calling the show_jobs tool with the best matching jobs (include id, title, company, location, tags, url, and a short reason).
- Do not invent jobs, salaries, or URLs.
- Keep prose short; JobCards carry the structured details.
- When CONTEXT is empty, explain that the user should run npm run ingest.

Retrieval notes:
- metadata filter applied: ${options.where ?? "none"}
- fell back to unfiltered vector search: ${options.usedFallback ? "yes" : "no"}

CONTEXT:
${context || "(no jobs retrieved)"}`;
}
