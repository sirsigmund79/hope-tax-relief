"use client";

import type { ReactNode } from "react";
import type { Evaluation } from "@/lib/hope";
import { packetProgress, type PacketInput, type PacketItem } from "@/lib/packet";
import { usd } from "@/lib/format";
import { Button } from "./ui";

function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <article className="relative overflow-hidden rounded-sm border border-slate-300 bg-white p-5 font-serif text-[13px] leading-relaxed text-slate-900 shadow-md print:break-after-page print:border-0 print:shadow-none">
      <span className="pointer-events-none absolute right-3 top-3 rotate-[-6deg] rounded border-2 border-blue-400/70 px-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-blue-500/80">
        Draft · pre-filled
      </span>
      <header className="mb-3 border-b-2 border-slate-800 pb-2 pr-24">
        <h3 className="font-sans text-base font-bold">{title}</h3>
        {subtitle && <p className="font-sans text-[11px] text-slate-600">{subtitle}</p>}
      </header>
      {children}
    </article>
  );
}

function Line({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-end gap-2 py-1">
      <span className="shrink-0 font-sans text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="min-h-[1.4em] flex-1 border-b border-dotted border-slate-400 font-medium">
        {value || <span className="text-slate-300">&nbsp;</span>}
      </span>
    </div>
  );
}

function Sign({ who }: { who: string }) {
  return (
    <div className="mt-4 grid grid-cols-[2fr_1fr] gap-4 font-sans text-[11px] text-slate-500">
      <div className="border-t border-slate-800 pt-1">Signature: {who}</div>
      <div className="border-t border-slate-800 pt-1">Date</div>
    </div>
  );
}

export default function PacketView({
  items,
  input,
  householdSize,
  liquidAssets,
  result,
}: {
  items: PacketItem[];
  input: PacketInput;
  householdSize: number;
  liquidAssets: number | null;
  result: Evaluation;
}) {
  const { done, total } = packetProgress(items);
  const applicant = input.adults[0]?.name ?? "";
  const year = new Date().getFullYear();
  const attachments = items.flatMap((i) => (i.attachments ?? []).filter((a) => a.image).map((a) => ({ ...a, owner: i.person })));
  const toBring = items.filter((i) => i.status === "todo" && i.kind !== "application");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 py-3 text-white print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-300">HOPE filing packet</p>
          <p className="font-semibold">{done} of {total} items ready</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>🖨 Print / save</Button>
      </div>

      <Page title={`HOPE Application · ${year}`} subtitle="Homeowners Property Exemption · Copy these answers onto the official City of Detroit form.">
        <h4 className="mt-1 font-sans text-[11px] font-bold uppercase tracking-wide">1. Applicant & property</h4>
        <Line label="Applicant" value={applicant} />
        <Line label="Property address" value={input.address} />
        <Line label="Parcel no." value={<span className="text-slate-400">from your tax bill</span>} />
        <Line label="Phone" />
        <Line label="Owner-occupied" value="Yes, principal residence" />

        <h4 className="mt-4 font-sans text-[11px] font-bold uppercase tracking-wide">2. Household</h4>
        <Line label="People in home" value={String(householdSize)} />
        <table className="mt-2 w-full border-collapse text-left">
          <thead className="font-sans text-[10px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-400">
              <th className="py-1 font-semibold">Adult</th>
              <th className="py-1 font-semibold">Income source</th>
              <th className="py-1 text-right font-semibold">Annual income</th>
            </tr>
          </thead>
          <tbody>
            {input.adults.map((a) => (
              <tr key={a.name} className="border-b border-dotted border-slate-300">
                <td className="py-1">{a.name}</td>
                <td className="py-1">{a.docs.map((d) => d.label).join(", ") || "None (Form 4988)"}</td>
                <td className="py-1 text-right font-mono">{usd(a.income ?? 0)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-1" colSpan={2}>Total household income</td>
              <td className="py-1 text-right font-mono">{usd(result.totalIncome)}</td>
            </tr>
          </tbody>
        </table>

        <h4 className="mt-4 font-sans text-[11px] font-bold uppercase tracking-wide">3. Assets</h4>
        <Line label="Cash & savings" value={usd(liquidAssets ?? 0)} />

        <h4 className="mt-4 font-sans text-[11px] font-bold uppercase tracking-wide">4. Attached</h4>
        <ul className="list-inside list-disc">
          {items.filter((i) => i.kind !== "application").map((i) => (
            <li key={i.id}>{i.title}{i.status === "todo" && <span className="font-sans text-[11px] text-amber-700"> (still needed)</span>}</li>
          ))}
        </ul>

        <p className="mt-4 text-[12px]">
          I certify that the information above is true and complete, and that this home is my principal residence.
        </p>
        {input.adults.map((a) => <Sign key={a.name} who={a.name} />)}
      </Page>

      {items.filter((i) => i.kind === "form4988").map((i) => (
        <Page key={i.id} title="Form 4988 · Poverty Exemption Affidavit" subtitle="Worksheet for an adult with no income. Transfer to the official State of Michigan form.">
          <Line label="Name" value={i.person} />
          <Line label="Property address" value={input.address} />
          <Line label="Tax year" value={String(year)} />
          <p className="mt-3">
            I, <b>{i.person}</b>, live at the property above and state that I have no income to report for the year, and
            did not file a federal or state income tax return because I was not required to.
          </p>
          <Sign who={i.person ?? ""} />
        </Page>
      ))}

      {items.some((i) => i.kind === "form2368") && (
        <Page title="Form 2368 · Principal Residence Exemption Affidavit" subtitle="Worksheet. Transfer to the official State of Michigan form.">
          <Line label="Owner" value={applicant} />
          <Line label="Property address" value={input.address} />
          <Line label="Parcel no." value={<span className="text-slate-400">from your tax bill</span>} />
          <Line label="Exemption claimed" value="100%" />
          <p className="mt-3">I own and occupy this property as my principal residence.</p>
          <Sign who={applicant} />
        </Page>
      )}

      {(attachments.length > 0 || toBring.length > 0) && (
        <Page title="Attachments" subtitle="Copies of the documents you photographed, plus what to bring.">
          <div className="grid grid-cols-2 gap-3">
            {attachments.map((a) => (
              <figure key={a.image} className="font-sans">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt={a.label} className="aspect-[4/3] w-full rounded border border-slate-300 bg-slate-50 object-contain" />
                <figcaption className="mt-1 text-[11px] text-slate-600">{a.owner ? `${a.owner} · ` : ""}{a.label}</figcaption>
              </figure>
            ))}
            {toBring.map((t) => (
              <div key={t.id} className="flex aspect-[4/3] flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 p-2 text-center font-sans">
                <span className="text-xs font-semibold text-slate-700">{t.title}</span>
                <span className="mt-1 text-[11px] text-slate-500">{t.detail}</span>
              </div>
            ))}
          </div>
        </Page>
      )}
    </section>
  );
}
