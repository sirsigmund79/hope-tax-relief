# HOPE Check

A mobile-friendly web app that helps Detroit homeowners see whether they likely qualify for the
**HOPE** (Homeowners Property Exemption) property tax exemption, from a few photos.

1. Enter household size, address, savings, and your tax bill (or scan the bill).
2. Photograph each adult's income document (W-2, SSA-1099, paystub).
3. Gemma 4 reads each photo and returns structured JSON. **The model only extracts; it never decides.**
4. A deterministic, unit-tested rules engine (`lib/hope.ts`) computes the exemption tier.
5. Requirements, income limits and estimated savings are shown up front; a packet tracker fills in as documents are added.
6. Results: tier (or what blocks it), before → after tax bill, flags, and a visual, printable packet with a pre-filled draft HOPE application.

> Thresholds in `lib/config.ts` are **illustrative** (`THRESHOLDS_VERIFIED = false`). Verify against current
> City of Detroit HOPE guidelines before relying on them. This tool gives an estimate, not a decision.

## Run it

```bash
npm install
cp .env.example .env.local   # set MOCK_LLM=1 to run fully offline
npm run dev                  # http://localhost:3000
```

| Env var | Meaning |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMMA_MODEL` | Exact Gemma 4 model id from AI Studio |
| `MOCK_LLM` | `1` = return fixture JSON (picked by filename: `ssa`, `bill`, `crop`, `pay`, else W-2), no network |

Check the model connection: `npm run probe -- public/samples/w2-john-doe.png`

## Demo

Synthetic documents live at `/samples`, with ready-made screenshots in `public/samples/`.
Household of 2, $3,000 savings, $2,100 bill, $4,800 delinquent →
upload `ssa-1099-jane-doe.png` for Jane, nothing for John →
**100% exemption, $2,100 → $0**, Form 4988 flag for John, DTRF card, packet checklist.
Upload `w2-cropped-john-doe.png` to show the "cut off, retake" path.

## Reliability

- Image downsized client-side (1600px, JPEG 0.85) before upload.
- Model reply parsed defensively (fences/prose stripped), validated with zod, one retry on bad JSON, 20s timeout.
- Any failure falls back to manual entry, pre-filled with whatever fields did validate. The user can always type the income.
- SSN-like patterns are masked in everything returned from the model. Images and extracted data are never logged or stored.

## Scripts

`npm run typecheck` · `npm test` · `npm run build`

See `NOTES.md` for shortcuts taken and known gaps.
