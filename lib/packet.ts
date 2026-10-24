import type { Evaluation } from "./hope";

// What goes in the HOPE filing packet, and how far along each piece is.
// "ready" = we have it, "prefilled" = drafted for you, needs review + signature, "todo" = you still need to bring/do it.
export type PacketStatus = "ready" | "prefilled" | "todo";

export type PacketItem = {
  id: string;
  kind: "application" | "id" | "income" | "form4988" | "form2368" | "taxbill";
  title: string;
  detail: string;
  status: PacketStatus;
  person?: string;
  attachments?: { label: string; image?: string }[];
};

export type PacketAdult = {
  name: string;
  income: number | null;
  docs: { label: string; image?: string }[];
};

export type PacketInput = {
  address: string;
  adults: PacketAdult[];
  taxBill: { amount: number | null; image?: string };
  // False until the user reaches the documents step; until then nobody is "missing" a document yet.
  incomeStepStarted: boolean;
};

export function buildPacket(input: PacketInput, evaluation: Evaluation): PacketItem[] {
  const needs4988 = new Set(
    evaluation.flags.flatMap((f) => (f.code === "FORM_4988_NEEDED" ? [f.person] : [])),
  );
  const items: PacketItem[] = [];

  items.push({
    id: "application",
    kind: "application",
    title: "HOPE application",
    detail: input.address.trim()
      ? "Pre-filled from your answers. Review it and sign."
      : "Add your home address to finish pre-filling it.",
    status: input.address.trim() ? "prefilled" : "todo",
  });

  items.push({
    id: "id",
    kind: "id",
    title: "Photo ID",
    detail: `Bring a photo ID for each adult (${input.adults.length}).`,
    status: "todo",
  });

  input.adults.forEach((a, i) => {
    if (!input.incomeStepStarted && a.docs.length === 0) {
      items.push({
        id: `income-${i}`,
        kind: "income",
        person: a.name,
        title: `Proof of income: ${a.name}`,
        detail: "Add on the next step (or we'll draft Form 4988 if they have no income).",
        status: "todo",
      });
    } else if (needs4988.has(a.name)) {
      items.push({
        id: `4988-${i}`,
        kind: "form4988",
        person: a.name,
        title: `Form 4988 for ${a.name}`,
        detail: "No income document. Drafted for you: if they truly have no income, they sign this affidavit.",
        status: "prefilled",
      });
    } else {
      items.push({
        id: `income-${i}`,
        kind: "income",
        person: a.name,
        title: `Proof of income: ${a.name}`,
        detail: a.docs.map((d) => d.label).join(", ") || "Entered by hand. Bring the document.",
        status: a.docs.some((d) => d.image) ? "ready" : "todo",
        attachments: a.docs,
      });
    }
  });

  if (evaluation.flags.some((f) => f.code === "PRE_MISSING")) {
    items.push({
      id: "2368",
      kind: "form2368",
      title: "Form 2368 (Principal Residence Exemption)",
      detail: "Your bill shows less than 100% PRE. Drafted for you to review and sign.",
      status: "prefilled",
    });
  }

  items.push({
    id: "taxbill",
    kind: "taxbill",
    title: "Property tax bill",
    detail: input.taxBill.image
      ? "Scanned."
      : "Bring your most recent bill (or scan it on the first step).",
    status: input.taxBill.image ? "ready" : "todo",
    attachments: input.taxBill.image ? [{ label: "Tax bill", image: input.taxBill.image }] : undefined,
  });

  return items;
}

export function packetProgress(items: PacketItem[]) {
  const done = items.filter((i) => i.status !== "todo").length;
  return { done, total: items.length };
}
