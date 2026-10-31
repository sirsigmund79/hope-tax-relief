# HOPE Check: handoff

This document is for whoever (person or AI) picks up the work. Its main goal: **finish mapping every document
and form field the 2026 Detroit HOPE application needs**, and wire each one into the app with the least typing
possible.

Read this first, then [`pdf-field-map.md`](pdf-field-map.md) (every field in the official PDF and its status) and
[`question-protocol.md`](question-protocol.md) (why each question exists and how the app gets the answer).

---

## 1. What the app does

Detroit's HOPE (Homeowners Property Exemption) lowers a low-income homeowner's property tax by 10–100%. The City's
application is a 21-page fillable PDF (`public/forms/2026-hope-application.pdf`) with 233 form fields, plus supporting
documents for everyone in the home, filed every year. The 2026 deadline is **Friday, November 6, 2026, 4:30 p.m.**

HOPE Check is a Next.js app that:

1. Asks 5 eligibility questions first and estimates savings from the City's 2026 income table.
2. Walks the person through short sections, one question per page, branching so "no" skips follow-ups.
3. Reads photos of documents (tax bill, W-2, SSA-1099, paystub, bank statement, mortgage statement) with Gemma 4
   to pre-fill answers. **The model only extracts; deterministic, tested rules decide eligibility.**
4. Fills the **official PDF** in the browser with `pdf-lib` and offers it as a download, with a checklist of what
   the person must still bring, sign, or write by hand.

Status: working end to end in mock mode and with the no-key fallback. Live Gemma extraction has never been run
against real model output (no API key was available while building). 71 unit tests pass.

## 2. Ground rules (from the project owner; do not break these)

- **Open source, no vendor SDKs in the repo.** Do not add Cloudflare packages, `wrangler` config, OpenNext config,
  or deploy scripts. Hosting is configured entirely in the Cloudflare dashboard (section 10).
- **No `CLAUDE.md` / `AGENTS.md` files**, and no "co-authored by" lines in commits.
- **No real personal data in the repo.** Samples are synthetic, except `public/samples/detroit-summer-tax-bill-2026.jpg`
  (a real bill with the parcel number blacked out, no name or address).
- **Never collect SSNs** (including the last four digits Form 2368 asks for), bank account numbers, or signatures.
  `lib/mask.ts` masks SSN-like patterns in everything the model returns.
- **The demo must never break.** `MOCK_LLM=1` must make the whole app work with no network. Every model failure
  falls back to manual entry.
- **The model never decides eligibility.** All eligibility math is in `lib/hope.ts` and `lib/config.ts`.
- Answers stay in the browser (sessionStorage for the tab). Photos are sent only to `/api/extract` and never stored.

## 3. Repository map

| Path | Role |
|---|---|
| `lib/config.ts` | 2026 income table (per household size, per tier), $12,000 asset cap, deadline, tax/income years |
| `lib/hope.ts` | Pure rules engine: tier, blocker (assets / income / hardship), flags (4988, PRE missing, DTRF, assets) |
| `lib/application.ts` | **The single app state** (`AppState`) and pure selectors: rules input, packet input, PDF data |
| `lib/flow.ts` | Sections, page order, branching (`sectionPages`, `nextPage`), task-list status |
| `lib/hopeFields.ts` | **Pure mapping from app data to the PDF's field names** (`planFill`). Most mapping work happens here |
| `lib/hopePdf.ts` | Applies the plan with `pdf-lib`: sets text, selects checkbox states, stamps names, removes pages |
| `lib/packet.ts` | The filing checklist (application, deed, ID, income docs, returns or 4988, minors, 2368, tax bill) |
| `lib/schema.ts` | Zod schema for what the model extracts from a document photo |
| `lib/gemma.ts` | Model call: prompt, defensive JSON parsing, one retry, 20 s timeout, mock mode |
| `lib/fixtures/index.ts` | Mock extraction results, chosen by filename hint |
| `lib/address.ts` | Splits free-text addresses into the form's street / city / state / ZIP boxes |
| `app/page.tsx` | Wizard shell: state, history, validation, "return to Check your answers" after a Change link |
| `components/pages/*.tsx` | Every question page, as data (`title`, `hint`, `body`, `validate`) |
| `components/PacketView.tsx` | Preview of filled fields, "still to complete" list, PDF download |
| `app/api/extract/route.ts` | POST image → validated extraction |
| `app/samples/page.tsx`, `public/samples/` | Synthetic sample documents for demos (mock results keyed on filename) |
| `scripts/pdf-field-map.ts` | `npm run fields`: regenerates `docs/pdf-field-map.md` and `docs/pdf-fields.json` |
| `scripts/probe-gemma.ts` | `npm run probe -- image.png`: checks the Gemma key and model ID |
| `docs/question-protocol.md` | Every input, why it's needed, how the app gets it |
| `NOTES.md` | Running log of decisions, shortcuts and known gaps |

