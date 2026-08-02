import type { ShowJobsInput } from "@/lib/rag/tools";

type JobCardProps = ShowJobsInput["jobs"][number];

export function JobCard(props: JobCardProps) {
  return (
    <article className="job-card group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg leading-tight text-[var(--ink)]">
            {props.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {props.company}
            <span className="mx-1.5 text-[var(--line)]">·</span>
            {props.location}
          </p>
        </div>
        <a
          href={props.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-ink)] transition group-hover:translate-y-[-1px]"
        >
          View role
        </a>
      </div>
      {props.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {props.tags.slice(0, 6).map((tag) => (
            <li
              key={tag}
              className="rounded border border-[var(--line)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--muted)]"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
        {props.reason}
      </p>
    </article>
  );
}
