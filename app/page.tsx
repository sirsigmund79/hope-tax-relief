"use client";

import { useMemo, useState } from "react";
import HouseholdForm from "@/components/HouseholdForm";
import DocUploader from "@/components/DocUploader";
import Results from "@/components/Results";
import IllustrativeBanner from "@/components/IllustrativeBanner";
import Requirements from "@/components/Requirements";
import TierTable from "@/components/TierTable";
import EstimateBar from "@/components/EstimateBar";
import PacketTracker from "@/components/PacketTracker";
import { Button, Card } from "@/components/ui";
import { DOC_LABELS, INCOME_DOCS, filedTaxReturn, newId, type AdultState, type DocEntry, type HouseholdState } from "@/components/types";
import type { ApplicationData } from "@/lib/hopeFields";
import { evaluateHousehold, tierTable } from "@/lib/hope";
import { buildPacket, type PacketInput } from "@/lib/packet";
import { num } from "@/lib/format";

type Step = "household" | "docs" | "results";
const STEPS: { key: Step; label: string }[] = [
  { key: "household", label: "Household" },
  { key: "docs", label: "Documents" },
  { key: "results", label: "Packet" },
];

const emptyHousehold: HouseholdState = {
  address: "",
  phone: "",
  email: "",
  parcelNumber: "",
  hardship: false,
  householdSize: "1",
  adultCount: "1",
  liquidAssets: "",
  currentTaxBill: "",
  delinquentAmount: "",
  preExemptionPercent: "100",
  billImage: "",
};

const makeAdult = (i: number): AdultState => ({ id: newId(), name: `Adult ${i + 1}`, docs: [], filedTaxReturn: null });

const SOURCE_LABELS: Record<string, string> = {
  W2: "Wages (W-2)",
  SSA_1099: "Social Security (SSA-1099)",
  PAYSTUB: "Wages (paystubs)",
};

const isIncomeDoc = (d: DocEntry) => d.status === "done" && (d.manual || INCOME_DOCS.includes(d.docType));

