"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isTextUIPart,
  type UIMessage,
} from "ai";
import { useMemo, useState, type FormEvent } from "react";
import { JobCard } from "@/components/JobCard";
import type { ShowJobsInput } from "@/lib/rag/tools";

type IndexStats = {
  count: number;
  newestLastSeen: number | null;
  ingestHint?: string;
};

export function ChatPanel({ initialStats }: { initialStats: IndexStats }) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => {
      // #region agent log
      fetch('http://127.0.0.1:7447/ingest/e326b82c-57dc-4752-9d3a-65f6f21a8811',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1748e9'},body:JSON.stringify({sessionId:'1748e9',runId:'pre-fix',hypothesisId:'C',location:'ChatPanel.tsx:useChat:onError',message:'client chat error',data:{errorMessage:err?.message??String(err)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    },
  });

  const busy = status === "submitted" || status === "streaming";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-8 pt-6 sm:px-6">
      <header className="mb-8 animate-fade-up">
        <p className="font-display text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
          JobMatch RAG
        </p>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
          Ask in plain language. We retrieve scraped remote roles and stream
          structured matches — not endless board scrolling.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <span className="rounded-md border border-[var(--line)] bg-white/40 px-2.5 py-1 backdrop-blur">
            {initialStats.count} indexed jobs
          </span>
          <a href="/jobs" className="underline-offset-4 hover:underline">
            Browse index
          </a>
          <span className="text-[var(--line)]">·</span>
          <span>Refresh corpus: `npm run ingest`</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="animate-fade-up grid gap-2 sm:grid-cols-2">
            {[
              "Remote React roles that mention TypeScript",
              "Senior Python backend jobs in Europe",
              "Entry-level data jobs that are fully remote",
              "DevOps openings that list Kubernetes",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-lg border border-[var(--line)] bg-white/50 px-3 py-3 text-left text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:bg-white/80"
                onClick={() => sendMessage({ text: suggestion })}
                disabled={busy}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error.message}
          </p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 mt-auto border-t border-[var(--line)] bg-[var(--bg-elevated)]/90 pt-4 backdrop-blur"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What kind of role are you hunting?"
            className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white/80 px-3 py-3 text-[var(--ink)] outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--cream)] disabled:opacity-50"
          >
            {busy ? "…" : "Ask"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`animate-fade-up ${isUser ? "ml-auto max-w-[85%]" : "mr-auto w-full max-w-3xl"}`}
    >
      <div
        className={
          isUser
            ? "rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm text-[var(--cream)]"
            : "space-y-3"
        }
      >
        {message.parts.map((part, index) => {
          if (isTextUIPart(part) && part.text.trim()) {
            return (
              <p
                key={`${message.id}-text-${index}`}
                className={
                  isUser
                    ? "whitespace-pre-wrap"
                    : "whitespace-pre-wrap text-[var(--ink-soft)]"
                }
              >
                {part.text}
              </p>
            );
          }

          if (part.type === "tool-show_jobs") {
            const jobs =
              part.state === "output-available"
                ? (part.output as ShowJobsInput).jobs
                : part.state === "input-available" ||
                    part.state === "input-streaming"
                  ? ((part.input as Partial<ShowJobsInput> | undefined)?.jobs ??
                    [])
                  : [];

            if (!jobs.length) {
              return (
                <p
                  key={`${message.id}-tool-${index}`}
                  className="text-sm text-[var(--muted)]"
                >
                  Gathering matching roles…
                </p>
              );
            }

            return (
              <div
                key={`${message.id}-tool-${index}`}
                className="grid gap-3 sm:grid-cols-1"
              >
                {jobs.map((job) =>
                  job?.id && job.title && job.company && job.url ? (
                    <JobCard
                      key={job.id}
                      id={job.id}
                      title={job.title}
                      company={job.company}
                      location={job.location || "Remote"}
                      tags={job.tags || []}
                      url={job.url}
                      reason={job.reason || "Matched your query."}
                    />
                  ) : null,
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
