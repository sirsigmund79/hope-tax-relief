"use client";

import { useEffect, useState } from "react";
import { ASSET_CAP, DEADLINE, DEADLINE_LABEL, INCOME_YEAR, TAX_YEAR } from "@/lib/config";
import type { TierRow } from "@/lib/hope";
import { usd } from "@/lib/format";
import { Card } from "./ui";

function daysLeft(now: Date) {
  return Math.ceil((DEADLINE.getTime() - now.getTime()) / 86_400_000);
}

export default function Requirements({ rows, householdSize }: { rows: TierRow[]; householdSize: number }) {
  // Computed after mount so the server render and the visitor's clock can't disagree.
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => setDays(daysLeft(new Date())), []);

  const regular = rows.filter((r) => !r.requiresHardship);
  const top = regular[regular.length - 1];
  const hardship = rows.find((r) => r.requiresHardship);
  const people = `${householdSize} ${householdSize === 1 ? "person" : "people"}`;

  const items = [
    <>You <b>own and live in</b> this Detroit home as your primary residence (as of Dec 31, {INCOME_YEAR}).</>,
    <>
      Household income is <b>{usd(top.maxIncome)} or less</b> for {people} (up to {usd(hardship?.maxIncome)} for the 10%
      tier if income dropped 20% or the home is in tax foreclosure). Lower income means a bigger cut, up to 100%.
    </>,
    <>Total household assets are <b>{usd(ASSET_CAP)} or less</b>: bank accounts, stocks, IRAs, other property, boats, campers.</>,
    <>Every adult gives their <b>{INCOME_YEAR} tax returns</b>, or signs <b>Form 4988</b> if they weren&apos;t required to file, plus documents for every income source.</>,
    <>Each adult shows a <b>photo ID</b> (front and back) with this address, and you show a <b>recorded deed or land contract</b>.</>,
    <>You apply <b>every year</b>. There&apos;s no fee.</>,
  ];
  return (
    <Card className="border-blue-200 bg-blue-50/60">
      <div className={`-mx-4 -mt-4 mb-3 rounded-t-xl px-4 py-2 text-sm font-semibold ${days !== null && days <= 14 ? "bg-red-600 text-white" : "bg-blue-900 text-white"}`}>
        {TAX_YEAR} deadline: {DEADLINE_LABEL}
        {days !== null && days >= 0 && <> · {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} left`}</>}
        {days !== null && days < 0 && <> · closed for {TAX_YEAR}</>}
      </div>
      <h2 className="text-lg font-semibold text-blue-950">Who qualifies for HOPE</h2>
      <ul className="mt-2 space-y-2 text-sm text-slate-800">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-0.5 text-blue-700" aria-hidden>✓</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
