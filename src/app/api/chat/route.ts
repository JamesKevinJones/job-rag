import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "@/lib/rag/prompt";
import { hybridRetrieve } from "@/lib/rag/retrieve";
import { chatTools } from "@/lib/rag/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as { messages: UIMessage[] };
  const messages = body.messages ?? [];

  const lastUser = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  const query =
    lastUser?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim() || "";

  const { jobs, where, usedFallback } = query
    ? await hybridRetrieve(query, 6)
    : { jobs: [], where: null, usedFallback: false };

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildSystemPrompt({ jobs, where, usedFallback }),
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    stopWhen: isStepCount(3),
  });

  return result.toUIMessageStreamResponse();
}
