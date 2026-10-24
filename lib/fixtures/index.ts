import type { Extraction } from "../schema";

const empty = {
  personName: null,
  annualIncome: null,
  taxYear: null,
  employerName: null,
  employerAddress: null,
  parcelNumber: null,
  propertyAddress: null,
  institutionName: null,
  accountBalance: null,
  lenderName: null,
  loanBalance: null,
  monthlyPayment: null,
  taxBillAmount: null,
  delinquentAmount: null,
  preExemptionPercent: null,
};

export const fixtures = {
  w2: { ...empty, docType: "W2", personName: "John Doe", annualIncome: 18250, taxYear: 2025, employerName: "Acme Example Widgets LLC (FAKE)", employerAddress: "1 Sample Plaza, Nowhere, MI 00000", confidence: "high", issues: [] },
  ssa: { ...empty, docType: "SSA_1099", personName: "Jane Doe", annualIncome: 14400, taxYear: 2025, confidence: "high", issues: [] },
  paystub: { ...empty, docType: "PAYSTUB", personName: "John Doe", employerName: "Acme Example Widgets LLC (FAKE)", annualIncome: 19500, taxYear: 2025, confidence: "medium", issues: ["Annualized from year-to-date gross pay"] },
  bill: { ...empty, docType: "TAX_BILL", personName: "Jane Doe", taxYear: 2025, parcelNumber: "00000000.000", propertyAddress: "1234 Example St, Detroit, MI 48200", taxBillAmount: 2100, delinquentAmount: 4800, preExemptionPercent: 100, confidence: "high", issues: [] },
  // Matches public/samples/detroit-summer-tax-bill-2026.jpg, a real 2026 Detroit summer bill (parcel blacked out).
  detroitBill: {
    ...empty, docType: "TAX_BILL", taxYear: 2026, taxBillAmount: 5230.27, preExemptionPercent: 0, confidence: "high",
    issues: ["Parcel number is blacked out", "This is the summer bill only; add the winter bill for the full year"],
  },
  bank: { ...empty, docType: "BANK_STATEMENT", personName: "Jane Doe", institutionName: "Example Community Credit Union (FAKE)", accountBalance: 3000, confidence: "high", issues: [] },
  mortgage: { ...empty, docType: "MORTGAGE_STATEMENT", personName: "Jane Doe", lenderName: "Sample Home Loans (FAKE)", loanBalance: 18400, monthlyPayment: 412, confidence: "high", issues: [] },
  cropped: { ...empty, docType: "W2", personName: "John Doe", taxYear: 2025, confidence: "low", issues: ["Image cut off on right side — Box 1 is not visible", "Please retake the photo with the whole form in frame"] },
} satisfies Record<string, Extraction>;

/** Pick a fixture from a filename hint; defaults to the W-2. */
export function fixtureFor(filename = ""): Extraction {
  const f = filename.toLowerCase();
  if (f.includes("crop")) return fixtures.cropped;
  if (f.includes("ssa")) return fixtures.ssa;
  if (f.includes("bank")) return fixtures.bank;
  if (f.includes("mortgage")) return fixtures.mortgage;
  if (f.includes("detroit")) return fixtures.detroitBill;
  if (f.includes("bill") || f.includes("tax")) return fixtures.bill;
  if (f.includes("pay") || f.includes("stub")) return fixtures.paystub;
  return fixtures.w2;
}
