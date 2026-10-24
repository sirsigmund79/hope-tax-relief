import { THRESHOLDS_SOURCE, THRESHOLDS_VERIFIED } from "@/lib/config";

export default function IllustrativeBanner() {
  if (THRESHOLDS_VERIFIED) {
    return (
      <p className="text-center text-xs text-slate-500">
        Income and asset limits from the City of Detroit {THRESHOLDS_SOURCE}. The Board of Review makes the final decision.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      Illustrative thresholds. Verify against current City of Detroit HOPE guidelines.
    </div>
  );
}