## 4. How data flows

```
photo ──► /api/extract ──► Extraction (lib/schema.ts) ──► DocEntry on a Person, or fields on AppState
                                                              │
question pages (components/pages) ──────────────────────────►  AppState (lib/application.ts)
                                                              │
        ┌──────────────────────────────┬──────────────────────┴───────────────────┐
        ▼                              ▼                                          ▼
 householdInput() → evaluate()   packetInput() → buildPacket()        applicationData() → planFill()
 (lib/hope.ts: tier, flags)      (lib/packet.ts: checklist)           (lib/hopeFields.ts: field → value)
                                                                                  │
                                                                     fillHopePdf() (lib/hopePdf.ts)
                                                                     in the browser, on Download
```

Conventions in `ApplicationData` (`lib/hopeFields.ts`), which every new field should follow:

- `undefined` = the question wasn't answered → leave the PDF field blank for the person.
- `null` or `[]` = answered "none" → write `N/A` in the first cell (the form asks for N/A rather than blanks).
- Lists fill the form's fixed rows in order; anything past the last row goes into `plan.overflow`, which the app shows
  as "list them on a separate page".

## 5. The official PDF

`public/forms/2026-hope-application.pdf`, downloaded from the City (detroitmi.gov/hope). 21 pages, letter size,
AcroForm with 233 fields (generated list: [`pdf-field-map.md`](pdf-field-map.md); machine-readable:
[`pdf-fields.json`](pdf-fields.json) with page, rectangle, checkbox states, dropdown options).

