import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { google } from "@ai-sdk/google";
import { buildSystemPrompt } from "@/lib/rag/prompt";
import { hybridRetrieve } from "@/lib/rag/retrieve";
import { chatTools } from "@/lib/rag/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

function hasGeminiKey(): boolean {
  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
  );
}

export async function POST(req: Request) {
  // #region agent log
  fetch("http://127.0.0.1:7447/ingest/e326b82c-57dc-4752-9d3a-65f6f21a8811", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "1748e9",
    },
    body: JSON.stringify({
      sessionId: "1748e9",
      runId: "post-fix",
      hypothesisId: "A",
      location: "api/chat/route.ts:POST:entry",
      message: "chat POST entered",
      data: {
        hasGeminiKey: hasGeminiKey(),
        keyLength:
          (process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
            process.env.GEMINI_API_KEY ||
            "").length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    // Allow GEMINI_API_KEY alias
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
    }

    const body = (await req.json()) as { messages: UIMessage[] };
    const messages = body.messages ?? [];

    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    const query =
      lastUser?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n")
        .trim() || "";

    // #region agent log
    fetch("http://127.0.0.1:7447/ingest/e326b82c-57dc-4752-9d3a-65f6f21a8811", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "1748e9",
      },
      body: JSON.stringify({
        sessionId: "1748e9",
        runId: "post-fix",
        hypothesisId: "C",
        location: "api/chat/route.ts:POST:parsed",
        message: "parsed chat request",
        data: {
          messageCount: messages.length,
          queryLen: query.length,
          lastRole: lastUser?.role ?? null,
          partTypes: (lastUser?.parts ?? []).map((p) => p.type),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!hasGeminiKey()) {
      // #region agent log
      fetch("http://127.0.0.1:7447/ingest/e326b82c-57dc-4752-9d3a-65f6f21a8811", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "1748e9",
        },
        body: JSON.stringify({
          sessionId: "1748e9",
          runId: "post-fix",
          hypothesisId: "A",
          location: "api/chat/route.ts:POST:missing-key",
          message: "Gemini API key missing — aborting before model call",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return Response.json(
        {
          error:
            "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Add your Gemini key in Vercel env vars or .env.local.",
        },
        { status: 500 },
      );
    }

    const retrieved = query
      ? await hybridRetrieve(query, 6)
      : { jobs: [], where: null, usedFallback: false };

    // #region agent log
    fetch("http://127.0.0.1:7447/ingest/e326b82c-57dc-4752-9d3a-65f6f21a8811", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "1748e9",
      },
      body: JSON.stringify({
        sessionId: "1748e9",
        runId: "post-fix",
        hypothesisId: "B",
        location: "api/chat/route.ts:POST:retrieved",
        message: "hybrid retrieve finished",
        data: {
          jobCount: retrieved.jobs.length,
          where: retrieved.where,
          usedFallback: retrieved.usedFallback,
          topIds: retrieved.jobs.slice(0, 3).map((j) => j.jobId),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const result = streamText({
      model: google("gemini-flash-latest"),
      system: buildSystemPrompt({
        jobs: retrieved.jobs,
        where: retrieved.where,
        usedFallback: retrieved.usedFallback,
      }),
      messages: await convertToModelMessages(messages),
      tools: chatTools,
      stopWhen: isStepCount(3),
      onError: ({ error }) => {
        // #region agent log
        fetch("http://127.0.0.1:7447/ingest/e326b82c-57dc-4752-9d3a-65f6f21a8811", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "1748e9",
          },
          body: JSON.stringify({
            sessionId: "1748e9",
            runId: "post-fix",
            hypothesisId: "D",
            location: "api/chat/route.ts:streamText:onError",
            message: "streamText error",
            data: {
              errorName: error instanceof Error ? error.name : "unknown",
              errorMessage:
                error instanceof Error ? error.message : String(error),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      },
    });

    // #region agent log
    fetch("http://127.0.0.1:7447/ingest/e326b82c-57dc-4752-9d3a-65f6f21a8811", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "1748e9",
      },
      body: JSON.stringify({
        sessionId: "1748e9",
        runId: "post-fix",
        hypothesisId: "A",
        location: "api/chat/route.ts:POST:streaming",
        message: "streamText started successfully",
        data: { model: "gemini-flash-latest" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return result.toUIMessageStreamResponse();
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7447/ingest/e326b82c-57dc-4752-9d3a-65f6f21a8811", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "1748e9",
      },
      body: JSON.stringify({
        sessionId: "1748e9",
        runId: "post-fix",
        hypothesisId: "E",
        location: "api/chat/route.ts:POST:catch",
        message: "chat route threw",
        data: {
          errorName: error instanceof Error ? error.name : "unknown",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Chat failed",
      },
      { status: 500 },
    );
  }
}
