"use client";

import type { ReactNode } from "react";
import { EXPENSES, adults, filedTaxReturn, householdSize, incomeBands, incomeDocs, personLabel, type AppState } from "@/lib/application";
import { INCOME_YEAR } from "@/lib/config";
import { num, usd } from "@/lib/format";
import { DOC_LABELS } from "../DocList";
import type { Ctx, PageSpec } from "./shared";

const yn = (v: boolean | null) => (v === null ? "Not answered" : v ? "Yes" : "No");
const money = (v: string) => (num(v) === null ? "—" : usd(num(v)));

type Row = { label: string; value: ReactNode; page: string };

// The section the person last changed, reopened when they come back from a Change link.
let lastChanged: string | null = null;

function summary(s: AppState): { title: string; overview: string; rows: Row[] }[] {
  const band = s.incomeBand === null ? null : [...incomeBands(householdSize(s)).bands, incomeBands(householdSize(s)).over].find((b) => b.tier === s.incomeBand);
  const monthly = EXPENSES.reduce((t, [k]) => t + (num(s.expenses[k]) ?? 0), 0);
  const income = adults(s).reduce((t, p) => t + incomeDocs(p).reduce((u, d) => u + (num(d.income) ?? 0), 0), 0);
  const saved = s.hasAccounts ? s.accounts.reduce((t, a) => t + (num(a.balance) ?? 0), 0) : 0;
  const size = householdSize(s);
  return [
    {
      title: "Your home",
      overview: s.address || "No address yet",
      rows: [
        { label: "Address", value: s.address || "—", page: "home-details" },
        { label: "Parcel number", value: s.parcelNumber || "—", page: "home-details" },
        { label: "PRE %", value: s.preExemptionPercent || "—", page: "home-details" },
        { label: "Yearly property tax", value: money(s.currentTaxBill), page: "tax-bill" },
        { label: "Past-due taxes", value: money(s.delinquentAmount), page: "home-details" },
        { label: "Moved in", value: s.movedIn ? `${Number(s.movedIn.slice(5))}/${s.movedIn.slice(0, 4)}` : "—", page: "home-moved-in" },
        { label: "Mortgage or land contract", value: s.hasMortgage ? `${s.lender || "Yes"}, ${money(s.loanBalance)} owed, ${money(s.mortgagePayment)}/month` : yn(s.hasMortgage), page: "mortgage" },
      ],
    },
    {
      title: "About you",
      overview: [s.people[0].name, s.phone].filter(Boolean).join(" · ") || "Not answered",
      rows: [
        { label: "Name and age", value: `${s.people[0].name || "—"}, ${s.people[0].age || "—"}`, page: "you-name" },
        { label: "Phone", value: s.phone || "—", page: "you-contact" },
        { label: "Email", value: s.email || "—", page: "you-contact" },
        { label: "Marital status", value: s.maritalStatus || "—", page: "you-marital" },
        { label: "Legal designee", value: s.hasDesignee ? s.designee.name : yn(s.hasDesignee), page: "designee" },
      ],
    },
    {
      title: "People in your home",
      overview: `${size} ${size === 1 ? "person" : "people"}`,
      rows: [
        { label: "Household size", value: String(householdSize(s)), page: "people" },
        ...s.people.slice(1).map((p, i) => ({ label: `Person ${i + 2}`, value: `${p.name}, ${p.age}${p.relationship ? `, ${p.relationship}` : ""}`, page: "people" })),
      ],
    },
    {
      title: "Income",
      overview: `${usd(income)} a year from documents`,
      rows: [
        { label: "Your estimate", value: band ? ("hi" in band ? `up to ${usd(band.hi)}` : `over ${usd(band.lo - 1)}`) : "—", page: "income-band" },
        ...adults(s).flatMap((p) => {
          const i = s.people.indexOf(p);
          const docs = incomeDocs(p);
          return [
            {
              label: personLabel(p, i),
              value: docs.length ? docs.map((d) => `${DOC_LABELS[d.docType]} ${money(d.income)}`).join(", ") : p.noIncome ? "No income" : "—",
              page: `income:${p.id}`,
            },
            { label: `${personLabel(p, i)}: filed ${INCOME_YEAR} return`, value: filedTaxReturn(p) ? "Yes" : "No (Form 4988)", page: `filed:${p.id}` },
          ];
        }),
      ],
    },
    {
      title: "Savings and property",
      overview: `${usd(saved)} in accounts`,
      rows: [
        { label: "Accounts", value: s.hasAccounts ? s.accounts.map((a) => `${a.institution || "Account"} ${money(a.balance)}`).join(", ") : yn(s.hasAccounts), page: "accounts" },
        { label: "Other property", value: s.hasOtherProperty ? s.otherProperties.map((p) => p.address).join(", ") : yn(s.hasOtherProperty), page: "other-property" },
        { label: "Vehicles", value: s.hasVehicles ? s.vehicles.map((v) => `${v.year} ${v.make}`.trim()).join(", ") : yn(s.hasVehicles), page: "vehicles" },
        { label: "Life insurance", value: s.hasLifeInsurance ? `${s.policies.length} ${s.policies.length === 1 ? "policy" : "policies"}` : yn(s.hasLifeInsurance), page: "life-insurance" },
      ],
    },
    {
      title: "Debts and expenses",
      overview: `${s.hasDebts ? `${s.debts.length} ${s.debts.length === 1 ? "debt" : "debts"}` : "No debts"} · ${usd(monthly)} a month`,
      rows: [
        { label: "Debts", value: s.hasDebts ? `${s.debts.length}, ${usd(s.debts.reduce((t, d) => t + (num(d.balanceOwed) ?? 0), 0))} owed` : yn(s.hasDebts), page: "debts" },
        { label: "Monthly expenses", value: monthly ? `${usd(monthly)} a month` : "—", page: "expenses" },
        { label: "Statement", value: s.statement || "None", page: "statement" },
      ],
    },
  ];
}

