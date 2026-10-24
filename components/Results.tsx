"use client";

import type { Evaluation } from "@/lib/hope";
import { usd } from "@/lib/format";
import { Card } from "./ui";
import IllustrativeBanner from "./IllustrativeBanner";

export default function Results({
  result,
  address,
  currentBill,
}: {
  result: Evaluation;
  address: string;
  currentBill: number | null;
}) {
  const { qualified, label, reason, flags } = result;
  const bill = currentBill;

  return (
    <div className="space-y-4">
      <Card className={qualified ? "border-emerald-300 bg-emerald-50" : "border-slate-300"}>
        <p className="text-sm font-medium text-slate-600">{address || "Your home"}</p>
        <h2 className={`mt-1 text-3xl font-bold ${qualified ? "text-emerald-800" : "text-slate-800"}`}>
          {qualified ? `You likely qualify: ${label}` : "You likely don't qualify yet"}
        </h2>
        {reason && <p className="mt-2 text-slate-700">{reason}</p>}

        {bill !== null && (
          <div className="mt-5 flex items-end justify-center gap-4 text-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Now</p>
              <p className={`text-3xl font-bold ${qualified ? "text-slate-400 line-through" : "text-slate-800"}`}>{usd(bill)}</p>
            </div>
            {qualified && (
              <>
                <p className="pb-1 text-3xl text-slate-400">→</p>
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Estimated</p>
                  <p className="text-5xl font-extrabold text-emerald-700">{usd(result.estimatedNewBill)}</p>
                </div>
              </>
            )}
          </div>
        )}
        {qualified && result.annualSavings !== null && result.annualSavings > 0 && (
          <p className="mt-3 text-center font-semibold text-emerald-800">Save about {usd(result.annualSavings)} a year</p>
        )}

        <p className="mt-4 text-xs text-slate-600">
          Household income {usd(result.totalIncome)} vs. limit {usd(result.incomeLimit)} (poverty line {usd(result.povertyLine)}).
          This is an estimate; the Board of Review makes the final decision.
        </p>
      </Card>

      {flags.map((f, i) => {
        switch (f.code) {
          case "FORM_4988_NEEDED":
            return (
              <Card key={i} className="border-blue-200 bg-blue-50">
                <h3 className="font-semibold text-blue-900">Form 4988 needed for {f.person}</h3>
                <p className="mt-1 text-sm text-blue-900">
                  No income document for {f.person}. If they have no income, they sign a Poverty Exemption Affidavit (Form 4988) instead.
                </p>
              </Card>
            );
          case "DTRF_CHECK":
            return (
              <Card key={i} className="border-purple-200 bg-purple-50">
                <h3 className="font-semibold text-purple-900">Help with {usd(f.amount)} in past-due taxes</h3>
                <p className="mt-1 text-sm text-purple-900">
                  HOPE covers future bills, not back taxes. The Detroit Tax Relief Fund (DTRF) may pay off delinquent property
                  taxes for HOPE-approved homeowners. Ask about it when you apply.
                </p>
              </Card>
            );
          case "PRE_MISSING":
            return (
              <Card key={i} className="border-amber-200 bg-amber-50">
                <h3 className="font-semibold text-amber-900">Principal Residence Exemption missing</h3>
                <p className="mt-1 text-sm text-amber-900">
                  Your bill shows less than 100% PRE. File Form 2368 so you aren't taxed as a non-owner-occupied home.
                </p>
              </Card>
            );
          case "ASSET_CAP_EXCEEDED":
            return (
              <Card key={i} className="border-red-200 bg-red-50">
                <h3 className="font-semibold text-red-900">Savings over the limit</h3>
                <p className="mt-1 text-sm text-red-900">
                  {usd(f.assets)} in cash and savings is over the {usd(f.cap)} asset limit.
                </p>
              </Card>
            );
        }
      })}

      <Card>
        <h3 className="font-semibold">Your filing packet</h3>
        <ul className="mt-2 space-y-2">
          {result.packet.map((p) => (
            <li key={p} className="flex gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" aria-label={p} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Card>

      <IllustrativeBanner />
    </div>
  );
}
