import { NextResponse } from "next/server";
import { extractDocument } from "@/lib/gemma";
import { ExtractRequest, type ExtractResult } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const parsed = ExtractRequest.safeParse(body);
  if (!parsed.success) {
    const result: ExtractResult = { ok: false, reason: "Could not read the uploaded image", partial: {} };
    return NextResponse.json(result, { status: 400 });
  }
  const { imageBase64, mimeType, filename } = parsed.data;
  const result = await extractDocument({ base64: imageBase64, mimeType, filename });
  // Deliberately no logging of the image or extracted fields.
  return NextResponse.json(result);
}
