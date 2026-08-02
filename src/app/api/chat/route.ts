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

function ensureGeminiEnv() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }
}

export async function POST(req: Request) {
  try {
    ensureGeminiEnv();

    const body = (await req.json()) as { messages: UIMessage[] };
    const messages = body.messages ?? [];

    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    const query =
      lastUser?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n")
        .trim() || "";

    if (!hasGeminiKey()) {
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
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("chat route failed", error instanceof Error ? error.name : "unknown");
    return Response.json(
      {
        error: "Chat failed. Check server configuration and try again.",
      },
      { status: 500 },
    );
  }
}
