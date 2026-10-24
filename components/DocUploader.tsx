"use client";

import { useRef } from "react";
import { extractFile } from "@/lib/extractClient";
import type { DocType, ExtractResult } from "@/lib/schema";
import { Button, Card, ConfidenceBadge } from "./ui";
import { DOC_LABELS, INCOME_DOCS, newId, type AdultState, type DocEntry } from "./types";

export function UploadButton({
  onFile,
  children,
  variant = "secondary",
  disabled,
}: {
  onFile: (f: File) => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
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
      <Button variant={variant} disabled={disabled} onClick={() => ref.current?.click()}>
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
      id,
      filename,
      status: "done",
      manual: false,
      docType: d.docType,
      income: d.annualIncome === null ? "" : String(d.annualIncome),
      personName: d.personName,
      confidence: d.confidence,
      previewUrl,
      issues: notIncome
        ? [...d.issues, `This looks like a ${DOC_LABELS[d.docType].toLowerCase()}, not an income document.`]
        : d.issues,
      mock: r.mock,
    };
  }
  const p = r.partial;
  return {
    id,
    filename,
    status: "done",
    manual: true,
    docType: p.docType ?? "W2",
    income: p.annualIncome == null ? "" : String(p.annualIncome),
    personName: p.personName ?? null,
    confidence: null,
    issues: p.issues ?? [],
    failedReason: r.reason,
    previewUrl,
  };
}

const needsRetake = (d: DocEntry) =>
  d.confidence === "low" || (INCOME_DOCS.includes(d.docType) && d.income === "" && !d.manual);

export default function DocUploader({
  adult,
  index,
  onChange,
}: {
  adult: AdultState;
  index: number;
  onChange: (update: (a: AdultState) => AdultState) => void;
}) {
  const setDoc = (id: string, patch: Partial<DocEntry>) =>
    onChange((a) => ({ ...a, docs: a.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));

  async function upload(file: File, replaceId?: string) {
    const id = replaceId ?? newId();
    const loading: DocEntry = {
      id,
      filename: file.name,
      status: "loading",
      manual: false,
      docType: "OTHER",
      income: "",
      personName: null,
      confidence: null,
      issues: [],
    };
    onChange((a) => ({
      ...a,
      docs: replaceId ? a.docs.map((d) => (d.id === id ? loading : d)) : [...a.docs, loading],
    }));
    const result = await extractFile(file);
    const previewUrl = URL.createObjectURL(file);
    onChange((a) => {
      const entry = entryFromResult(id, file.name, result, previewUrl);
      // Fill the adult's name from the document if they left the default.
      const name = /^Adult \d+$/.test(a.name) && entry.personName ? entry.personName : a.name;
      return { ...a, name, docs: a.docs.map((d) => (d.id === id ? entry : d)) };
    });
  }

  function addManual() {
    onChange((a) => ({
      ...a,
      docs: [
        ...a.docs,
        { id: newId(), filename: "", status: "done", manual: true, docType: "W2", income: "", personName: null, confidence: null, issues: [] },
      ],
    }));
  }

  return (
    <Card>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adult {index + 1}</span>
        <input
          value={adult.name}
          onChange={(e) => onChange((a) => ({ ...a, name: e.target.value }))}
          className="mt-1 block w-full border-b border-slate-300 bg-transparent pb-1 text-lg font-semibold focus:border-blue-600 focus:outline-none"
          aria-label={`Adult ${index + 1} name`}
        />
      </label>

      <div className="mt-3 space-y-3">
        {adult.docs.map((d) =>
          d.status === "loading" ? (
            <div key={d.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Reading {d.filename || "document"}…
            </div>
          ) : (
            <div key={d.id} className="rounded-lg border border-slate-200 p-3">
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
                  {Object.entries(DOC_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {d.confidence && <ConfidenceBadge level={d.confidence} />}
                {d.manual && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">manual entry</span>}
                {d.mock && <span className="text-xs text-slate-400">demo data</span>}
              </div>

              {d.failedReason && (
                <p className="mt-2 text-sm text-red-700">
                  {d.failedReason}. Please type the amount from the document below.
                </p>
              )}

              <label className="mt-2 block">
                <span className="text-xs text-slate-600">
                  Annual income {d.docType === "W2" ? "(Box 1)" : d.docType === "SSA_1099" ? "(Box 5)" : ""}
                </span>
                <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:ring-2 focus-within:ring-blue-200">
                  <span className="text-slate-500">$</span>
                  <input
                    inputMode="decimal"
                    value={d.income}
                    placeholder="0"
                    onChange={(e) => setDoc(d.id, { income: e.target.value })}
                    className="w-full bg-transparent px-1 py-2 text-lg font-semibold focus:outline-none"
                  />
                </div>
              </label>

              {d.issues.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {d.issues.map((i, n) => <li key={n}>⚠ {i}</li>)}
                </ul>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {d.filename && (
                  <UploadButton variant={needsRetake(d) ? "primary" : "ghost"} onFile={(f) => upload(f, d.id)}>
                    {needsRetake(d) ? "Retake photo" : "Replace photo"}
                  </UploadButton>
                )}
                <Button variant="ghost" onClick={() => onChange((a) => ({ ...a, docs: a.docs.filter((x) => x.id !== d.id) }))}>
                  Remove
                </Button>
              </div>
            </div>
          ),
        )}

        {adult.docs.length === 0 && (
          <p className="text-sm text-slate-500">
            No income documents? That's OK. We'll flag a Form 4988 for this person.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <UploadButton variant="primary" onFile={(f) => upload(f)}>
            📷 Add income document
          </UploadButton>
          <Button variant="secondary" onClick={addManual}>Use manual entry</Button>
        </div>
      </div>
    </Card>
  );
}