export default function Home() {
  const [step, setStep] = useState<Step>("household");
  const [household, setHousehold] = useState<HouseholdState>(emptyHousehold);
  const [adults, setAdults] = useState<AdultState[]>([makeAdult(0)]);
  const [incomeStepStarted, setIncomeStepStarted] = useState(false);

  const size = Math.max(1, Math.floor(num(household.householdSize) ?? 1));
  const adultCount = Math.min(size, Math.max(1, Math.floor(num(household.adultCount) ?? 1)));
  const currentBill = num(household.currentTaxBill);
  const liquidAssets = num(household.liquidAssets);
  const busy = adults.some((a) => a.docs.some((d) => d.status === "loading"));

  // On step 1 the adult slots may not exist yet; preview them so the packet tracker matches the form.
  const visibleAdults = useMemo(
    () => Array.from({ length: adultCount }, (_, i) => adults[i] ?? { id: `preview-${i}`, name: `Adult ${i + 1}`, docs: [], filedTaxReturn: null }),
    [adults, adultCount],
  );

  function goToDocs() {
    // Grow or shrink the adult slots to match the form, keeping existing work.
    setAdults((prev) => Array.from({ length: adultCount }, (_, i) => prev[i] ?? makeAdult(i)));
    setIncomeStepStarted(true);
    setStep("docs");
  }

  const { result, packetInput, packetItems, application } = useMemo(() => {
    const perAdult = visibleAdults.map((a) => {
      const incomes = a.docs.map((d) => num(d.income)).filter((n): n is number => n !== null);
      return {
        name: a.name.trim() || "Unnamed adult",
        income: incomes.length ? incomes.reduce((s, n) => s + n, 0) : null,
        // A doc only counts once it has an amount; an unreadable photo still needs a retake.
        countedDocs: a.docs.filter((d) => isIncomeDoc(d) && num(d.income) !== null),
        filed: filedTaxReturn(a),
        employer: a.docs.find((d) => d.employerName)?.employerName ?? null,
      };
    });
    const result = evaluateHousehold({
      householdSize: size,
      adults: perAdult.map((a) => ({ name: a.name, annualIncome: a.income, filedTaxReturn: a.filed })),
      liquidAssets,
      currentTaxBill: currentBill,
      delinquentAmount: num(household.delinquentAmount),
      preExemptionPercent: num(household.preExemptionPercent),
      hardship: household.hardship,
    });
    const packetInput: PacketInput = {
      address: household.address,
      householdSize: size,
      adults: perAdult.map((a) => ({
        name: a.name,
        income: a.income,
        filedTaxReturn: a.filed,
        docs: a.countedDocs.map((d) => ({
          label: DOC_LABELS[d.docType] + (d.previewUrl ? "" : " (typed in)"),
          image: d.previewUrl,
        })),
      })),
      taxBill: { amount: currentBill, image: household.billImage || undefined },
      incomeStepStarted,
    };
    const needs4988 = new Set(result.flags.flatMap((f) => (f.code === "FORM_4988_NEEDED" ? [f.person] : [])));
    const application: ApplicationData = {
      phone: household.phone,
      email: household.email,
      address: household.address,
      parcelNumber: household.parcelNumber,
      liquidAssets,
      preMissing: result.flags.some((f) => f.code === "PRE_MISSING"),
      adults: perAdult.map((a) => ({
        name: a.name,
        employer: a.employer,
        needs4988: needs4988.has(a.name),
        sources: a.countedDocs.map((d) => ({ label: SOURCE_LABELS[d.docType] ?? DOC_LABELS[d.docType], amount: num(d.income) ?? 0 })),
      })),
    };
    return { result, packetInput, packetItems: buildPacket(packetInput, result), application };
  }, [visibleAdults, household, size, liquidAssets, currentBill, incomeStepStarted]);

  const rows = tierTable(size, currentBill);

  function reset() {
    setHousehold(emptyHousehold);
    setAdults([makeAdult(0)]);
    setIncomeStepStarted(false);
    setStep("household");
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-6 print:max-w-none print:p-0">
      <header className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-900">HOPE Check</h1>
          <p className="text-sm text-slate-600">Detroit property tax relief, in a few photos.</p>
        </div>
        <Button variant="ghost" onClick={reset}>Start over</Button>
      </header>

      <ol className="mb-5 flex gap-2 print:hidden" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-blue-700" : "bg-slate-200"}`} />
            <span className={`mt-1 block text-xs ${i === stepIndex ? "font-semibold text-blue-900" : "text-slate-500"}`}>{s.label}</span>
          </li>
        ))}
      </ol>

      {step === "household" && (
        <div className="space-y-4">
          <Requirements rows={rows} householdSize={size} />
          <HouseholdForm value={household} onChange={(p) => setHousehold((h) => ({ ...h, ...p }))} />
          <Card>
            <h2 className="text-lg font-semibold">What you could save</h2>
            <p className="mb-3 mt-1 text-sm text-slate-600">
              {currentBill === null ? "Enter your tax bill above to see dollar amounts." : "Find your household income in the middle column."}
            </p>
            <TierTable rows={rows} householdSize={size} />
          </Card>
          <PacketTracker items={packetItems} />
          <IllustrativeBanner />
          <p className="text-center text-xs text-slate-500">
            Trying it out? Use the <a href="/samples" className="underline">sample documents</a>.
          </p>
        </div>
      )}

      {step === "docs" && (
        <div className="space-y-4">
          <EstimateBar result={result} currentBill={currentBill} />
          <p className="text-sm text-slate-700">
            Add a photo of each adult&apos;s income document: W-2, SSA-1099 (Social Security), or a recent paystub. You can edit anything we read.
          </p>
          {adults.map((a, i) => (
            <DocUploader
              key={a.id}
              adult={a}
              index={i}
              onChange={(update) => setAdults((prev) => prev.map((x) => (x.id === a.id ? update(x) : x)))}
            />
          ))}
          <PacketTracker items={packetItems} />
        </div>
      )}

      {step === "results" && (
        <Results
          result={result}
          currentBill={currentBill}
          householdSize={size}
          packetItems={packetItems}
          packetInput={packetInput}
          application={application}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-md gap-3">
          {step !== "household" && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep(step === "results" ? "docs" : "household")}>
              Back
            </Button>
          )}
          {step === "household" && <Button className="flex-1" onClick={goToDocs}>Next: income documents</Button>}
          {step === "docs" && (
            <Button className="flex-1" disabled={busy} onClick={() => setStep("results")}>
              {busy ? "Reading documents…" : "See my packet"}
            </Button>
          )}
          {step === "results" && <Button className="flex-1" onClick={reset}>Start over</Button>}
        </div>
      </nav>
    </main>
  );
}
