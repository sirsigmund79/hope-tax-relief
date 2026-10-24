// Maps HOPE Check's answers onto the official City of Detroit 2026 HOPE application's form fields.
// Field names are the PDF's own AcroForm names, including its typos ("Principle", "Decendents").
// Pure: no pdf-lib here, so the UI can preview the fill without loading the PDF library.
//
// Convention: `undefined` = question not answered (field left blank for the person);
// `null` / `[]` = answered "none" (field gets "N/A", as the form asks).
import { parseAddress } from "./address";
import { num } from "./format";

export const HOPE_PDF_PATH = "/forms/2026-hope-application.pdf";

// 0-based page indexes in the official PDF.
export const PAGE = {
  form2368: [12, 13],
  partnerLetter: [14, 15],
  form4988Applicant: 16, // its name box is the shared "Petitioner's Name" field
  form4988Extra: [18, 19, 20], // spare copies; their name box is not a field, so we stamp it
};
// Where the "I, ____" box sits on a 4988 page (matches the Petitioner's Name widget on page 17).
export const NAME_BOX_4988 = { x: 56, y: 559, size: 11 };

export type ApplicationPerson = {
  name: string;
  age: string;
  relationship: string;
  adult: boolean;
  employer: string | null;
  sources: { label: string; amount: number }[]; // one per income document
  needs4988: boolean;
};

type Row<T extends string> = Record<T | "id", string>;

export type ApplicationData = {
  phone: string;
  email: string;
  address: string; // free text, split into the form's boxes
  parcelNumber: string;
  maritalStatus?: string;
  spouseAge?: string;
  dependents?: number;
  lengthAtResidence?: string;
  occupiedSince?: string; // MM/DD/YYYY, Form 2368 line 11
  ownAndOccupy?: boolean; // Part 3 boxes
  mortgage?: { company: string; unpaidBalance: number | null; monthlyPayment: number | null } | null;
  employer?: { name: string; address: string } | null;
  people: ApplicationPerson[]; // people[0] is the petitioner
  accounts?: { institution: string; amount: number | null; owner: string; interestRate: string; investment: boolean }[];
  otherProperties?: Row<"address" | "owners" | "assessedValue" | "lastTaxesPaid" | "taxesPaid">[];
  vehicles?: Row<"make" | "year" | "monthlyPayment" | "balanceOwed">[];
  policies?: Row<"insured" | "amount" | "monthlyPayment" | "paidInFull" | "beneficiary" | "relationship">[];
  debts?: Row<"creditor" | "purpose" | "date" | "originalBalance" | "monthlyPayment" | "balanceOwed">[];
  expenses?: Record<string, string>;
  designee?: { name: string; phone: string; address: string } | null;
  reviewedGuidelines?: boolean;
  statement?: string;
  preMissing: boolean;
  otherExemptionElsewhere?: boolean | null; // Form 2368 lines 13/16/18
};

export type FillPlan = {
  text: Record<string, string>;
  checks: Record<string, string>; // button field → on-state to select ("Yes", "No", "no", or "*" for its only on-state)
  applicant4988: boolean;
  extra4988Names: string[]; // stamped onto the spare 4988 pages, in order
  over4988Capacity: string[]; // adults needing a 4988 beyond the spare pages
  overflow: string[]; // things that didn't fit the form's rows
  include2368: boolean;
};

const dollars = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
/** Format a typed amount as dollars; leave anything non-numeric as typed. */
const money = (s: string | null | undefined) => {
  if (!s?.trim()) return "";
  const n = num(s);
  return n === null ? s.trim() : dollars(n);
};
const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];
const NA = "N/A";

export const EXPENSE_FIELDS: Record<string, string> = {
  heating: "Monthly Expense Information. Heating",
  electric: "Monthly Expense Information. Electric",
  water: "Monthly Expense Information. Water",
  phone: "Monthly Expense Information. Phone",
  cable: "Monthly Expense Information. Cable",
  food: "Monthly Expense Information. Food",
  clothing: "Monthly Expense Information. Clothing",
  healthInsurance: "Monthly Expense Information. Health insurance",
  garbage: "Monthly Expense Information. Garbage",
  daycare: "Monthly Expense Information. Daycare",
  car: "Monthly Expense Information. Car expense",
};

const BOX = {
  own: "I own the property in which the exemption is being claimed",
  homestead:
    "The property in which the exemption is being claimed is used as my homestead. Homestead is generally defined as any dwelling with its land and buildings where a family makes its home",
  otherProperty: "Check if you own, or are buying, other property. If checked, complete the information below",
  guidelines:
    "The applicant has reviewed the applicable policy and guidelines adopted by the city or township, including the specific income and asset levels of the claimant and total household income and assets",
};

