import { z } from "zod";

export const BriefInput = z.object({
  snapshot: z.string().min(1).max(6000),
  question: z.string().max(500).nullable(),
});

export type BriefInputValue = z.infer<typeof BriefInput>;
export type BriefResult = { text: string; error: string | null };
