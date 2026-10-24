import type { Evaluation } from "./hope";
import { INCOME_YEAR } from "./config";

// What goes in the HOPE filing packet (per the 2026 application's documentation checklist),
// and how far along each piece is.
// "ready" = we have it, "prefilled" = drafted for you, needs review + signature, "todo" = you still need to bring/do it.
export type PacketStatus = "ready" | "prefilled" | "todo";

export type PacketItem = {
  id: string;
  kind: "application" | "ownership" | "id" | "income" | "taxreturn" | "form4988" | "minors" | "form2368" | "taxbill";
  title: string;
  detail: string;
  status: PacketStatus;
  person?: string;
  attachments?: { label: string; image?: string }[];
};

export type PacketAdult = {
  name: string;
  income: number | null;
  filedTaxReturn: boolean;
  docs: { label: string; image?: string }[];
};

export type PacketInput = {
  address: string;
  householdSize: number;
  adults: PacketAdult[];
  taxBill: { amount: number | null; image?: string };
  // False until the user reaches the documents step; until then nobody is "missing" a document yet.
  incomeStepStarted: boolean;
};

export function buildPacket(input: PacketInput, evaluation: Evaluation): PacketItem[] {
  const needs4988 = new Set(
    evaluation.flags.flatMap((f) => (f.code === "FORM_4988_NEEDED" ? [f.person] : [])),
  );
  const hasAddress = input.address.trim() !== "";
  const items: PacketItem[] = [
    {
      id: "application",
      kind: "application",
      title: "HOPE application (Form 5737)",
      detail: hasAddress
        ? "Official 2026 form, pre-filled from your answers. Review, check the boxes, and sign."
        : "Add your home address to finish pre-filling it.",
      status: hasAddress ? "prefilled" : "todo",
    },
    {
      id: "ownership",
      kind: "ownership",
      title: "Proof of ownership",
      detail: "Recorded deed, land contract, or court order with the Wayne County Register of Deeds stamp.",
      status: "todo",
    },
    {
      id: "id",
      kind: "id",
      title: "Photo ID, front and back",
      detail: `For each adult (${input.adults.length}). Must show a photo and this address.`,
      status: "todo",
    },
  ];

  input.adults.forEach((a, i) => {
    if (!input.incomeStepStarted && a.docs.length === 0) {
      items.push({
        id: `income-${i}`,
        kind: "income",
        person: a.name,
        title: `Income & tax return: ${a.name}`,
        detail: "Add on the next step.",
        status: "todo",
      });
      return;
    }
    if (a.docs.length > 0) {
      items.push({
        id: `income-${i}`,
        kind: "income",
        person: a.name,
        title: `Income documents: ${a.name}`,
        detail: a.docs.map((d) => d.label).join(", "),
        status: a.docs.every((d) => d.image) ? "ready" : "todo",
        attachments: a.docs,
      });
    }
    if (needs4988.has(a.name)) {
      items.push({
        id: `4988-${i}`,
        kind: "form4988",
        person: a.name,
        title: `Form 4988: ${a.name}`,
        detail: `Affidavit that they weren't required to file a ${INCOME_YEAR} tax return. Pre-filled; they sign it.`,
        status: "prefilled",
      });
    } else {
      items.push({
        id: `return-${i}`,
        kind: "taxreturn",
        person: a.name,
        title: `${INCOME_YEAR} tax returns: ${a.name}`,
        detail: "Complete federal and state returns with all schedules, including Homestead Property Tax Credit.",
        status: "todo",
      });
    }
  });

  const minors = input.householdSize - input.adults.length;
  if (minors > 0) {
    items.push({
      id: "minors",
      kind: "minors",
      title: `Proof of residency for ${minors} ${minors === 1 ? "minor" : "minors"}`,
      detail: "Report card, transcript, or an MDHHS/WIC letter showing their name and this address.",
      status: "todo",
    });
  }

  if (evaluation.flags.some((f) => f.code === "PRE_MISSING")) {
    items.push({
      id: "2368",
      kind: "form2368",
      title: "Form 2368 (Principal Residence Exemption)",
      detail: "Your bill shows less than 100% PRE. Included in the application PDF, pre-filled.",
      status: "prefilled",
    });
  }

  if (input.taxBill.image) {
    items.push({
      id: "taxbill",
      kind: "taxbill",
      title: "Property tax bill",
      detail: "Scanned. Not required, but handy for the parcel number.",
      status: "ready",
      attachments: [{ label: "Tax bill", image: input.taxBill.image }],
    });
  }

  return items;
}

export function packetProgress(items: PacketItem[]) {
  const done = items.filter((i) => i.status !== "todo").length;
  return { done, total: items.length };
}