/** Pure mapping from app data to the PDF's fields. */
export function planFill(d: ApplicationData): FillPlan {
  const text: Record<string, string> = {};
  const checks: Record<string, string> = {};
  const overflow: string[] = [];
  const set = (k: string, v: string | null | undefined) => {
    if (v && v.trim()) text[k] = v.trim();
  };
  /** Fill up to `max` table rows; "none" writes N/A in the first cell; extras are reported. */
  function rows<T>(list: T[] | undefined, max: number, firstCell: (o: string) => string, fill: (o: string, item: T) => void, what: string) {
    if (list === undefined) return;
    if (list.length === 0) return set(firstCell("First"), NA);
    list.slice(0, max).forEach((item, i) => fill(ORDINALS[i], item));
    if (list.length > max) overflow.push(`${list.length - max} more ${what} than the form has room for. List them on a separate page.`);
  }

  const [petitioner, ...others] = d.people;
  const addr = parseAddress(d.address);

  // Shared fields: these appear on several pages and fill all of them.
  set("Petitioner's Name", petitioner?.name);
  set("Daytime Phone Number", d.phone);
  set("Email", d.email);
  set("Property Address of Principal Residence", addr.street);
  set("Principal Residence City", addr.city);
  set("Principal Residence State", addr.state);
  set("Principle Residence ZIP Code", addr.zip);
  set("Property Parcel Identification Number", d.parcelNumber);

  // Part 1
  set("Age of Petitioner", petitioner?.age);
  set("Marital Status", d.maritalStatus);
  if (d.maritalStatus) set("Age of Spouse", d.spouseAge || (d.maritalStatus === "Married" ? "" : NA));
  if (d.dependents !== undefined) set("Number of Legal Decendents", String(d.dependents));

  // Part 2
  if (d.mortgage === null) {
    set("Name of Mortgage Company", NA);
  } else if (d.mortgage) {
    set("Name of Mortgage Company", d.mortgage.company);
    if (d.mortgage.unpaidBalance !== null) set("Unpaid Balance owed on principal residence", dollars(d.mortgage.unpaidBalance));
    if (d.mortgage.monthlyPayment !== null) set("monthly payment", dollars(d.mortgage.monthlyPayment));
  }
  set("length of time at this residence", d.lengthAtResidence);

  // Part 3: the person affirmed both in the app ("Do you own and live in this home?")
  if (d.ownAndOccupy) {
    checks[BOX.own] = "*";
    checks[BOX.homestead] = "*";
  }

  // Part 4: other property
  if (d.otherProperties?.length) checks[BOX.otherProperty] = "*";
  rows(d.otherProperties, 2, (o) => `${o} property address`, (o, p) => {
    const a = parseAddress(p.address);
    set(`${o} property address`, a.street);
    set(`${o} property city`, a.city);
    set(`${o} property state`, a.state);
    set(`${o} property ZIP Code`, a.zip);
    set(`${o} property. Name of Owners`, p.owners);
    set(`${o} property assessed value`, money(p.assessedValue));
    set(`${o} property date of last taxes paid`, p.lastTaxesPaid);
    set(`${o} property. Amount of taxes paid`, money(p.taxesPaid));
  }, "other properties");

  // Part 5: the petitioner's employment
  if (d.employer === null) set("Name of employer", NA);
  else if (d.employer) {
    set("Name of employer", d.employer.name);
    if (d.employer.address) {
      const a = parseAddress(d.employer.address);
      set("Address of employer", a.street);
      set("City of employer", a.city);
      set("State of employer", a.state);
      set("ZIP code of employer", a.zip);
    }
  }

  // Part 6: income sources. Three rows; anything beyond the second goes in the third.
  const sources = d.people.flatMap((p) => p.sources.map((s) => ({ label: `${p.name}: ${s.label}`, amount: s.amount })));
  const incomeRows = sources.length > 3
    ? [...sources.slice(0, 2), {
        label: sources.slice(2).map((s) => `${s.label} ${dollars(s.amount)}`).join("; "),
        amount: sources.slice(2).reduce((t, s) => t + s.amount, 0),
      }]
    : sources;
  incomeRows.forEach((r, i) => {
    set(`${ORDINALS[i]} source of income`, r.label);
    set(`${ORDINALS[i]} income. Amount. Indicate whether monthly or annual`, `${dollars(r.amount)} annual`);
  });

  // Part 7: checking, savings, investments
  rows(d.accounts, 3, (o) => `${o} item. Name of financial institution or investments`, (o, a) => {
    set(`${o} item. Name of financial institution or investments`, a.institution);
    if (a.amount !== null) set(a.investment ? `${o} item. Value of investment` : `${o} item. Amount on deposit`, dollars(a.amount));
    set(`${o} item. Current interest rate`, a.interestRate);
    set(`${o} item. Name on account`, a.owner);
  }, "accounts");

  // Part 8: life insurance
  rows(d.policies, 3, (o) => `${o} life insurance. Name of insured`, (o, p) => {
    set(`${o} life insurance. Name of insured`, p.insured);
    set(`${o} life insurance. Amount of policy`, money(p.amount));
    set(`${o} life insurance. Monthly payments`, money(p.monthlyPayment));
    set(`${o} life insurance. Policy paid in full`, p.paidInFull);
    set(`${o} life insurance. Name of beneficiary`, p.beneficiary);
    set(`${o} life insurance. Relationship to insured`, p.relationship);
  }, "life insurance policies");

  // Part 9: vehicles
  rows(d.vehicles, 2, (o) => `${o} vehicle. Make`, (o, v) => {
    set(`${o} vehicle. Make`, v.make);
    set(`${o} vehicle. Year`, v.year);
    set(`${o} vehicle. Monthly Payment`, money(v.monthlyPayment));
    set(`${o} vehicle. Balance owed`, money(v.balanceOwed));
  }, "vehicles");

  // Part 10: household occupants. Row 1 is the petitioner ("SELF"; the name is the shared field).
  const contribution = (p: ApplicationPerson) => (p.adult ? dollars(p.sources.reduce((t, s) => t + s.amount, 0)) : "");
  if (petitioner) {
    set("First household occupant. age", petitioner.age);
    set("First household occupant. Place of employment", petitioner.employer);
    set("First household occupant. Financial contribution to family income", contribution(petitioner));
  }
  others.slice(0, 7).forEach((p, i) => {
    const row = ORDINALS[i + 1];
    set(`${row} household occupant. First and last name`, p.name);
    set(`${row} household occupant. age`, p.age);
    set(`${row} household occupant. Relationship to applicant`, p.relationship);
    set(`${row} household occupant. Place of employment`, p.employer);
    set(`${row} household occupant. Financial contribution to family income`, contribution(p));
  });
  if (others.length > 7) overflow.push(`${others.length - 7} more household members than the form has room for. List them on a separate page.`);

  // Part 11: personal debt
  rows(d.debts, 8, (o) => `${o} personal debt. Creditor`, (o, x) => {
    set(`${o} personal debt. Creditor`, x.creditor);
    set(`${o} personal debt. Purpose of debt`, x.purpose);
    set(`${o} personal debt. Date of Debt`, x.date);
    set(`${o} personal debt. Original Balance`, money(x.originalBalance));
    set(`${o} personal debt. Monthly Payment`, money(x.monthlyPayment));
    set(`${o} personal debt. Balance Owed`, money(x.balanceOwed));
  }, "debts");

  // Part 12: monthly expenses. The form asks for N/A rather than blanks.
  if (d.expenses) {
    for (const [key, field] of Object.entries(EXPENSE_FIELDS)) set(field, money(d.expenses[key]) || NA);
  }

  // Part 13
  if (d.reviewedGuidelines) checks[BOX.guidelines] = "*";

  // Part 14: legal designee
  if (d.designee === null) set("Legal designee name", NA);
  else if (d.designee) {
    set("Legal designee name", d.designee.name);
    set("Daytime telephone number", d.designee.phone);
    const a = parseAddress(d.designee.address);
    set("Legal designee mailing address", a.street);
    set("Legal designee city", a.city);
    set("Legal designee state", a.state);
    set("Legal designee ZIP code", a.zip);
  }

  // Statement page
  set("Hope Statement", d.statement);

  // Form 2368 (only kept when the bill shows less than 100% PRE)
  if (d.preMissing) {
    set("Local Unit", "Detroit");
    set("County", "Wayne");
    set("Percentage", "100");
    set("Date", d.occupiedSince);
    checks["Check Box2"] = "No"; // the "City" box (the "Yes" box is Township)
    checks["Property"] = "Yes"; // 11a: principal residence
    if (d.otherExemptionElsewhere === false) {
      checks["Claimed"] = "no"; // line 13 (this PDF spells its No state in lowercase)
      checks["If yes to 16"] = "No";
      checks["18"] = "No";
    }
  }

  const extras = others.filter((p) => p.needs4988).map((p) => p.name);
  return {
    text,
    checks,
    applicant4988: !!petitioner?.needs4988,
    extra4988Names: extras.slice(0, PAGE.form4988Extra.length),
    over4988Capacity: extras.slice(PAGE.form4988Extra.length),
    overflow,
    include2368: d.preMissing,
  };
}