export function sendPage(page: string, { s, set, go }: Ctx): PageSpec | null {
  if (page !== "check-answers") return null;
  return {
    title: "Check your answers before you get your application",
    body: (
      <>
        <p className="text-slate-700">Open a section to see or change your answers.</p>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {summary(s).map((sec) => (
            <details
              key={sec.title}
              className="group"
              // Uncontrolled: React never touches `open`, so re-renders don't collapse what the person opened.
              // The section just edited via a Change link opens once, on mount.
              ref={(el) => {
                if (!el || el.dataset.mounted) return;
                el.dataset.mounted = "1";
                if (sec.title === lastChanged) el.open = true;
                queueMicrotask(() => (lastChanged = null));
              }}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="text-blue-800 transition-transform group-open:rotate-90">▶</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">{sec.title}</span>
                  <span className="block truncate text-sm text-slate-600">{sec.overview}</span>
                </span>
              </summary>
              <dl className="mb-3 divide-y divide-slate-200 border-t border-slate-200 pl-7">
                {sec.rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 py-2 sm:grid-cols-[10rem_1fr_auto]">
                    <dt className="font-medium sm:col-span-1">{r.label}</dt>
                    <dd className="col-start-1 text-slate-700 sm:col-start-2">{r.value}</dd>
                    <dd className="col-start-2 row-span-2 row-start-1 self-start sm:col-start-3">
                      <button
                        type="button"
                        className="text-blue-800 underline"
                        onClick={() => {
                          lastChanged = sec.title;
                          go(r.page);
                        }}
                      >
                        Change<span className="sr-only"> {r.label}</span>
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Policy and guidelines</h2>
          <p>The Board of Review grants HOPE using its 2026 income table and the {usd(12000)} household asset limit you saw at the start. The application asks you to confirm you&apos;ve reviewed them.</p>
          <label className="flex gap-3 rounded-lg border-2 border-slate-300 bg-white p-3">
            <input type="checkbox" className="h-5 w-5 accent-blue-700" checked={s.reviewedGuidelines} onChange={(e) => set({ reviewedGuidelines: e.target.checked })} />
            <span>I have reviewed the 2026 HOPE policy and guidelines, including the income and asset limits.</span>
          </label>
        </section>
      </>
    ),
    validate: () => (s.reviewedGuidelines ? null : "Confirm you have reviewed the policy and guidelines"),
    continueLabel: "Get my filled application",
  };
}
