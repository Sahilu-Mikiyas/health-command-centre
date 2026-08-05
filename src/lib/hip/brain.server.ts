import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import type { BriefInputValue, BriefResult } from "./brain-schema";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  const wrapped: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
      headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
    }
    const response = await fetch(input, { ...init, headers });
    runId = response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || runId;
    return response;
  };
  return wrapped;
}

const SYSTEM_PROMPT = `You are the Hospital Brain for a Hospital Intelligence Platform.
You read a live operational snapshot of one hospital and speak to executives and clinical leads.
Rules:
- Be concrete and quantitative; cite the numbers you were given, never invent new ones.
- Lead with operational status in one short sentence, then at most three issues that need attention.
- For each issue name the department, the evidence, and one recommended action.
- Never give individual patient diagnoses or treatment advice.
- Plain prose and short lines. No markdown headings, no bullet characters, no emojis.
Keep the whole reply under 130 words.`;

/**
 * Streams the gateway call server-side and returns the finished text, so a long
 * reasoning run never sits behind a silent buffered request.
 */
export async function runHospitalBrain(data: BriefInputValue): Promise<BriefResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { text: "", error: "AI is not configured for this hospital yet." };
  }

  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: createRunIdFetch(),
  });

  const prompt = data.question
    ? `Live snapshot:\n${data.snapshot}\n\nExecutive question: ${data.question}\nAnswer it using the snapshot, then state a confidence percentage.`
    : `Live snapshot:\n${data.snapshot}\n\nWrite the current hospital status brief.`;

  try {
    const result = streamText({
      model: lovable.responses("openai/gpt-5.6-sol"),
      system: SYSTEM_PROMPT,
      prompt,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
        },
      },
    });

    const text = await result.text;
    if (!text.trim()) {
      return { text: "", error: "The model returned no summary. Try again." };
    }
    return { text, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI gateway error";
    console.error("hospitalBrain failed", message);
    if (message.includes("429")) {
      return { text: "", error: "AI is rate limited right now. Try again shortly." };
    }
    if (message.includes("402")) {
      return { text: "", error: "AI credits are exhausted for this workspace." };
    }
    return { text: "", error: "The intelligence layer could not be reached." };
  }
}
