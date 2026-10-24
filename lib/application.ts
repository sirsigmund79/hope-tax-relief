// The whole HOPE application as one object, plus pure selectors that turn it into
// the rules-engine input, the packet, and the PDF fill data. UI pages only edit this object.
import { ASSET_CAP, TIERS, incomeLimit } from "./config";
import { evaluateHousehold, type Evaluation, type HouseholdInput } from "./hope";
import type { ApplicationData, ApplicationPerson } from "./hopeFields";
import type { PacketInput } from "./packet";
import type { DocType } from "./schema";
import { num } from "./format";

export type YesNo = boolean | null; // null = not answered yet

export type DocEntry = {
  id: string;
  filename: string;
  status: "loading" | "done";
  manual: boolean; // typed in by hand, or extraction failed
  docType: DocType;
  income: string;
  personName: string | null;
  employerName: string | null;
  employerAddress: string | null;
  confidence: "high" | "medium" | "low" | null;
  issues: string[];
  failedReason?: string;
  mock?: boolean;
  previewUrl?: string; // local object URL of the photo; never uploaded again, not persisted
};

export type Person = {
  id: string;
  name: string;
  age: string;
  relationship: string; // "Self" for the applicant
  docs: DocEntry[];
  noIncome: boolean;
  filedTaxReturn: YesNo; // null = use defaultFiled()
};

export type Account = { id: string; institution: string; balance: string; owner: string; interestRate: string; investment: boolean; image?: string };
export type OtherProperty = { id: string; address: string; owners: string; assessedValue: string; lastTaxesPaid: string; taxesPaid: string };
export type Vehicle = { id: string; make: string; year: string; monthlyPayment: string; balanceOwed: string };
export type Policy = { id: string; insured: string; amount: string; monthlyPayment: string; paidInFull: string; beneficiary: string; relationship: string };
export type Debt = { id: string; creditor: string; purpose: string; date: string; originalBalance: string; monthlyPayment: string; balanceOwed: string };

export const EXPENSES = [
  ["heating", "Heating"],
  ["electric", "Electric"],
  ["water", "Water"],
  ["phone", "Phone"],
  ["cable", "Cable / internet"],
  ["food", "Food"],
  ["clothing", "Clothing"],
  ["healthInsurance", "Health insurance"],
  ["garbage", "Garbage"],
  ["daycare", "Daycare"],
  ["car", "Car (gas, repairs)"],
] as const;
export type ExpenseKey = (typeof EXPENSES)[number][0];

export const MARITAL = ["Single", "Married", "Divorced", "Separated", "Widowed"] as const;