| Page(s) | Content | In the downloaded output |
|---|---|---|
| 1 | Cover: where and when to submit, deadline | Kept |
| 2 | Community partner list | Kept |
| 3–4 | Documentation checklist (not a form; lists every document type) | Kept |
| 5 | Visual guide: proof of ownership, ID, tax returns or 4988 | Kept |
| 6–8 | Board of Review guidelines: eligibility rules, **2026 income table (p. 7)**, asset cap, meeting dates | Kept |
| 9–12 | **Form 5737**, Application and Affirmation for MCL 211.7u Poverty Exemption, Parts 1–15 | Kept, filled |
| 13–14 | **Form 2368**, Principal Residence Exemption Affidavit (+ instructions) | Kept only if the tax bill's PRE is under 100% |
| 15–16 | City of Detroit HOPE Application Assistance Letter of Authorization (community partner) | **Removed** |
| 17 | **Form 4988**, Poverty Exemption Affidavit (its name box is the shared Petitioner's Name field) | Kept only if the petitioner needs a 4988 |
| 18 | 2026 HOPE Statement Form (phone, email, statement; Board-use income table) | Kept, filled |
| 19–21 | Form 4988 spare copies; **their name box is not a field** | As many as needed; names drawn at x=56, y=559 |

Page removal (`removePages` in `lib/hopePdf.ts`) first detaches the removed pages' widgets from shared fields, so
the remaining form stays valid and editable.

### PDF quirks that will bite you

- **Shared fields.** One field can appear on many pages, and filling it fills all of them: `Petitioner's Name` (pages
  9, 11, 12, 13, 15, 16, 17, 18), the address fields, `Property Parcel Identification Number`, `Daytime Phone Number`,
  and `Date of certification` (12, 17–21, 18). You **cannot** give the four 4988 copies different dates or names
  through fields.
- **Field names have typos and must be matched exactly:** `Principle Residence ZIP Code`, `Number of Legal Decendents`,
  `Recinded`, lowercase `monthly payment`, `property description`.
- **Some tooltips name the wrong field.** For example, `First household occupant. age` has the tooltip "Seventh household
  occupant. age", and `Eighth household occupant. Financial contribution…` has "First household occupant…". Always go
  by the field name and its position (`rect` in `pdf-fields.json`), never by the tooltip.
- **Form 2368 Yes/No pairs** are one field with two widgets and different on-states. `selectButton()` sets them:
  - `Check Box2`: `Yes` = Township box, `No` = City box (Detroit → `No`)
  - `Property`: `Yes` = line 11a principal residence, `No` = 11b adjoining property
  - `Claimed` (line 13): states are `Yes` and lowercase **`no`**
  - `Recinded` (15), `If yes to 16` (16), `18` (18): `Yes` / `No`
- `Check if you own, or are buying, other property…` has a long, odd on-state name; use `"*"` (its only on-state).
- Text is shrunk to fit narrow boxes (min 6 pt). `NeedAppearances` is deliberately off: `pdf-lib` draws the appearances,
  and turning it on made viewers redraw with a missing font.
- The `Dropdown CP List` (community partner) defaults to "Self Prepared". Options: Self Prepared, Accounting Aid Society,
  Alger Theater, Bridging Communities, Central Detroit Christian, Cody Rouge Comm Action Alliance, Eastside Community
  Network, Greater Quinn AME, Jefferson East Inc., MACC Development, MIWealth, Osborn Neighborhood Alliance, UCHC,
  U-SNAP-BAC, Wayne Metro, Other.

## 6. Mapping status

From `npm run fields` (run it after any mapping change):

- **233** fields. **201** are filled when every question is answered.
- **17** are unmapped gaps, plus **3** mapped but never asked (account interest rate).
- **4** are left for the applicant on purpose (date signed, both SSN boxes, partner dropdown default).
- **11** are on the removed partner-letter pages, or are the PDF's Reset button.

The per-field source of every filled value is in the "Source / status" column of `pdf-field-map.md`.

## 7. What's left: the mapping backlog

Ordered by how much it matters to a complete application. "Where" points at the code to change.

### 7.1 Form fields with no question yet (from `pdf-field-map.md`)

| Field(s) | Form / part | Suggested approach | Where |
|---|---|---|---|
| `property description` | 5737 Part 2 | Legal description is on the deed or assessment roll, not the tax bill. Add a deed photo (new doc type) or an optional text question; leave blank if unknown | schema, `home` section, `planFill` |
| `Amount of income earned from other property` | 5737 Part 4 | Ask on `other-property-list` | `components/pages/money.tsx`, `AppState`, `planFill` |
| `Contact person of employer`, `employer telephone number` | 5737 Part 5 | Optional questions after income documents, only when there's wage income | `income` section |
| `First/Second/Third item. Current interest rate` | 5737 Part 7 | **Already mapped**; add an optional input to `accounts-list` (bank statements often print the rate; add it to the extraction too) | `money.tsx`, schema |
| `Monthly Expense Information. Other type and amount 1–6` | 5737 Part 12 | Add up to 6 "other" rows (label + amount) on the `expenses` page | `money.tsx`, `AppState.expenses`, `planFill` |
| `Co Owner`, `Number2` | 2368 lines 8, 10 | Tax bill may list owners; ask "Is anyone else on the deed?" when the 2368 branch is active | `home` section |
| `If Yes`, `Recinded`, `Parcel Number`, `Text19` | 2368 lines 14, 15, 17, 19 | Today one question answers lines 13/16/18 together and only "No" is filled. Split into three Yes/No questions, each with a follow-up | `pre-elsewhere` page in `household.tsx` |
| `Mailing Address` | 2368 line 22 | Ask "Is your mailing address different?" in the 2368 branch | `home` section |
| `SSN`, `SSN1` | 2368 lines 6, 9 | **Do not collect.** Keep listed in the "still to complete" list | — |
| `Date of certification` | 5737 Part 15, every 4988, statement | **Leave blank**: it's the date signed, and one shared field covers every page | — |

### 7.2 Forms and documents the application requires that the app doesn't produce or collect

- **Form 5739.** The guidelines (page 6) require "Michigan Treasury Form 5737 **and Michigan Treasury Form 5739**",
  but 5739 is not in the City's PDF. Find the official Michigan Treasury form, confirm what it is and whether it applies
  to every applicant, then either fill it (add the PDF under `public/forms/` and a second fill step) or add it to the
  packet checklist. Unverified.
- **Community partner authorization letter (pages 15–16).** Removed today. If a partner helps, it needs the partner
  (dropdown above), rep name, partner address/phone/fax/email, and the applicant's signature. Add a "Did someone help
  you?" branch, then keep and fill those pages.
- **Tax returns.** For adults who filed: complete federal and state returns with all schedules, including the
  Homestead Property Tax Credit and Home Heating Credit claims (believed to be MI-1040CR and MI-1040CR-7; verify).
  The app lists these in the packet but doesn't read them. A 1040 photo could supply income instead of W-2s.
- **Income documents beyond W-2 / SSA-1099 / paystub.** The checklist (page 3) lists: wages (W-2 or 1099),
  unemployment (1099-G), pensions (W-2 or 1099-R), SSI/SSA/SSD (letter or 1099), Bridge Card / FIA / DHS (award letters),
  dividends, VA benefits (award letter), disability (1099), child or spousal support (judgment or award letter),
  support from family or friends (signed statement with contact info and amount), self-employment
  (checks, receipts, signed statement), rental income (checks or receipts), other. Each needs a `DocType`, extraction
  rules in the prompt, a fixture, a label in `SOURCE_LABELS` (`lib/application.ts`), and a packet entry.
- **Income of minors.** The checklist asks for income documents for **all household members, including minor
  children**. Today only adults get income pages (`sectionPages(…, "income")` uses `adults()`), and children get no
  Part 10 contribution. Decide with the Board of Review's guidance, then extend.
- **Proof of ownership** (recorded deed, land contract, or court order with the Register of Deeds stamp), **photo ID
  front and back for every adult** (address must match), **proof of residency for minors**: listed in the packet as
  "to do" only. Photo capture into the packet is a cheap next step; no extraction needed.

### 7.3 Capacity limits in the form

| Part | Rows | Today when exceeded |
|---|---|---|
| Part 6 income sources | 3 | Sources past the 2nd are folded into row 3 as text |
| Part 4 other property | 2 | `overflow` message |
| Part 7 accounts | 3 | `overflow` message |
| Part 8 life insurance | 3 | `overflow` message |
| Part 9 vehicles | 2 | `overflow` message |
| Part 10 occupants | 8 | `overflow` message |
| Part 11 debts | 8 | `overflow` message |
| Form 4988 copies | 4 (page 17 + 19–21) | Extra adults listed as "print one more"; could duplicate page 19 with `copyPages` and stamp the name |

Consider generating an "additional information" page for overflow rather than just telling the person.

### 7.4 Approximations to confirm with the Board of Review

- `Number of Legal Decendents` = count of people under 18 in the home.
- Part 3 ownership/homestead boxes are ticked from the eligibility answer "Do you own and live in this home?"
- Part 6 amounts are written as annual. W-2 Box 1 is used for wages, SSA-1099 Box 5 for Social Security.
- Who needs Form 4988: anyone who answers "not required to file". The default guess (W-2/paystub → filed, otherwise →
  4988) is only a pre-selection; the person must answer.
- What counts toward the $12,000 asset cap (vehicles? the guidelines list bank accounts, other real property, boats,
  campers, stocks, bonds, IRAs).
- The 10% tier needs a 20% income loss or a home in tax foreclosure; it's a single yes/no today, with no evidence asked for.
- Whether to keep pages 1–8 (instructions) in the downloaded PDF.

## 8. Recipe: adding a field end to end

1. **Find the field** in `docs/pdf-field-map.md` / `docs/pdf-fields.json` (exact name, page, rect, states).
2. **Decide how to get it**, cheapest first: fixed value → derived from an existing answer → read from a photo → one
   question → a yes/no branch → leave for the person. Record the decision in `docs/question-protocol.md`.
3. **State:** add it to `AppState` and `initialState()` in `lib/application.ts`.
4. **Question:** add a page in `components/pages/*.tsx` (title as a question, optional hint, `validate`), and put its id in
   `sectionPages()` in `lib/flow.ts`, behind a branch condition if it only applies sometimes. Add a row to the summary in
   `components/pages/send.tsx` so it shows on Check your answers.
5. **From a photo (optional):** add keys to `Extraction` in `lib/schema.ts` with `.nullable().default(null)` so older
   model replies still validate. Add a rule to `PROMPT` in `lib/gemma.ts`, a fixture and filename hint in
   `lib/fixtures/index.ts`, and use the result in the page's `ScanCard` `onRead`.
6. **To the PDF:** add it to `ApplicationData` and `applicationData()` (follow the undefined / null / [] convention),
   then set it in `planFill()` in `lib/hopeFields.ts` with the exact field name. For checkboxes use `checks[name] = state`.
7. **Tests:** extend `tests/hopePdf.test.ts` (planFill value; for tricky fields, the real-PDF fill test),
   `tests/flow.test.ts` (branching), `tests/application.test.ts` (derivations).
8. **Regenerate the map:** `npm run fields`. The field should move from "GAP" to a source description. Add a `SOURCES`
   pattern in `scripts/pdf-field-map.ts` if it shows "filled (see lib/hopeFields.ts)".
9. **Check the packet:** if it's something the person must bring or sign, update `lib/packet.ts` and the "still to
   complete" list in `components/PacketView.tsx`.

## 9. Verifying changes

```bash
npm run typecheck && npm test        # 71 tests: rules, flow, selectors, extraction parsing, PDF fill
npm run fields                       # field coverage; commit the regenerated docs/pdf-field-map.md and pdf-fields.json
npm run build                        # production build
```

To eyeball a filled PDF: download one from the results page in `npm run dev` (mock mode), or call `fillHopePdf()` from
a test, then render pages with `pdftoppm -f 9 -l 12 -r 80 -png filled.pdf out` and read field values back with pypdf
(`PdfReader(path).get_fields()`). The tests in `tests/hopePdf.test.ts` show how to read values and checkbox states with
`pdf-lib`.

Manual end-to-end check (mock mode, phone width), which was run repeatedly during development:

1. Start → own and live there: Yes → 2 people → assets: No → "$26,015 or less" → scan `tax-bill-sample.png` →
   "You could save about $2,100 a year".
2. Your home (address and parcel pre-filled; mortgage Yes → scan `mortgage-statement-jane-doe.png`) → About you (name
   pre-filled from the bill) → People (John Doe, 70, Spouse) → Income (`ssa-1099-jane-doe.png` for Jane; John: no
   income; both "not required to file") → Savings (Yes → `bank-statement-jane-doe.png`; No to the rest) → Debts No →
   expenses.
3. Check your answers → tick the guidelines box → download → 15-page PDF with both 4988s.
4. `detroit-summer-tax-bill-2026.jpg` instead exercises the Form 2368 branch (PRE 0%).

The Playwright scripts used for this weren't committed; adding them (with `@playwright/test` as a dev dependency) is a
good early task.

## 10. Running and deploying

Local: `npm install`, `cp .env.example .env.local`, `npm run dev`. Variables:

| Variable | Meaning |
|---|---|
| `MOCK_LLM` | `1` = fixture answers chosen by filename (`tax-bill`, `detroit`, `ssa`, `w2`, `bank`, `mortgage`, `crop`, `pay`), no network |
| `GEMINI_API_KEY` | Google AI Studio key (live mode) |
| `GEMMA_MODEL` | Exact Gemma 4 model ID from AI Studio (live mode). `npm run probe -- image.png` lists available Gemma models if it's wrong |

Hosting is Cloudflare Workers connected to the GitHub repo. **All Cloudflare configuration lives in the dashboard**,
not the repo. Worker name: `hope-tax-relief`. Settings → Build:

- Build command (one line; installs the OpenNext adapter on the build machine only and writes its config there):
  ```
  npm i --no-save @opennextjs/cloudflare@1.20.10 wrangler@4.149.0 && echo 'import { defineCloudflareConfig } from "@opennextjs/cloudflare"; export default defineCloudflareConfig();' > open-next.config.ts && echo '{"name":"hope-tax-relief","main":".open-next/worker.js","compatibility_date":"2026-10-24","compatibility_flags":["nodejs_compat"],"assets":{"directory":".open-next/assets","binding":"ASSETS"},"keep_vars":true}' > wrangler.jsonc && npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion
  ```
- Deploy command: `npx opennextjs-cloudflare deploy`
- Settings → Variables and Secrets (runtime, not build): `MOCK_LLM` = `1` for a public demo. For live mode,
  `MOCK_LLM` = `0`, `GEMMA_MODEL` as plain text, and `GEMINI_API_KEY` as a **Secret**. `keep_vars` stops deploys from
  wiping them.

Why the odd flag: OpenNext refuses Next.js 15 because it's past Vercel's two-year support window. 15.5.28 has the
Oct 14, 2026 security patches. Upgrading to Next 16 (≥16.4.1) would remove the flag; it's untested here.

A first deploy with Cloudflare's default commands ran its automatic setup and created an R2 bucket,
`hope-check-opennext-cache`, which the current setup doesn't use. Delete it if it's still there.

## 11. Suggested order of work

1. Confirm the Form 5739 requirement and the approximations in 7.4 (they change what to build).
2. Income: more document types and minors' income (7.2). This affects eligibility, not just paperwork.
3. Fill the remaining 5737 gaps (7.1): other-expense rows, interest rate input, other-property income, employer contact.
4. Form 2368 follow-ups and co-owner (7.1).
5. Community partner branch, and keeping pages 15–16 (7.2).
6. Overflow page and 4988 page duplication (7.3).
7. Commit Playwright end-to-end tests; run live Gemma extraction against the samples and fix the prompt.
