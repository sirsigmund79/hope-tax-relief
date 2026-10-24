import type { Evaluation } from "@/lib/hope";
import { usd } from "@/lib/format";

/** Running verdict shown while documents are being added. */
export default function EstimateBar({ result, currentBill }: { result: Evaluation; currentBill: number | null }) {
  const assetsBlock = result.flags.some((f) => f.code === "ASSET_CAP_EXCEEDED");
  let tone = "border-emerald-300 bg-emerald-50 text-emerald-900";
  let text: React.ReactNode;
  if (assetsBlock) {
    tone = "border-red-300 bg-red-50 text-red-900";
    text = <>Savings are over the limit, so you likely won't qualify even if income fits.</>;
  } else if (!result.incomeTier) {
    tone = "border-amber-300 bg-amber-50 text-amber-900";
    text = <>Income so far is {usd(result.overIncomeBy)} over the limit. Double-check each amount.</>;
  } else {
    text = (
      <>
        Fits the <b>{result.incomeTier.label}</b>
        {currentBill !== null && <> · est. bill <b>{usd(result.estimatedNewBill)}</b> (was {usd(currentBill)})</>}
      </>
    );
  }
  return (
    <div className={`sticky top-2 z-10 rounded-lg border px-3 py-2 text-sm shadow-sm ${tone}`}>
      <span className="text-xs font-semibold uppercase tracking-wide opacity-70">So far · income {usd(result.totalIncome)}</span>
      <p>{text}</p>
    </div>
  );
}
