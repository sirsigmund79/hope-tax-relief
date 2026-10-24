"use client";

import { useEffect, useState, type ReactNode } from "react";
import { packetProgress, type PacketInput, type PacketItem } from "@/lib/packet";
import { HOPE_PDF_PATH, planFill, type ApplicationData } from "@/lib/hopeFields";
import { DEADLINE_LABEL } from "@/lib/config";
import { Button } from "./ui";

function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <article className="relative overflow-hidden rounded-sm border border-slate-300 bg-white p-5 text-[13px] leading-relaxed text-slate-900 shadow-md print:break-after-page print:border-0 print:shadow-none">
      <header className="mb-3 border-b-2 border-slate-800 pb-2">
        <h3 className="text-base font-bold">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-600">{subtitle}</p>}
      </header>
      {children}
    </article>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3 border border-slate-400">
      <h4 className="bg-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase">{title}</h4>
      <div className="px-2 py-1">{children}</div>
    </section>
  );
}

/** A form box: label above, filled value in blue (like ink), or a "you fill" placeholder. */
function Box({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 border-b border-dotted border-slate-300 py-1 last:border-0">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`truncate ${value ? "font-medium text-blue-800" : "text-[11px] italic text-slate-400"}`}>{value || "you fill in"}</div>
    </div>
  );
}

type GenState = { kind: "idle" } | { kind: "working" } | { kind: "ready"; url: string } | { kind: "error" };

