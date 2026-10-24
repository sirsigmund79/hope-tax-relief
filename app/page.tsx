"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applicationData, evaluate, householdSize, initialState, packetInput, type AppState } from "@/lib/application";
import { SECTIONS, firstPage, nextPage, sectionOf, type SectionId } from "@/lib/flow";
import { buildPacket } from "@/lib/packet";
import { num } from "@/lib/format";
import { QuestionPage } from "@/components/form";
import StartPage from "@/components/StartPage";
import TaskList from "@/components/TaskList";
import EstimateBar from "@/components/EstimateBar";
import PacketTracker from "@/components/PacketTracker";
import Results from "@/components/Results";
import IllustrativeBanner from "@/components/IllustrativeBanner";
import { Button } from "@/components/ui";
import type { Ctx, PageSpec } from "@/components/pages/shared";
import { checkPage } from "@/components/pages/check";
import { householdPage, seedPeople, syncHouseholdSize } from "@/components/pages/household";
import { moneyPage } from "@/components/pages/money";
import { sendPage } from "@/components/pages/send";

const STORAGE_KEY = "hope-check:v2";

// Answers survive a refresh in this tab (sessionStorage), but photos don't: object URLs die with the page.
function forStorage(s: AppState): AppState {
  return { ...s, billImage: "", people: s.people.map((p) => ({ ...p, docs: p.docs.filter((d) => d.status === "done").map(({ previewUrl: _, ...d }) => d) })) };
}

// Pages that only exist because of a "yes": after a Change link, continue into them before returning.
const isFollowUp = (page: string) => /-(details|list)$/.test(page) || page === "hardship" || page === "pre-elsewhere";

export default function Home() {
  const [s, setS] = useState<AppState>(initialState);
  const [view, setView] = useState("start");
  const [history, setHistory] = useState<string[]>([]);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<AppState | null>(null);
  const heading = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setSaved({ ...initialState(), ...JSON.parse(raw) });
    } catch {
      /* private mode or blocked storage: start fresh */
    }
  }, []);
  useEffect(() => {
    if (view === "start") return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(forStorage(s)));
    } catch {
      /* ignore */
    }
  }, [s, view]);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.querySelector("h1")?.focus();
  }, [view]);

  const set = (patch: Partial<AppState>) => setS((st) => ({ ...st, ...patch }));
  const update = (fn: (st: AppState) => AppState) => setS(fn);

  function go(page: string, opts: { push?: boolean } = {}) {
    setError(null);
    if (opts.push !== false) setHistory((h) => [...h, view]);
    if (view === "check-answers" && page !== "results") setReturnTo("check-answers");
    if (page === "people") setS(seedPeople);
    setView(page);
  }
  function back() {
    setError(null);
    setHistory((h) => {
      const prev = h.at(-1) ?? "start";
      setView(prev);
      return h.slice(0, -1);
    });
  }
  function openSection(id: SectionId) {
    setReturnTo(null);
    go(firstPage(s, id));
  }

  const ctx: Ctx = { s, set, update, go };
  const spec: PageSpec | null = checkPage(view, ctx) ?? householdPage(view, ctx) ?? moneyPage(view, ctx) ?? sendPage(view, ctx);

  function onContinue() {
    const err = spec?.validate?.() ?? null;
    if (err) return setError(err);
    let next = nextPage(s, view);
    if (view === "people") setS(syncHouseholdSize);
    if (returnTo && !(isFollowUp(next) && sectionOf(s, next) === sectionOf(s, view))) {
      next = returnTo;
      setReturnTo(null);
    }
    // Finishing a section's last page marks it done on the task list.
    const section = sectionOf(s, view);
    if ((next === "tasks" || next === "results" || next === "check-answers") && section) {
      setS((st) => (st.completed.includes(section) ? st : { ...st, completed: [...st.completed, section] }));
    }
    go(next);
  }

  const derived = useMemo(() => {
    const result = evaluate(s);
    const pInput = packetInput(s, s.completed.includes("people") || s.completed.includes("income"));
    return { result, pInput, items: buildPacket(pInput, result), application: applicationData(s, result) };
  }, [s]);

  const section = sectionOf(s, view);
  const sectionTitle = section ? SECTIONS.find((x) => x.id === section)?.title : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-16 pt-4 print:max-w-none print:p-0">
      <header className="mb-6 flex items-center justify-between border-b-4 border-blue-800 pb-2 print:hidden">
        <button type="button" className="text-lg font-extrabold text-blue-900" onClick={() => go("start")}>HOPE Check</button>
        {view !== "start" && view !== "tasks" && !view.startsWith("stop-") && s.completed.includes("check") && (
          <button type="button" className="text-sm text-blue-800 underline" onClick={() => go("tasks")}>Your application</button>
        )}
      </header>

      <div ref={heading} className="[&_h1]:outline-none" tabIndex={-1}>
        {view === "start" && (
          <StartPage
            onStart={() => { setS(initialState()); setHistory([]); go(firstPage(initialState(), "check")); }}
            resume={saved ? () => { setS(saved); setSaved(null); go(saved.completed.includes("check") ? "tasks" : "own-home"); } : undefined}
          />
        )}

        {view === "tasks" && (
          <div className="space-y-6">
            <EstimateBar result={derived.result} currentBill={num(s.currentTaxBill)} />
            <TaskList s={s} onOpen={openSection} />
            <PacketTracker items={derived.items} />
          </div>
        )}

        {view === "results" && (
          <div className="space-y-4">
            <button type="button" onClick={back} className="text-sm text-blue-800 underline print:hidden">‹ Back</button>
            <Results
              result={derived.result}
              currentBill={num(s.currentTaxBill)}
              householdSize={householdSize(s)}
              packetItems={derived.items}
              packetInput={derived.pInput}
              application={derived.application}
            />
          </div>
        )}

        {spec && (
          <QuestionPage
            caption={sectionTitle}
            title={spec.title}
            hint={spec.hint}
            error={error}
            onBack={back}
            onContinue={spec.noContinue ? undefined : onContinue}
            continueLabel={spec.continueLabel}
          >
            {spec.body}
          </QuestionPage>
        )}

        {!spec && !["start", "tasks", "results"].includes(view) && (
          <div className="space-y-3">
            <p>That page isn&apos;t available any more.</p>
            <Button onClick={() => go("tasks")}>Go to your application</Button>
          </div>
        )}
      </div>

      <div className="mt-10 print:hidden"><IllustrativeBanner /></div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Trying it out? Use the <a href="/samples" className="underline">sample documents</a>.
      </p>
    </main>
  );
}
