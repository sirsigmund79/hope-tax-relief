// Regenerates docs/pdf-fields.json and docs/pdf-field-map.md: every AcroForm field in the official
// 2026 HOPE application PDF, where it is, and whether planFill() fills it.
// Usage: npm run fields
import { readFileSync, writeFileSync } from "node:fs";
import { PDFArray, PDFDict, PDFDocument, PDFDropdown, PDFName, PDFRef } from "pdf-lib";
import { planFill, type ApplicationData } from "../lib/hopeFields";

// A household that answered every question and fills every row, so planFill shows its full reach.
const p = (name: string) => ({
  name, age: "40", relationship: "Spouse", adult: true, employer: "Acme", needs4988: true,
  sources: [{ label: "Wages (W-2)", amount: 1000 }],
});
const row = <T extends string>(keys: T[]) => Object.fromEntries([["id", "x"], ...keys.map((k) => [k, "1"])]) as Record<T | "id", string>;
const everything: ApplicationData = {
  phone: "1", email: "a@b.c", address: "1 Main St, Detroit, MI 48200", parcelNumber: "1",
  maritalStatus: "Married", spouseAge: "40", dependents: 1, lengthAtResidence: "2 years", occupiedSince: "01/01/2020",
  ownAndOccupy: true, mortgage: { company: "Bank", unpaidBalance: 1, monthlyPayment: 1 },
  employer: { name: "Acme", address: "1 Plaza, Detroit, MI 48200" },
  people: ["A", "B", "C", "D", "E", "F", "G", "H"].map(p),
  accounts: [1, 2, 3].map(() => ({ institution: "CU", amount: 1, owner: "A", interestRate: "1%", investment: false })),
  otherProperties: [1, 2].map(() => ({ ...row(["owners", "assessedValue", "lastTaxesPaid", "taxesPaid"]), address: "2 Elm St, Detroit, MI 48200" })),
  vehicles: [1, 2].map(() => row(["make", "year", "monthlyPayment", "balanceOwed"])),
  policies: [1, 2, 3].map(() => row(["insured", "amount", "monthlyPayment", "paidInFull", "beneficiary", "relationship"])),
  debts: Array.from({ length: 8 }, () => row(["creditor", "purpose", "date", "originalBalance", "monthlyPayment", "balanceOwed"])),
  expenses: Object.fromEntries(["heating", "electric", "water", "phone", "cable", "food", "clothing", "healthInsurance", "garbage", "daycare", "car"].map((k) => [k, "1"])),
  designee: { name: "D", phone: "1", address: "3 Oak St, Detroit, MI 48200" },
  reviewedGuidelines: true, statement: "s", preMissing: true, otherExemptionElsewhere: false,
};
const plans = [planFill(everything), planFill({ ...everything, accounts: everything.accounts!.map((a) => ({ ...a, investment: true })) })];
const filled = new Set(plans.flatMap((x) => [...Object.keys(x.text), ...Object.keys(x.checks)]));