export type AppState = {
  // Check if you can apply
  ownsAndLives: YesNo;
  householdSize: string;
  assetsOverCap: YesNo;
  incomeBand: number | null; // index into TIERS; TIERS.length = over every limit
  hardship: YesNo;
  currentTaxBill: string;
  // Your home
  address: string;
  parcelNumber: string;
  preExemptionPercent: string;
  delinquentAmount: string;
  billImage: string;
  movedIn: string; // "YYYY-MM"
  hasMortgage: YesNo;
  lender: string;
  loanBalance: string;
  mortgagePayment: string;
  otherExemptionElsewhere: YesNo; // Form 2368 lines 13, 16, 18 (asked only when PRE is missing)
  // About you
  phone: string;
  email: string;
  maritalStatus: string;
  hasDesignee: YesNo;
  designee: { name: string; phone: string; address: string };
  // People (people[0] is the applicant)
  people: Person[];
  // Savings and property
  hasAccounts: YesNo;
  accounts: Account[];
  hasOtherProperty: YesNo;
  otherProperties: OtherProperty[];
  hasVehicles: YesNo;
  vehicles: Vehicle[];
  hasLifeInsurance: YesNo;
  policies: Policy[];
  // Debts and expenses
  hasDebts: YesNo;
  debts: Debt[];
  expenses: Record<ExpenseKey, string>;
  // Check and send
  statement: string;
  reviewedGuidelines: boolean;
  completed: string[]; // section ids finished
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export const newPerson = (relationship = ""): Person => ({
  id: newId(), name: "", age: "", relationship, docs: [], noIncome: false, filedTaxReturn: null,
});

export function initialState(): AppState {
  return {
    ownsAndLives: null, householdSize: "", assetsOverCap: null, incomeBand: null, hardship: null, currentTaxBill: "",
    address: "", parcelNumber: "", preExemptionPercent: "", delinquentAmount: "", billImage: "", movedIn: "",
    hasMortgage: null, lender: "", loanBalance: "", mortgagePayment: "", otherExemptionElsewhere: null,
    phone: "", email: "", maritalStatus: "", hasDesignee: null, designee: { name: "", phone: "", address: "" },
    people: [newPerson("Self")],
    hasAccounts: null, accounts: [], hasOtherProperty: null, otherProperties: [], hasVehicles: null, vehicles: [],
    hasLifeInsurance: null, policies: [], hasDebts: null, debts: [],
    expenses: Object.fromEntries(EXPENSES.map(([k]) => [k, ""])) as Record<ExpenseKey, string>,
    statement: "", reviewedGuidelines: false, completed: [],
  };
}

// ---------- derived values ----------

export const INCOME_DOCS: DocType[] = ["W2", "SSA_1099", "PAYSTUB"];

export const householdSize = (s: AppState) => Math.max(1, Math.floor(num(s.householdSize) ?? 1));
export const isAdult = (p: Person, i: number) => i === 0 || (num(p.age) ?? 18) >= 18;
export const adults = (s: AppState) => s.people.filter(isAdult);
export const personLabel = (p: Person, i: number) => p.name.trim() || (i === 0 ? "You" : `Person ${i + 1}`);

/** Docs that count as income: done, an income type (or typed in), with an amount. */
export const incomeDocs = (p: Person) =>
  p.docs.filter((d) => d.status === "done" && (d.manual || INCOME_DOCS.includes(d.docType)) && num(d.income) !== null);

export const personIncome = (p: Person): number | null => {
  const docs = incomeDocs(p);
  return docs.length ? docs.reduce((t, d) => t + (num(d.income) ?? 0), 0) : null;
};

/** Best guess until answered: wage earners usually file; Social Security-only and no-income adults usually don't. */
export const defaultFiled = (p: Person) => p.docs.some((d) => d.status === "done" && (d.docType === "W2" || d.docType === "PAYSTUB"));
export const filedTaxReturn = (p: Person) => p.filedTaxReturn ?? defaultFiled(p);

export const employerOf = (p: Person) => {
  const d = p.docs.find((x) => x.employerName);
  return d ? { name: d.employerName!, address: d.employerAddress } : null;
};

/** Household assets for the rules: itemized accounts once given, else the yes/no answer from the eligibility check. */
export function liquidAssets(s: AppState): number | null {
  if (s.hasAccounts === false) return 0;
  if (s.hasAccounts === true && s.accounts.length) return s.accounts.reduce((t, a) => t + (num(a.balance) ?? 0), 0);
  if (s.assetsOverCap === true) return ASSET_CAP + 1;
  if (s.assetsOverCap === false) return 0;
  return null;
}

/** Income bands for the eligibility question, from the 2026 table. */
export function incomeBands(size: number) {
  const regular = TIERS.filter((t) => !t.requiresHardship);
  const bands = regular.map((t, i) => {
    const hi = incomeLimit(t, size);
    const lo = i === 0 ? null : incomeLimit(regular[i - 1], size) + 1;
    return { tier: i, exemption: t.exemption, lo, hi };
  });
  const hard = TIERS.findIndex((t) => t.requiresHardship);
  bands.push({ tier: hard, exemption: TIERS[hard].exemption, lo: incomeLimit(regular[regular.length - 1], size) + 1, hi: incomeLimit(TIERS[hard], size) });
  return { bands, over: { tier: TIERS.length, lo: incomeLimit(TIERS[hard], size) + 1 } };
}

/** Rules-engine input. Before documents exist, the self-reported band stands in for income. */
export function householdInput(s: AppState): HouseholdInput {
  const size = householdSize(s);
  const adultList = adults(s);
  const anyDocs = adultList.some((p) => incomeDocs(p).length > 0 || p.noIncome);
  const bandIncome =
    s.incomeBand === null ? null
    : s.incomeBand >= TIERS.length ? incomeLimit(TIERS[TIERS.length - 1], size) + 1
    : incomeLimit(TIERS[s.incomeBand], size);
  return {
    householdSize: size,
    adults: adultList.map((p, i) => ({
      name: personLabel(p, i),
      annualIncome: anyDocs ? personIncome(p) : i === 0 ? bandIncome : null,
      filedTaxReturn: filedTaxReturn(p),
    })),
    liquidAssets: liquidAssets(s),
    currentTaxBill: num(s.currentTaxBill),
    delinquentAmount: num(s.delinquentAmount),
    preExemptionPercent: num(s.preExemptionPercent),
    hardship: s.hardship === true,
  };
}

export const evaluate = (s: AppState): Evaluation => evaluateHousehold(householdInput(s));

const SOURCE_LABELS: Partial<Record<DocType, string>> = {
  W2: "Wages (W-2)",
  SSA_1099: "Social Security (SSA-1099)",
  PAYSTUB: "Wages (paystubs)",
};
const DOC_NAMES: Partial<Record<DocType, string>> = { W2: "W-2", SSA_1099: "SSA-1099", PAYSTUB: "Paystub" };

export function packetInput(s: AppState, incomeStepStarted: boolean): PacketInput {
  return {
    address: s.address,
    householdSize: householdSize(s),
    adults: adults(s).map((p, i) => ({
      name: personLabel(p, i),
      income: personIncome(p),
      filedTaxReturn: filedTaxReturn(p),
      docs: incomeDocs(p).map((d) => ({
        label: (DOC_NAMES[d.docType] ?? "Income document") + (d.previewUrl ? "" : " (typed in)"),
        image: d.previewUrl,
      })),
    })),
    taxBill: { amount: num(s.currentTaxBill), image: s.billImage || undefined },
    incomeStepStarted,
  };
}

function yearsSince(movedIn: string, now: Date): string {
  const m = movedIn.match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  const months = (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() + 1 - Number(m[2]));
  if (months < 0) return "";
  const y = Math.floor(months / 12);
  return y >= 1 ? `${y} year${y === 1 ? "" : "s"}` : `${months} month${months === 1 ? "" : "s"}`;
}

export function applicationData(s: AppState, evaluation: Evaluation, now = new Date()): ApplicationData {
  const needs4988 = new Set(evaluation.flags.flatMap((f) => (f.code === "FORM_4988_NEEDED" ? [f.person] : [])));
  const spouse = s.people.find((p, i) => i > 0 && /spouse|wife|husband/i.test(p.relationship));
  const people: ApplicationPerson[] = s.people.map((p, i) => {
    const adult = isAdult(p, i);
    return {
      name: personLabel(p, i),
      age: p.age.trim(),
      relationship: i === 0 ? "SELF" : p.relationship.trim(),
      adult,
      employer: employerOf(p)?.name ?? null,
      needs4988: adult && needs4988.has(personLabel(p, i)),
      sources: adult ? incomeDocs(p).map((d) => ({ label: SOURCE_LABELS[d.docType] ?? "Income", amount: num(d.income) ?? 0 })) : [],
    };
  });
  const employer = employerOf(s.people[0]);
  return {
    phone: s.phone,
    email: s.email,
    address: s.address,
    parcelNumber: s.parcelNumber,
    maritalStatus: s.maritalStatus,
    spouseAge: spouse?.age.trim() ?? "",
    dependents: s.people.filter((p, i) => !isAdult(p, i)).length,
    lengthAtResidence: yearsSince(s.movedIn, now),
    occupiedSince: s.movedIn ? `${s.movedIn.slice(5, 7)}/01/${s.movedIn.slice(0, 4)}` : "",
    ownAndOccupy: s.ownsAndLives === true,
    mortgage: s.hasMortgage === null ? undefined : s.hasMortgage
      ? { company: s.lender, unpaidBalance: num(s.loanBalance), monthlyPayment: num(s.mortgagePayment) }
      : null,
    employer: employer ? { name: employer.name, address: employer.address ?? "" } : s.people[0].noIncome || s.people[0].docs.length ? null : undefined,
    people,
    accounts: s.hasAccounts === null ? undefined : s.hasAccounts
      ? s.accounts.map((a) => ({ institution: a.institution, amount: num(a.balance), owner: a.owner, interestRate: a.interestRate, investment: a.investment }))
      : [],
    otherProperties: s.hasOtherProperty === null ? undefined : s.hasOtherProperty ? s.otherProperties : [],
    vehicles: s.hasVehicles === null ? undefined : s.hasVehicles ? s.vehicles : [],
    policies: s.hasLifeInsurance === null ? undefined : s.hasLifeInsurance ? s.policies : [],
    debts: s.hasDebts === null ? undefined : s.hasDebts ? s.debts : [],
    expenses: s.completed.includes("money-out") ? s.expenses : undefined,
    designee: s.hasDesignee === null ? undefined : s.hasDesignee ? s.designee : null,
    reviewedGuidelines: s.reviewedGuidelines,
    statement: s.statement,
    preMissing: evaluation.flags.some((f) => f.code === "PRE_MISSING"),
    otherExemptionElsewhere: s.otherExemptionElsewhere,
  };
}
