# NOTES

Decisions, shortcuts, and known gaps (one line each).

- Phase 0: no GEMINI_API_KEY in the build environment, so the live probe (`npm run probe -- img.jpg`) was not run here; everything was built and verified on `MOCK_LLM=1`.
- Scaffolded Next.js by hand instead of create-next-app; TypeScript pinned to 5.x (7.x is not supported by Next 15 tooling).
- Thresholds in `lib/config.ts` are illustrative: 2025 HHS poverty guideline ($15,650 + $5,500/person), tiers at 100/125/150/175/200% of the line, $12,000 asset cap. `THRESHOLDS_VERIFIED = false`.
- A null `preExemptionPercent` (unknown) does not raise PRE_MISSING; only a known value < 100 does.
- Uploaded docs with a blank income don't count as income documents, so the Form 4988 flag stays until an amount is entered or the doc is removed.
- Mock mode picks a fixture by filename (ssa / bill / crop / pay); any other filename returns the W-2 fixture.
- Phase 4: sample screenshots in `public/samples/` were generated from `/samples` with Playwright. Filenames carry the mock-mode hints.
- Phase 5: verified with a production build. Demo script ran 3× clean in mock mode at 390px width; tax bill scan fills $2,100/$4,800; with `MOCK_LLM=0` and no key, every upload falls back to manual entry and the flow still completes.
- Known gap: live extraction accuracy on the samples is unverified (no API key here). Run `npm run probe` and one live pass before demoing.
- Known gap: the retry sends a `model` turn back to Gemma; if the chosen model id rejects multi-turn, the retry fails and we fall back to manual entry (safe, just less magic).
- Known gap: no automated UI tests in the repo; the Playwright demo checks were run ad hoc during the build.
