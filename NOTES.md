# NOTES

Decisions, shortcuts, and known gaps (one line each).

- Phase 0: no GEMINI_API_KEY in the build environment, so the live probe (`npm run probe -- img.jpg`) was not run here; everything was built and verified on `MOCK_LLM=1`.
- Scaffolded Next.js by hand instead of create-next-app; TypeScript pinned to 5.x (7.x is not supported by Next 15 tooling).
- Thresholds in `lib/config.ts` are illustrative: 2025 HHS poverty guideline ($15,650 + $5,500/person), tiers at 100/125/150/175/200% of the line, $12,000 asset cap. `THRESHOLDS_VERIFIED = false`.
- A null `preExemptionPercent` (unknown) does not raise PRE_MISSING; only a known value < 100 does.
