import type { Extraction } from "../schema";

const empty = {
  personName: null,
  annualIncome: null,
  taxYear: null,
  employerName: null,
  parcelNumber: null,
  taxBillAmount: null,
  delinquentAmount: null,
  preExemptionPercent: null,
};

export const fixtures = {
  w2: { ...empty, docType: "W2", personName: "John Doe", annualIncome: 18250, taxYear: 2025, employerName: "Acme Example Widgets LLC (FAKE)", confidence: "high", issues: [] },
  ssa: { ...empty, docType: "SSA_1099", personName: "Jane Doe", annualIncome: 14400, taxYear: 2025, confidence: "high", issues: [] },
  paystub: { ...empty, docType: "PAYSTUB", personName: "John Doe", employerName: "Acme Example Widgets LLC (FAKE)", annualIncome: 19500, taxYear: 2025, confidence: "medium", issues: ["Annualized from year-to-date gross pay"] },
  bill: { ...empty, docType: "TAX_BILL", personName: "Jane Doe", taxYear: 2025, parcelNumber: "00000000.000", taxBillAmount: 2100, delinquentAmount: 4800, preExemptionPercent: 100, confidence: "high", issues: [] },
  cropped: { ...empty, docType: "W2", personName: "John Doe", taxYear: 2025, confidence: "low", issues: ["Image cut off on right side — Box 1 is not visible", "Please retake the photo with the whole form in frame"] },
} satisfies Record<string, Extraction>;

/** Pick a fixture from a filename hint; defaults to the W-2. */
export function fixtureFor(filename = ""): Extraction {
  const f = filename.toLowerCase();
  if (f.includes("crop")) return fixtures.cropped;
  if (f.includes("ssa")) return fixtures.ssa;
  if (f.includes("bill") || f.includes("tax")) return fixtures.bill;
  if (f.includes("pay") || f.includes("stub")) return fixtures.paystub;
  return fixtures.w2;
}
