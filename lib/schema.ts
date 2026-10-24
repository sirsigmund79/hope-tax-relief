import { z } from "zod";

export const DocType = z.enum(["W2", "SSA_1099", "PAYSTUB", "TAX_BILL", "OTHER"]);
export type DocType = z.infer<typeof DocType>;

export const Extraction = z.object({
  docType: DocType,
  personName: z.string().nullable(),
  annualIncome: z.number().nonnegative().nullable(), // W2 box 1, SSA-1099 box 5, paystub YTD annualized
  taxYear: z.number().int().nullable(),
  employerName: z.string().nullable().default(null), // W2 box c
  parcelNumber: z.string().nullable().default(null), // tax bill
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
