// Phase 0 throwaway: send one image to the configured Gemma model and print the raw reply.
// Usage: GEMINI_API_KEY=... GEMMA_MODEL=... npm run probe -- path/to/image.jpg
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const [, , imagePath] = process.argv;
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMMA_MODEL;
if (!apiKey || !model || !imagePath) {
  console.error("Need GEMINI_API_KEY, GEMMA_MODEL and an image path.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const res = await ai.models.generateContent({
  model,
  contents: [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: readFileSync(imagePath).toString("base64") } },
        { text: "What kind of document is this? Reply in one sentence." },
      ],
    },
  ],
});
console.log(res.text);
