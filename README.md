# HOPE Check

A mobile-friendly web app that helps Detroit homeowners see whether they likely qualify for the
**HOPE** (Homeowners Property Exemption) property tax exemption, from a few photos.

Built to the GOV.UK [Structuring forms](https://www.gov.uk/service-manual/design/form-structure) guidance:

1. **Check if you can apply**: 5 eligibility questions first (own and live there, household size, assets, income band, tax bill), with stop pages so people who can't apply find out right away.
2. **Task list** of short sections: your home, about you, people in your home, income, savings and property, debts and expenses. One question per page, with branching so a "no" skips the follow-ups.
3. **Photos instead of typing**: the tax bill fills address, parcel, PRE and amounts; W-2/SSA-1099/paystubs fill income and employer; bank and mortgage statements fill Parts 2 and 7. Gemma 4 only reads documents. The rules engine (`lib/hope.ts`) decides.
4. **Check your answers** with Change links, then the **official 2026 HOPE application PDF**, filled in.

Every input the PDF asks for, and how the app gets it, is in [`docs/question-protocol.md`](docs/question-protocol.md).

> Income limits, the asset cap and the deadline in `lib/config.ts` come from the City of Detroit **2026 HOPE
> Application**. This tool gives an estimate, not a decision; the Board of Review decides.

The results screen fills in the **official 2026 HOPE application PDF** (`public/forms/`) in the browser, so
nothing leaves the device: Form 5737, Form 4988 for each adult who didn't file a tax return, Form 2368 when the
PRE is missing, and the statement page.

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

Synthetic documents live at `/samples`, with ready-made images in `public/samples/` (in mock mode the
filename picks the result: `tax-bill`, `ssa`, `w2`, `bank`, `mortgage`, `crop`).

Own and live there → 2 people → assets no → "$26,015 or less" → scan `tax-bill-sample.png` →
**"You could save about $2,100 a year"**. Then: Your home (bill already read; scan `mortgage-statement-jane-doe.png`),
About you (name comes from the bill), People (John Doe, 70, Spouse), Income (`ssa-1099-jane-doe.png` for Jane; John has no income),
Savings (`bank-statement-jane-doe.png`), Debts and expenses → Check your answers → download the filled PDF.
Upload `w2-cropped-john-doe.png` to show the "cut off, retake" path.

## Reliability

- Image downsized client-side (1600px, JPEG 0.85) before upload.
- Model reply parsed defensively (fences/prose stripped), validated with zod, one retry on bad JSON, 20s timeout.
- Any failure falls back to manual entry, pre-filled with whatever fields did validate. The user can always type the income.
- SSN-like patterns are masked in everything returned from the model. Images and extracted data are never logged or stored.

## Scripts

`npm run typecheck` · `npm test` · `npm run build`

See `NOTES.md` for shortcuts taken and known gaps.