export default function PacketView({
  items,
  input,
  application,
}: {
  items: PacketItem[];
  input: PacketInput;
  application: ApplicationData;
}) {
  const { done, total } = packetProgress(items);
  const plan = planFill(application);
  const t = plan.text;
  const [gen, setGen] = useState<GenState>({ kind: "idle" });
  const appKey = JSON.stringify(application);

  // Any change to the answers makes a previously generated PDF stale.
  useEffect(() => {
    setGen((g) => {
      if (g.kind === "ready") URL.revokeObjectURL(g.url);
      return { kind: "idle" };
    });
  }, [appKey]);

  async function generate(open: boolean) {
    setGen({ kind: "working" });
    try {
      const [{ fillHopePdf }, res] = await Promise.all([import("@/lib/hopePdf"), fetch(HOPE_PDF_PATH)]);
      if (!res.ok) throw new Error(`PDF ${res.status}`);
      const bytes = await fillHopePdf(await res.arrayBuffer(), application);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      setGen({ kind: "ready", url });
      const a = document.createElement("a");
      a.href = url;
      if (open) a.target = "_blank";
      else a.download = `2026-HOPE-application-${(application.adults[0]?.name || "draft").replace(/\W+/g, "-")}.pdf`;
      a.click();
    } catch {
      setGen({ kind: "error" });
    }
  }

  const fourEightyEights = [
    ...(plan.applicant4988 ? [application.adults[0].name] : []),
    ...plan.extra4988Names,
  ];
  const incomeRows = ["First", "Second", "Third"].map((o) => ({
    source: t[`${o} source of income`],
    amount: t[`${o} income. Amount. Indicate whether monthly or annual`],
  })).filter((r) => r.source);
  const occupants = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"].map((o, i) => ({
    name: i === 0 ? t["Petitioner's Name"] : t[`${o} household occupant. First and last name`],
    employer: t[`${o} household occupant. Place of employment`],
    contribution: t[`${o} household occupant. Financial contribution to family income`],
  })).filter((r) => r.name);

  const todo = [
    ...(!t["Daytime Phone Number"] ? ["Part 1: daytime phone number"] : []),
    ...(!t["Property Parcel Identification Number"] ? ["Part 2: parcel number (on your tax bill)"] : []),
    "Part 1: ages, marital status, number of legal dependents",
    "Part 2: mortgage company and balance, time at this residence, property description",
    "Part 3: check both boxes (you own it, and it's your homestead). Only you can affirm this",
    "Part 4: any other property anyone in the home owns",
    "Part 7: list each bank account separately (we filled in the total)",
    "Parts 8, 9, 11, 12: life insurance, vehicles, debts, monthly expenses (write N/A if none)",
    `Part 10: ages and relationships${input.householdSize > input.adults.length ? ", and add the children in the home" : ""}`,
    "Part 13: check the policy and guidelines box",
    "Part 15: sign and date",
    ...fourEightyEights.map((n) => `Form 4988: ${n} signs and dates`),
    ...plan.over4988Capacity.map((n) => `Print one more Form 4988 for ${n} (the PDF has room for four)`),
  ];

  const attachments = items.flatMap((i) => (i.attachments ?? []).filter((a) => a.image).map((a) => ({ ...a, owner: i.person })));
  const toBring = items.filter((i) => i.status === "todo" && i.kind !== "application");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 py-3 text-white print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-300">HOPE filing packet</p>
          <p className="font-semibold">{done} of {total} items ready</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>🖨 Print checklist</Button>
      </div>

      <div className="rounded-xl border-2 border-blue-700 bg-blue-50 p-4 print:hidden">
        <h3 className="text-lg font-bold text-blue-950">Your official 2026 HOPE application</h3>
        <p className="mt-1 text-sm text-blue-950">
          The City of Detroit&apos;s own fillable PDF, filled in with your answers: Form 5737
          {fourEightyEights.length > 0 && <>, Form 4988 for {fourEightyEights.join(" and ")}</>}
          {plan.include2368 && <>, Form 2368</>}, and the statement page. It&apos;s made on your phone; nothing is uploaded.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => generate(false)} disabled={gen.kind === "working"}>
            {gen.kind === "working" ? "Filling in…" : "⬇ Download filled PDF"}
          </Button>
          <Button variant="secondary" onClick={() => generate(true)} disabled={gen.kind === "working"}>Open</Button>
        </div>
        {gen.kind === "error" && (
          <p className="mt-2 text-sm text-red-700">
            Couldn&apos;t build the PDF. Try again, or get the blank form at detroitmi.gov/hope and copy the answers below.
          </p>
        )}
        <p className="mt-2 text-xs text-blue-900">Submit by <b>{DEADLINE_LABEL}</b>, in person, online, or by mail.</p>
      </div>

      <Page title="Form 5737 · what we filled in" subtitle="Preview of the official application. Blue = filled in for you. You can still edit every field in the PDF.">
        <Part title="Part 1: Personal information">
          <div className="grid grid-cols-2 gap-x-3">
            <Box label="Petitioner's name" value={t["Petitioner's Name"]} />
            <Box label="Daytime phone" value={t["Daytime Phone Number"]} />
            <Box label="Property address" value={t["Property Address of Principal Residence"]} />
            <Box label="City / State / ZIP" value={[t["Principal Residence City"], t["Principal Residence State"], t["Principle Residence ZIP Code"]].filter(Boolean).join(" ")} />
          </div>
        </Part>
        <Part title="Part 2: Real estate">
          <Box label="Parcel identification number" value={t["Property Parcel Identification Number"]} />
        </Part>
        {t["Name of employer"] && (
          <Part title="Part 5: Employment">
            <Box label="Name of employer" value={t["Name of employer"]} />
          </Part>
        )}
        <Part title="Part 6: Income sources">
          {incomeRows.length ? (
            incomeRows.map((r) => (
              <div key={r.source} className="flex justify-between gap-3 border-b border-dotted border-slate-300 py-1 font-medium text-blue-800 last:border-0">
                <span className="min-w-0 truncate">{r.source}</span><span className="shrink-0">{r.amount}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] italic text-slate-400">No income documents added</p>
          )}
        </Part>
        <Part title="Part 7: Checking, savings, investments">
          <Box label="Amount on deposit (total)" value={t["First item. Amount on deposit"]} />
        </Part>
        <Part title="Part 10: Household occupants">
          {occupants.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-3 border-b border-dotted border-slate-300 py-1 font-medium text-blue-800 last:border-0">
              <span className="min-w-0 truncate">{o.name}{i === 0 && <span className="ml-1 text-[10px] text-slate-500">SELF</span>}{o.employer && <span className="ml-1 text-[11px] font-normal text-slate-600">· {o.employer}</span>}</span>
              <span>{o.contribution}</span>
            </div>
          ))}
        </Part>
        <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wide">Still for you to complete</h4>
        <ul className="mt-1 space-y-1">
          {todo.map((x) => (
            <li key={x} className="flex gap-2"><span aria-hidden>☐</span><span>{x}</span></li>
          ))}
        </ul>
      </Page>

      {(attachments.length > 0 || toBring.length > 0) && (
        <Page title="Attachments" subtitle="Copies of the documents you photographed, plus what to bring.">
          <div className="grid grid-cols-2 gap-3">
            {attachments.map((a) => (
              <figure key={a.image}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt={a.label} className="aspect-[4/3] w-full rounded border border-slate-300 bg-slate-50 object-contain" />
                <figcaption className="mt-1 text-[11px] text-slate-600">{a.owner ? `${a.owner} · ` : ""}{a.label}</figcaption>
              </figure>
            ))}
            {toBring.map((t) => (
              <div key={t.id} className="flex aspect-[4/3] flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 p-2 text-center">
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