// Where each filled field's value comes from (first match wins). Keep in step with lib/hopeFields.ts.
const SOURCES: [RegExp, string][] = [
  [/^Petitioner's Name$/, "people[0].name (About you › name; pre-filled from tax bill owner). Shared: 5 pages"],
  [/^Daytime Phone Number$/, "phone (About you › contact). Shared"],
  [/^Email$/, "email (About you › contact)"],
  [/^Property Address of Principal Residence$|^Principal Residence (City|State)$|^Principle Residence ZIP Code$/, "address, split by lib/address.ts (tax bill photo or typed). Shared"],
  [/^Property Parcel Identification Number$/, "parcelNumber (tax bill photo or typed). Shared"],
  [/^Age of Petitioner$/, "people[0].age"],
  [/^Marital Status$/, "maritalStatus"],
  [/^Age of Spouse$/, "derived: age of the person whose relationship is Spouse; N/A if not married"],
  [/^Number of Legal Decendents$/, "derived: count of people under 18 (approximation)"],
  [/^Name of Mortgage Company$|^Unpaid Balance|^monthly payment$/, "mortgage (mortgage statement photo or typed); N/A if no mortgage"],
  [/^length of time at this residence$/, "derived from movedIn (month/year)"],
  [/^I own the property|^The property in which the exemption/, "checked when ownsAndLives = yes (eligibility question 1)"],
  [/^Check if you own, or are buying, other property/, "checked when otherProperties has rows"],
  [/^(First|Second) property/, "otherProperties rows (address split by lib/address.ts); N/A when none"],
  [/employer$|^(Address|City|State|ZIP code) of employer$|^Name of employer$/, "people[0] W-2 box c (employerName, employerAddress); N/A if no wage income"],
  [/source of income$|income\. Amount/, "income documents for all adults; 3 rows, extras folded into row 3; written as annual"],
  [/item\. Current interest rate$/, "UI GAP: mapped from accounts[].interestRate, but no page asks for it yet, so it is always blank"],
  [/ item\. /, "accounts rows (bank statement photo or typed); N/A when none"],
  [/life insurance\./, "policies rows; N/A when none"],
  [/vehicle\./, "vehicles rows; N/A when none"],
  [/household occupant\./, "people list (name, age, relationship); employer and contribution derived from documents; children get no contribution"],
  [/personal debt\./, "debts rows; N/A when none"],
  [/^Monthly Expense Information\.(?! Other)/, "expenses; blanks written as N/A"],
  [/^The applicant has reviewed/, "checked when reviewedGuidelines (checkbox on Check your answers)"],
  [/^Legal designee|^Daytime telephone number$/, "designee; N/A when none"],
  [/^Hope Statement$/, "statement (optional, 250 chars)"],
  [/^Local Unit$|^County$|^Percentage$|^Check Box2$|^Property$/, "Form 2368 fixed values: Detroit, Wayne, 100%, City box, principal residence"],
  [/^Date$/, "Form 2368 line 11: derived from movedIn"],
  [/^Claimed$|^If yes to 16$|^18$/, "Form 2368 lines 13/16/18: 'No' when otherExemptionElsewhere = no"],
];

// Why the remaining fields are empty today.
const GAPS: Record<string, string> = {
  "Reset": "PDF's own reset button. Never touch.",
  "property description": "GAP: legal description is on the deed / assessment roll, not the tax bill. Needs a question or a deed photo.",
  "Amount of income earned from other property": "GAP: no question yet (ask on other-property-list).",
  "Contact person of employer": "GAP: no question yet; not on a W-2.",
  "employer telephone number": "GAP: no question yet; not on a W-2.",
  "Monthly Expense Information. Other type and amount 1": "GAP: no 'other expenses' rows in the expenses page.",
  "Monthly Expense Information. Other type and amount 2": "GAP: as above.",
  "Monthly Expense Information. Other type and amount 3": "GAP: as above.",
  "Monthly Expense Information. Other type and amount 4": "GAP: as above.",
  "Monthly Expense Information. Other type and amount 5": "GAP: as above.",
  "Monthly Expense Information. Other type and amount 6": "GAP: as above.",
  "Date of certification": "LEFT FOR APPLICANT: date signed. Shared across 5737 Part 15, every 4988, and the statement page.",
  "SSN": "NEVER COLLECTED: Form 2368 line 6, owner's last four SSN digits.",
  "SSN1": "NEVER COLLECTED: Form 2368 line 9, co-owner's last four SSN digits.",
  "Co Owner": "GAP: Form 2368 line 8 co-owner name. Could come from tax bill owner names.",
  "Number2": "GAP: Form 2368 line 10 co-owner phone.",
  "If Yes": "GAP: Form 2368 line 14 (address + parcel of the other PRE) when line 13 is yes.",
  "Recinded": "GAP: Form 2368 line 15 yes/no, only when line 13 is yes.",
  "Parcel Number": "GAP: Form 2368 line 17 (out-of-state property) when line 16 is yes.",
  "Text19": "GAP: Form 2368 line 19 (state) when line 18 is yes.",
  "Mailing Address": "GAP: Form 2368 line 22, mailing address if different.",
  "Dropdown CP List": "LEFT AT DEFAULT 'Self Prepared'. Shared by the partner letter and statement page. Map if a community partner helps.",
  "CP ADDRESS": "DROPPED PAGE: community partner authorization letter (pages 15–16) is removed from the output.",
  "CP CITY": "DROPPED PAGE: partner letter.", "CP STATE": "DROPPED PAGE: partner letter.", "CP ZIP": "DROPPED PAGE: partner letter.",
  "CP PHONE": "DROPPED PAGE: partner letter.", "CP FAX": "DROPPED PAGE: partner letter.", "CP EMAIL": "DROPPED PAGE: partner letter.",
  "CP Rep Name": "DROPPED PAGE: partner letter.", "FAX_2": "DROPPED PAGE: partner letter.", "EMAIL": "DROPPED PAGE: partner letter (applicant email on page 16).",
};

async function main() {
const doc = await PDFDocument.load(readFileSync("public/forms/2026-hope-application.pdf"));
const pageOf = new Map<PDFRef, number>();
doc.getPages().forEach((pg, i) => pg.node.lookupMaybe(PDFName.of("Annots"), PDFArray)?.asArray().forEach((a) => a instanceof PDFRef && pageOf.set(a, i + 1)));
// A button's on-states are the keys of its /AP /N dictionary (a plain button has a single stream there instead).
const onStates = (widget: PDFDict) => {
  const normal = widget.lookupMaybe(PDFName.of("AP"), PDFDict)?.lookup(PDFName.of("N"));
  return normal instanceof PDFDict ? normal.keys().map((k) => k.asString()).filter((k) => k !== "/Off") : [];
};
const refOf = (d: PDFDict) => [...pageOf.keys()].find((r) => doc.context.lookup(r) === d);

const rows = doc.getForm().getFields().map((f) => {
  const name = f.getName();
  const widgets = f.acroField.getWidgets();
  const pages = [...new Set(widgets.map((w) => pageOf.get(refOf(w.dict)!) ?? 0))];
  const states = [...new Set(widgets.flatMap((w) =>
    onStates(w.dict)))];
  const r = widgets[0]?.getRectangle();
  const type = f.constructor.name.replace(/^PDF/, "");
  const isFilled = filled.has(name);
  return {
    name, type, pages,
    rect: r ? [r.x, r.y, r.width, r.height].map(Math.round) : null,
    states: type === "Button" || type === "CheckBox" ? states : undefined,
    options: f instanceof PDFDropdown ? f.getOptions() : undefined,
    filled: isFilled,
    source: isFilled ? SOURCES.find(([re]) => re.test(name))?.[1] ?? "filled (see lib/hopeFields.ts)" : GAPS[name] ?? "GAP: not mapped",
  };
}).sort((a, b) => (a.pages[0] ?? 0) - (b.pages[0] ?? 0) || (b.rect?.[1] ?? 0) - (a.rect?.[1] ?? 0) || (a.rect?.[0] ?? 0) - (b.rect?.[0] ?? 0));

writeFileSync("docs/pdf-fields.json", JSON.stringify(rows, null, 1) + "\n");
const count = (pred: (r: (typeof rows)[number]) => boolean) => rows.filter(pred).length;
const md = [
  "# HOPE application PDF: field map",
  "",
  "Generated by `npm run fields` from `public/forms/2026-hope-application.pdf` and `lib/hopeFields.ts`. Do not edit by hand.",
  "",
  `${rows.length} fields. Filled by the app when every question is answered: **${count((r) => r.filled)}**. ` +
    `Gaps: **${count((r) => r.source.startsWith("GAP"))}** unmapped, plus **${count((r) => r.source.startsWith("UI GAP"))}** mapped but never asked. Left for the applicant or never collected: ${count((r) => /^(LEFT|NEVER)/.test(r.source))}. ` +
    `On dropped pages or not to touch: ${count((r) => /^(DROPPED|PDF's own)/.test(r.source))}.`,
  "",
  "Pages are 1-based in the original 21-page PDF. Field names are exact (including the PDF's typos); a name on several pages is one shared field.",
  "",
  "| Page(s) | Field name (exact) | Type | Filled | Source / status |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.pages.join(", ")} | \`${r.name.replace(/\|/g, "\\|")}\` | ${r.type}${r.states?.length ? ` (${r.states.join(" ")})` : ""} | ${r.filled ? "yes" : "no"} | ${r.source} |`),
  "",
].join("\n");
writeFileSync("docs/pdf-field-map.md", md);
console.log(`${rows.length} fields, ${count((r) => r.filled)} mapped, ${count((r) => r.source.startsWith("GAP"))} unmapped gaps, ${count((r) => r.source.startsWith("UI GAP"))} mapped but never asked`);
}

main();
