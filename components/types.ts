import type { DocType } from "@/lib/schema";

export type DocEntry = {
  id: string;
  filename: string;
  status: "loading" | "done";
  manual: boolean; // typed in by hand, or extraction failed
  docType: DocType;
  income: string;
  personName: string | null;
  employerName: string | null;
  confidence: "high" | "medium" | "low" | null;
  issues: string[];
  failedReason?: string;
  mock?: boolean;
  previewUrl?: string; // local object URL of the photo, for the packet; never uploaded again
};

export type AdultState = {
  id: string;
  name: string;
  docs: DocEntry[];
  filedTaxReturn: boolean | null; // null = not answered yet; see defaultFiled()
};

/** Best guess until the person answers: wage earners usually file; Social Security-only and no-income adults usually don't. */
export function defaultFiled(docs: DocEntry[]): boolean {
  return docs.some((d) => d.status === "done" && (d.docType === "W2" || d.docType === "PAYSTUB"));
}

export const filedTaxReturn = (a: AdultState) => a.filedTaxReturn ?? defaultFiled(a.docs);

export type HouseholdState = {
  address: string;
  phone: string;
  email: string;
  parcelNumber: string;
  hardship: boolean; // 20%+ income loss, or home in property tax foreclosure
  householdSize: string;
  adultCount: string;
  liquidAssets: string;
  currentTaxBill: string;
  delinquentAmount: string;
  preExemptionPercent: string;
  billImage: string; // local object URL of the scanned bill, "" if none
};

export const INCOME_DOCS: DocType[] = ["W2", "SSA_1099", "PAYSTUB"];

export const DOC_LABELS: Record<DocType, string> = {
  W2: "W-2",
  SSA_1099: "SSA-1099",
  PAYSTUB: "Paystub",
  TAX_BILL: "Tax bill",
  OTHER: "Other document",
};

export const newId = () => Math.random().toString(36).slice(2, 10);
