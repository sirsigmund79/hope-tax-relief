import { THRESHOLDS_VERIFIED } from "@/lib/config";

export default function IllustrativeBanner() {
  if (THRESHOLDS_VERIFIED) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      Illustrative thresholds. Verify against current City of Detroit HOPE guidelines.
    </div>
  );
}
