import type { TierRow } from "@/lib/hope";
import { usd } from "@/lib/format";

export default function TierTable({
  rows,
  householdSize,
  highlight,
  income,
}: {
  rows: TierRow[];
  householdSize: number;
  highlight?: number | null; // exemption fraction of the row to highlight
  income?: number | null;
}) {
  const hasBill = rows[0]?.newBill !== null;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2 font-semibold">Exemption</th>
            <th className="px-3 py-2 font-semibold">Income up to</th>
            <th className="px-3 py-2 text-right font-semibold">{hasBill ? "New bill" : "Bill cut"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const on = highlight === r.exemption;
            return (
              <tr key={r.label} className={on ? "bg-emerald-100 font-semibold text-emerald-900" : "border-t border-slate-100"}>
                <td className="px-3 py-2">
                  {Math.round(r.exemption * 100)}%{on && <span className="ml-1 text-xs">← you</span>}
                  {r.requiresHardship && <span className="block text-[11px] font-normal text-slate-500">20% income loss or foreclosure only</span>}
                </td>
                <td className="px-3 py-2">{usd(r.maxIncome)}</td>
                <td className="px-3 py-2 text-right">
                  {hasBill ? (
                    <>
                      {usd(r.newBill)} <span className="block text-xs font-normal text-emerald-700">save {usd(r.savings)}</span>
                    </>
                  ) : (
                    `${Math.round(r.exemption * 100)}% off`
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="bg-slate-50 px-3 py-2 text-xs text-slate-600">
        For a household of {householdSize}
        {income != null && <>, with income of {usd(income)} so far</>}. Total yearly income of everyone in the home.
      </p>
    </div>
  );
}
