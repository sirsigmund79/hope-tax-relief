import { GoogleGenAI } from "@google/genai";
import { Extraction, type ExtractResult } from "./schema";
import { fixtureFor } from "./fixtures";
import { maskDeep, maskSsn } from "./mask";

export const PROMPT = `You are reading a photo of a US financial document for a property tax exemption application.
Return ONLY a JSON object, no prose, no markdown, with exactly these keys:
docType ("W2" | "SSA_1099" | "PAYSTUB" | "TAX_BILL" | "OTHER"), personName, annualIncome,
taxYear, employerName, parcelNumber, taxBillAmount, delinquentAmount, preExemptionPercent, confidence ("high"|"medium"|"low"), issues (array of strings).
Rules:
- W2: annualIncome = Box 1 wages. SSA_1099: annualIncome = Box 5 net benefits. PAYSTUB: annualize gross pay using YTD and pay date if possible, else null.
- W2 and PAYSTUB: employerName = the employer's name.
- TAX_BILL: fill taxBillAmount (total due this bill), delinquentAmount if shown, preExemptionPercent (PRE %) if shown, parcelNumber (as printed).
- Use null for anything not clearly visible. Never guess numbers.
- Numbers as plain numbers (no $ or commas).
- In issues, note anything that makes the photo hard to read (cut off, blurry, glare, wrong document).
- Never include Social Security numbers in any field.`;

export const RETRY_PROMPT =
  "Your last reply was not valid JSON matching the schema. Reply with JSON only.";

export const TIMEOUT_MS = 20_000;

type ParseOk = { ok: true; data: Extraction };
type ParseFail = { ok: false; reason: string; partial: Partial<Extraction> };

/** Pull the JSON object out of a model reply and validate it. */
export function parseExtraction(text: string): ParseOk | ParseFail {
  const stripped = text.replace(/```(?:json)?/gi, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return { ok: false, reason: "No JSON object in model reply", partial: {} };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return { ok: false, reason: "Model reply was not valid JSON", partial: {} };
  }
  const parsed = Extraction.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    reason: "Model reply did not match the schema",
    partial: salvage(raw),
  };
}

/** Keep whichever fields individually validate, for pre-filling manual entry. */
function salvage(raw: unknown): Partial<Extraction> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(Extraction.shape)) {
    const value = (raw as Record<string, unknown>)[key];
    if (value !== undefined && field.safeParse(value).success) out[key] = value;
  }
  return out as Partial<Extraction>;
}

type Turn = { role: "user" | "model"; parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] };
export type Generate = (contents: Turn[]) => Promise<string>;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/** One call, one retry on bad output. Never throws. */
export async function extractWithModel(
  generate: Generate,
  image: { base64: string; mimeType: string },
  timeoutMs = TIMEOUT_MS,
): Promise<ExtractResult> {
  const first: Turn = {
    role: "user",
    parts: [{ inlineData: { mimeType: image.mimeType, data: image.base64 } }, { text: PROMPT }],
  };
  try {
    return await withTimeout(
      (async (): Promise<ExtractResult> => {
        const reply1 = await generate([first]);
        const r1 = parseExtraction(reply1);
        if (r1.ok) return { ok: true, data: maskDeep(r1.data) };

        const reply2 = await generate([
          first,
          { role: "model", parts: [{ text: reply1 }] },
          { role: "user", parts: [{ text: RETRY_PROMPT }] },
        ]);
        const r2 = parseExtraction(reply2);
        if (r2.ok) return { ok: true, data: maskDeep(r2.data) };
        const partial = Object.keys(r2.partial).length ? r2.partial : r1.partial;
        return { ok: false, reason: r2.reason, partial: maskDeep(partial) };
      })(),
      timeoutMs,
    );
  } catch (e) {
    if (e instanceof Error && e.message === "timeout") {
      return { ok: false, reason: "The document reader took too long", partial: {} };
    }
    // Log the API error (status, message) only. Never the image or extracted data.
    const detail = maskSsn(String(e instanceof Error ? e.message : e)).slice(0, 300);
    console.error("[extract] model call failed:", detail);
    const reason = process.env.NODE_ENV === "production"
      ? "The document reader is unavailable"
      : `The document reader is unavailable (${detail})`;
    return { ok: false, reason, partial: {} };
  }
}

export function isMock(): boolean {
  return process.env.MOCK_LLM === "1";
}

/** Entry point used by the API route. */
export async function extractDocument(image: {
  base64: string;
  mimeType: string;
  filename?: string;
}): Promise<ExtractResult> {
  if (isMock()) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, data: fixtureFor(image.filename), mock: true };
  }
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMMA_MODEL;
  if (!apiKey || !model) {
    return { ok: false, reason: "Document reader is not configured", partial: {} };
  }
  const ai = new GoogleGenAI({ apiKey });
  const generate: Generate = async (contents) => {
    const res = await ai.models.generateContent({ model, contents });
    return res.text ?? "";
  };
  return extractWithModel(generate, image);
}
