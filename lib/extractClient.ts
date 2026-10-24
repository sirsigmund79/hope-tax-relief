import type { ExtractResult } from "./schema";
import { prepareImage } from "./image";

/** Upload a photo to /api/extract. Never throws; failures come back as ok:false. */
export async function extractFile(file: File): Promise<ExtractResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const { base64, mimeType } = await prepareImage(file);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mimeType, filename: file.name }),
      signal: controller.signal,
    });
    return (await res.json()) as ExtractResult;
  } catch {
    return { ok: false, reason: "Could not reach the document reader", partial: {} };
  } finally {
    clearTimeout(timer);
  }
}
