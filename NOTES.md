# NOTES

Decisions, shortcuts, and known gaps (one line each).

- Phase 0: no GEMINI_API_KEY in the build environment, so the live probe (`npm run probe -- img.jpg`) was not run here; everything was built and verified on `MOCK_LLM=1`.
- Scaffolded Next.js by hand instead of create-next-app; TypeScript pinned to 5.x (7.x is not supported by Next 15 tooling).
- ~~Illustrative thresholds~~ replaced: `lib/config.ts` now holds the 2026 income table, $12,000 asset cap and Nov 6, 2026 4:30 p.m. deadline transcribed from the official 2026 HOPE application (page 7). Transcribed by hand from an image; spot-check before relying on it.
- The 10% tier only applies with a 20% income loss or tax foreclosure (`hardship` checkbox), per the 2026 guidelines.
- A null `preExemptionPercent` (unknown) does not raise PRE_MISSING; only a known value < 100 does.
- Uploaded docs with a blank income don't count as income documents, so the Form 4988 flag stays until an amount is entered or the doc is removed.
- Mock mode picks a fixture by filename (ssa / bill / crop / pay); any other filename returns the W-2 fixture.
- Phase 4: sample screenshots in `public/samples/` were generated from `/samples` with Playwright. Filenames carry the mock-mode hints.
- Phase 5: verified with a production build. Demo script ran 3× clean in mock mode at 390px width; tax bill scan fills $2,100/$4,800; with `MOCK_LLM=0` and no key, every upload falls back to manual entry and the flow still completes.
- Known gap: live extraction accuracy on the samples is unverified (no API key here). Run `npm run probe` and one live pass before demoing.
- Known gap: the retry sends a `model` turn back to Gemma; if the chosen model id rejects multi-turn, the retry fails and we fall back to manual entry (safe, just less magic).
- Known gap: no automated UI tests in the repo; the Playwright demo checks were run ad hoc during the build.
- Probe script wraps its body in main() (tsx runs .ts as CommonJS here, so top-level await fails) and loads .env.local via @next/env.
- Model-call errors are logged server-side (API message only, SSN-masked) and shown in the UI outside production, to make key/model-id problems diagnosable.
- Requirements, income limits and a live savings-by-tier table now sit on step 1; savings over the cap are flagged at the field, not only at the end.
- Packet logic lives in `lib/packet.ts` (pure, tested). The tracker updates as documents are added; Results renders the packet as draft pages (HOPE application, Form 4988/2368 worksheets, attachments) with browser print. No PDF generation.
- The pre-filled pages are drafts to copy onto the official forms, labeled as such; their wording is not the official form text.
- Photos for the packet are local object URLs, kept in the browser only. They aren't revoked on remove (small leak, fine for a session).
- Form 4988 now follows the real rule: every adult gives tax returns OR a 4988 (not required to file). Default guess: W-2/paystub → filed; otherwise → 4988. Each adult has a Yes/No toggle. This replaces the original spec's "no income doc → 4988".
- The official PDF (`public/forms/2026-hope-application.pdf`, 7 MB) is filled client-side with pdf-lib (`lib/hopePdf.ts`); field mapping is pure in `lib/hopeFields.ts`. The download stays an editable form.
- The filled PDF drops pages this household doesn't need: the community-partner authorization letter, Form 2368 unless PRE < 100%, and unused Form 4988 copies. Widgets on removed pages are detached from shared fields first.
- The spare 4988 pages (19–21) have no name field, so names are drawn as text in the name box. The PDF has room for 4 affidavits (applicant + 3); more are listed as "print one more".
- We only know total household assets, so Part 7 gets one "Total, all accounts" row. Ages, marital status, mortgage, vehicles, debts, expenses, and the Part 3/13 affirmation boxes are left for the applicant.
- NeedAppearances is left off: pdf-lib draws field appearances itself, and turning it on made poppler redraw with a font tag it couldn't resolve.
- Known gap: the whole 7 MB PDF is fetched on download; fine on Wi-Fi, slow on a weak phone connection.
- Restructured to GOV.UK "Structuring forms": eligibility check first (with stop pages), then a task list of sections, one question per page, branching yes/no gates, Check your answers with Change links. Flow is pure and tested in `lib/flow.ts`; all state lives in one `AppState` (`lib/application.ts`) with pure selectors for the rules engine, packet and PDF.
- `docs/question-protocol.md` lists every PDF input, why it's needed, and how we get it (fixed, derived, photo, ask, branch, or left for the person).
- Data-entry minimizers: tax bill photo fills address/parcel/PRE/amounts/owner name; W-2 fills employer name and address; new BANK_STATEMENT and MORTGAGE_STATEMENT extraction fills Parts 7 and 2; move-in date feeds both Part 2 and Form 2368 line 11; spouse age and dependents are derived from the people list; "no" answers write N/A; blank expenses become N/A.
- Part 3 boxes are ticked from the "own and live in" answer; Part 13 only after the person ticks the in-app acknowledgment. Signatures, dates signed, the property's legal description, and Form 2368's last-four SSN are always left for the person.
- Answers persist in sessionStorage (this tab only); photos don't, since object URLs die on reload. Re-scan after a refresh if you want thumbnails in the packet.
- Self-reported income band stands in for income until documents are added, so the task-list estimate is meaningful from the start.
- "Number of legal dependents" is approximated as people under 18 in the household.
- Known gap: the end-to-end Playwright scripts used to verify the wizard aren't committed (they need a running server and playwright installed globally).
- Demo video: made with HyperFrames 0.8.180 (pinned; the newest release was a few hours old), blank example, one file, local GSAP copy so renders don't hit a CDN. Lint warns that scenes should be sub-compositions; that only affects HyperFrames Studio's timeline view, not the render. Telemetry off via HYPERFRAMES_NO_TELEMETRY.
