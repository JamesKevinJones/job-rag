import { z } from "zod";
import { tool } from "ai";

export const showJobsInputSchema = z.object({
  jobs: z
    .array(
      z.object({
        id: z.string().describe("Exact jobId from context"),
        title: z.string(),
        company: z.string(),
        location: z.string(),
        tags: z.array(z.string()).default([]),
        url: z.string().url(),
        reason: z
          .string()
          .describe("One short sentence on why this role matches"),
      }),
    )
    .min(1)
    .max(6),
});

export type ShowJobsInput = z.infer<typeof showJobsInputSchema>;

export const chatTools = {
  show_jobs: tool({
    description:
      "Present matching job openings as structured JobCards in the UI. Call this whenever you recommend specific roles.",
    inputSchema: showJobsInputSchema,
    execute: async (input) => input,
  }),
};
