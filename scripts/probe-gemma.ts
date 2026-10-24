// Phase 0 throwaway: send one image to the configured Gemma model and print the raw reply.
// Reads GEMINI_API_KEY and GEMMA_MODEL from .env.local, the same way `next dev` does.
// Usage: npm run probe -- path/to/image.png
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";

async function main() {
  loadEnvConfig(process.cwd());
  const [, , imagePath] = process.argv;
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMMA_MODEL;
  if (!apiKey || !model || !imagePath) {
    console.error("Need GEMINI_API_KEY and GEMMA_MODEL in .env.local, and an image path.");
    process.exit(1);
  }

  const mimeType = extname(imagePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
  console.log(`Model: ${model}`);
  const ai = new GoogleGenAI({ apiKey });
  try {
    const res = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: readFileSync(imagePath).toString("base64") } },
            { text: "What kind of document is this? Reply in one sentence." },
          ],
        },
      ],
    });
    console.log(res.text);
  } catch (e) {
    console.error("Model call failed:\n", e instanceof Error ? e.message : e);
    if (/not found|404/i.test(String(e))) {
      const pager = await ai.models.list();
      const gemma: string[] = [];
      for await (const m of pager) if (m.name?.includes("gemma")) gemma.push(m.name.replace(/^models\//, ""));
      console.error("\nGemma models available to this key:\n  " + (gemma.join("\n  ") || "(none)"));
    }
    process.exit(1);
  }
}

main();
