import { z } from "zod";

export const DocType = z.enum(["W2", "SSA_1099", "PAYSTUB", "TAX_BILL", "BANK_STATEMENT", "MORTGAGE_STATEMENT", "OTHER"]);
export type DocType = z.infer<typeof DocType>;

export const Extraction = z.object({
  docType: DocType,
  personName: z.string().nullable(),
  annualIncome: z.number().nonnegative().nullable(), // W2 box 1, SSA-1099 box 5, paystub YTD annualized
  taxYear: z.number().int().nullable(),
  // Newer keys default to null so replies from models that omit them still validate.
  employerName: z.string().nullable().default(null), // W2 box c
  employerAddress: z.string().nullable().default(null), // W2 box c, one line
  parcelNumber: z.string().nullable().default(null), // tax bill
  propertyAddress: z.string().nullable().default(null), // tax bill, one line
  // bank statement
  institutionName: z.string().nullable().default(null),
  accountBalance: z.number().nonnegative().nullable().default(null),
  // mortgage statement
  lenderName: z.string().nullable().default(null),
  loanBalance: z.number().nonnegative().nullable().default(null),
  monthlyPayment: z.number().nonnegative().nullable().default(null),
  // tax bill only
  taxBillAmount: z.number().nonnegative().nullable(),
  delinquentAmount: z.number().nonnegative().nullable(),
  preExemptionPercent: z.number().min(0).max(100).nullable(),
  // quality
  confidence: z.enum(["high", "medium", "low"]),
  issues: z.array(z.string()),
});
export type Extraction = z.infer<typeof Extraction>;

export type ExtractResult =
  | { ok: true; data: Extraction; mock?: boolean }
  | { ok: false; reason: string; partial: Partial<Extraction> };

export const ExtractRequest = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().regex(/^image\//),
  filename: z.string().optional(),
});
