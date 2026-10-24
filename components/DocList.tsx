"use client";

import { useRef } from "react";
import { extractFile } from "@/lib/extractClient";
import type { DocType, ExtractResult } from "@/lib/schema";
import { INCOME_DOCS, newId, type DocEntry } from "@/lib/application";
import { Button, ConfidenceBadge } from "./ui";

export const DOC_LABELS: Record<DocType, string> = {
  W2: "W-2",
  SSA_1099: "SSA-1099",
  PAYSTUB: "Paystub",
  TAX_BILL: "Tax bill",
  BANK_STATEMENT: "Bank statement",
  MORTGAGE_STATEMENT: "Mortgage statement",
  OTHER: "Other document",
};

export function UploadButton({
  onFile,
  children,
  variant = "secondary",
  disabled,
  className,
}: {
  onFile: (f: File) => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <Button variant={variant} disabled={disabled} className={className} onClick={() => ref.current?.click()}>
        {children}
      </Button>
    </>
  );
}

function entryFromResult(id: string, filename: string, r: ExtractResult, previewUrl: string): DocEntry {
  if (r.ok) {
    const d = r.data;
    const notIncome = !INCOME_DOCS.includes(d.docType);
    return {
      id, filename, status: "done", manual: false, previewUrl, mock: r.mock,
      docType: d.docType,
      income: d.annualIncome === null ? "" : String(d.annualIncome),
      personName: d.personName,
      employerName: d.employerName,
      employerAddress: d.employerAddress,
      confidence: d.confidence,
      issues: notIncome ? [...d.issues, `This looks like a ${DOC_LABELS[d.docType].toLowerCase()}, not an income document.`] : d.issues,
    };
  }
  const p = r.partial;
  return {
    id, filename, status: "done", manual: true, previewUrl, failedReason: r.reason,
    docType: p.docType ?? "W2",
    income: p.annualIncome == null ? "" : String(p.annualIncome),
    personName: p.personName ?? null,
    employerName: p.employerName ?? null,
    employerAddress: p.employerAddress ?? null,
    confidence: null,
    issues: p.issues ?? [],
  };
}

const blank = (id: string, filename: string, status: DocEntry["status"], manual: boolean): DocEntry => ({
  id, filename, status, manual, docType: manual ? "W2" : "OTHER", income: "", personName: null,
  employerName: null, employerAddress: null, confidence: null, issues: [],
});

const needsRetake = (d: DocEntry) =>
  d.confidence === "low" || (INCOME_DOCS.includes(d.docType) && d.income === "" && !d.manual);

/** Income documents for one person: photo → read → editable card, with retake and manual entry. */
export default function DocList({
  docs,
  onChange,
}: {
  docs: DocEntry[];
  onChange: (update: (docs: DocEntry[]) => DocEntry[]) => void;
}) {
  const setDoc = (id: string, patch: Partial<DocEntry>) => onChange((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  async function upload(file: File, replaceId?: string) {
    const id = replaceId ?? newId();
    const loading = blank(id, file.name, "loading", false);
    onChange((ds) => (replaceId ? ds.map((d) => (d.id === id ? loading : d)) : [...ds, loading]));
    const result = await extractFile(file);
    const entry = entryFromResult(id, file.name, result, URL.createObjectURL(file));
    onChange((ds) => ds.map((d) => (d.id === id ? entry : d)));
  }

  return (
    <div className="space-y-3">
      {docs.map((d) =>
        d.status === "loading" ? (
          <div key={d.id} className="flex items-center gap-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
            Reading {d.filename || "document"}…
          </div>
        ) : (
          <div key={d.id} className="rounded-lg border border-slate-300 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              {d.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.previewUrl} alt="" className="h-10 w-10 rounded border border-slate-200 object-cover" />
              )}
              <select
                value={d.docType}
                onChange={(e) => setDoc(d.id, { docType: e.target.value as DocType })}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium"
                aria-label="Document type"
              >
                {INCOME_DOCS.concat("OTHER").map((k) => <option key={k} value={k}>{DOC_LABELS[k]}</option>)}
              </select>
              {d.confidence && <ConfidenceBadge level={d.confidence} />}
              {d.manual && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">typed in</span>}
              {d.mock && <span className="text-xs text-slate-400">demo data</span>}
            </div>
            {d.failedReason && <p className="mt-2 text-sm text-red-700">{d.failedReason}. Please type the amount from the document.</p>}
            <label className="mt-2 block">
              <span className="text-sm text-slate-700">
                Yearly income {d.docType === "W2" ? "(Box 1)" : d.docType === "SSA_1099" ? "(Box 5)" : ""}
              </span>
              <div className="mt-1 flex items-center rounded-lg border-2 border-slate-400 bg-white px-3 focus-within:border-blue-700">
                <span className="text-slate-500">$</span>
                <input
                  inputMode="decimal"
                  value={d.income}
                  placeholder="0"
                  onChange={(e) => setDoc(d.id, { income: e.target.value })}
                  className="w-full bg-transparent px-1 py-2 text-lg font-semibold focus:outline-none"
                  aria-label="Yearly income"
                />
              </div>
            </label>
            {d.employerName && <p className="mt-1 text-sm text-slate-600">Employer: {d.employerName}</p>}
            {d.issues.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-amber-800">{d.issues.map((i, n) => <li key={n}>⚠ {i}</li>)}</ul>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {d.filename && (
                <UploadButton variant={needsRetake(d) ? "primary" : "ghost"} onFile={(f) => upload(f, d.id)}>
                  {needsRetake(d) ? "Retake photo" : "Replace photo"}
                </UploadButton>
              )}
              <Button variant="ghost" onClick={() => onChange((ds) => ds.filter((x) => x.id !== d.id))}>Remove</Button>
            </div>
          </div>
        ),
      )}
      <div className="flex flex-wrap gap-2">
        <UploadButton variant="primary" onFile={(f) => upload(f)}>📷 {docs.length ? "Add another document" : "Take or choose a photo"}</UploadButton>
        <Button variant="secondary" onClick={() => onChange((ds) => [...ds, blank(newId(), "", "done", true)])}>Type it in instead</Button>
      </div>
    </div>
  );
}
