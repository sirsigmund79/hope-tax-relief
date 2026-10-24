"use client";

import { useMemo, useState } from "react";
import HouseholdForm from "@/components/HouseholdForm";
import DocUploader from "@/components/DocUploader";
import Results from "@/components/Results";
import IllustrativeBanner from "@/components/IllustrativeBanner";
import { Button } from "@/components/ui";
import { INCOME_DOCS, newId, type AdultState, type HouseholdState } from "@/components/types";
import { evaluateHousehold } from "@/lib/hope";
import { num } from "@/lib/format";

type Step = "household" | "docs" | "results";
const STEPS: { key: Step; label: string }[] = [
  { key: "household", label: "Household" },
  { key: "docs", label: "Income" },
  { key: "results", label: "Results" },
];

const emptyHousehold: HouseholdState = {
  address: "",
  householdSize: "1",
  adultCount: "1",
  liquidAssets: "",
  currentTaxBill: "",
  delinquentAmount: "",
  preExemptionPercent: "100",
};

const makeAdult = (i: number): AdultState => ({ id: newId(), name: `Adult ${i + 1}`, docs: [] });

export default function Home() {
  const [step, setStep] = useState<Step>("household");
  const [household, setHousehold] = useState<HouseholdState>(emptyHousehold);
  const [adults, setAdults] = useState<AdultState[]>([makeAdult(0)]);

  const size = Math.max(1, Math.floor(num(household.householdSize) ?? 1));
  const adultCount = Math.min(size, Math.max(1, Math.floor(num(household.adultCount) ?? 1)));
  const busy = adults.some((a) => a.docs.some((d) => d.status === "loading"));

  function goToDocs() {
    // Grow or shrink the adult slots to match the form, keeping existing work.
    setAdults((prev) =>
      Array.from({ length: adultCount }, (_, i) => prev[i] ?? makeAdult(i)),
    );
    setStep("docs");
  }

  const result = useMemo(
    () =>
      evaluateHousehold({
        householdSize: size,
        adults: adults.map((a) => {
          const incomes = a.docs.map((d) => num(d.income)).filter((n): n is number => n !== null);
          return {
            name: a.name.trim() || "Unnamed adult",
            annualIncome: incomes.length ? incomes.reduce((s, n) => s + n, 0) : null,
            // A doc only counts once it has an amount; an unreadable photo still needs a retake or Form 4988.
            hasIncomeDoc: a.docs.some(
              (d) => d.status === "done" && (d.manual || INCOME_DOCS.includes(d.docType)) && num(d.income) !== null,
            ),
          };
        }),
        liquidAssets: num(household.liquidAssets),
        currentTaxBill: num(household.currentTaxBill),
        delinquentAmount: num(household.delinquentAmount),
        preExemptionPercent: num(household.preExemptionPercent),
      }),
    [adults, household, size],
  );

  function reset() {
    setHousehold(emptyHousehold);
    setAdults([makeAdult(0)]);
    setStep("household");
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-900">HOPE Check</h1>
          <p className="text-sm text-slate-600">Detroit property tax relief, in a few photos.</p>
        </div>
        <Button variant="ghost" onClick={reset}>Start over</Button>
      </header>

      <ol className="mb-5 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-blue-700" : "bg-slate-200"}`} />
            <span className={`mt-1 block text-xs ${i === stepIndex ? "font-semibold text-blue-900" : "text-slate-500"}`}>{s.label}</span>
          </li>
        ))}
      </ol>

      {step === "household" && (
        <>
          <HouseholdForm value={household} onChange={(p) => setHousehold((h) => ({ ...h, ...p }))} />
          <div className="mt-4 space-y-3">
            <IllustrativeBanner />
            <p className="text-center text-xs text-slate-500">
              Trying it out? Use the <a href="/samples" className="underline">sample documents</a>.
            </p>
          </div>
        </>
      )}

      {step === "docs" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Add a photo of each adult's income document: W-2, SSA-1099 (Social Security), or a recent paystub. You can edit anything we read.
          </p>
          {adults.map((a, i) => (
            <DocUploader
              key={a.id}
              adult={a}
              index={i}
              onChange={(update) => setAdults((prev) => prev.map((x) => (x.id === a.id ? update(x) : x)))}
            />
          ))}
        </div>
      )}

      {step === "results" && <Results result={result} address={household.address} currentBill={num(household.currentTaxBill)} />}

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          {step !== "household" && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep(step === "results" ? "docs" : "household")}>
              Back
            </Button>
          )}
          {step === "household" && <Button className="flex-1" onClick={goToDocs}>Next: income documents</Button>}
          {step === "docs" && (
            <Button className="flex-1" disabled={busy} onClick={() => setStep("results")}>
              {busy ? "Reading documents…" : "See my results"}
            </Button>
          )}
          {step === "results" && <Button className="flex-1" onClick={reset}>Start over</Button>}
        </div>
      </nav>
    </main>
  );
}
