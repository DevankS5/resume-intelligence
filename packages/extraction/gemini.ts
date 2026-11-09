// Gemini adapter (ADR-009). The model has no tools: it can only return JSON.
// Server-only: the key must never reach a browser bundle.
import { GoogleGenAI } from "@google/genai";
import { PipelineError } from "@domain/errors";
import { extractionJsonSchema } from "@schemas/extraction";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export interface ExtractionProvider {
  provider: string;
  model: string;
  extract(resumeText: string): Promise<unknown>;
}

const TIMEOUT_MS = 90_000;

export function geminiProvider(
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || "gemini-2.5-flash",
): ExtractionProvider {
  if (!apiKey) throw new PipelineError("CONFIGURATION_ERROR", "GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });
  const schema = extractionJsonSchema();

  return {
    provider: "google-gemini",
    model,
    async extract(resumeText) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const call = ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: buildUserPrompt(resumeText) }] }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
            temperature: 0,
          },
        });
        const timeout = new Promise<never>((_, rej) => {
          timer = setTimeout(() => rej(new PipelineError("MODEL_TIMEOUT")), TIMEOUT_MS);
        });
        const res = await Promise.race([call, timeout]);
        const text = res.text;
        if (!text) throw new PipelineError("INVALID_MODEL_OUTPUT", "Empty response");
        try {
          return JSON.parse(text);
        } catch {
          throw new PipelineError("INVALID_MODEL_OUTPUT", "Response was not JSON");
        }
      } catch (e) {
        if (e instanceof PipelineError) throw e;
        const msg = String((e as Error)?.message ?? e);
        if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) throw new PipelineError("MODEL_RATE_LIMIT", msg.slice(0, 200));
        if (/timeout|ETIMEDOUT|DEADLINE/i.test(msg)) throw new PipelineError("MODEL_TIMEOUT", msg.slice(0, 200));
        throw new PipelineError("MODEL_PROVIDER_ERROR", msg.slice(0, 200));
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
