import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PDFDocument, PDFName } from "pdf-lib";
import { fillHopePdf, planFill, type ApplicationData } from "@/lib/hopePdf";

const person = (name: string, over: Partial<ApplicationData["people"][number]> = {}) => ({
  name, age: "", relationship: "", adult: true, employer: null, sources: [], needs4988: false, ...over,
});

// Only the answers from the original three-screen flow: everything else unanswered.
const minimal: ApplicationData = {
  phone: "313-555-0100",
  email: "",
  address: "1234 Example St, Detroit, MI 48200",
  parcelNumber: "00000000.000",
  people: [
    person("Jane Doe", { relationship: "SELF", sources: [{ label: "Social Security (SSA-1099)", amount: 14400 }], needs4988: true }),
    person("John Doe", { needs4988: true }),
  ],
  accounts: [{ institution: "Total, all accounts", amount: 3000, owner: "Household", interestRate: "", investment: false }],
  preMissing: false,
};

// A household that answered every question.
const full: ApplicationData = {
  ...minimal,
  maritalStatus: "Married",
  spouseAge: "70",
  dependents: 1,
  lengthAtResidence: "12 years",
  occupiedSince: "06/01/2013",
  ownAndOccupy: true,
  mortgage: null,
  employer: null,
  people: [
    person("Jane Doe", { age: "68", relationship: "SELF", sources: [{ label: "Social Security (SSA-1099)", amount: 14400 }], needs4988: true }),
    person("John Doe", { age: "70", relationship: "Spouse", needs4988: true }),
    person("Jimmy Doe", { age: "12", relationship: "Grandson", adult: false }),
  ],
  accounts: [],
  otherProperties: [],
  vehicles: [{ id: "v", make: "Ford Focus", year: "2012", monthlyPayment: "0", balanceOwed: "" }],
  policies: [],
  debts: [],
  expenses: { heating: "85", electric: "60", water: "45", food: "300" },
  designee: null,
  reviewedGuidelines: true,
  preMissing: true,
  otherExemptionElsewhere: false,
};

describe("planFill", () => {
  it("maps the household onto the form's fields", () => {
    const { text } = planFill(minimal);
    expect(text).toMatchObject({
      "Petitioner's Name": "Jane Doe",
      "Property Address of Principal Residence": "1234 Example St",
      "Principal Residence City": "Detroit",
      "Principle Residence ZIP Code": "48200",
      "Property Parcel Identification Number": "00000000.000",
      "First source of income": "Jane Doe: Social Security (SSA-1099)",
      "First income. Amount. Indicate whether monthly or annual": "$14,400.00 annual",
      "First item. Amount on deposit": "$3,000.00",
      "Second household occupant. First and last name": "John Doe",
      "Second household occupant. Financial contribution to family income": "$0.00",
    });
    expect(text).not.toHaveProperty("Email"); // blanks are left blank
  });

  it("leaves unanswered sections blank", () => {
    const { text, checks } = planFill(minimal);
    for (const k of ["Name of Mortgage Company", "First vehicle. Make", "First personal debt. Creditor", "Monthly Expense Information. Heating", "Legal designee name"]) {
      expect(text).not.toHaveProperty([k]);
    }
    expect(checks).toEqual({});
  });

  it("writes N/A for sections answered 'none', and fills the rest", () => {
    const { text } = planFill(full);
    expect(text).toMatchObject({
      "Age of Petitioner": "68",
      "Marital Status": "Married",
      "Age of Spouse": "70",
      "Number of Legal Decendents": "1",
      "length of time at this residence": "12 years",
      "Name of Mortgage Company": "N/A",
      "Name of employer": "N/A",
      "First item. Name of financial institution or investments": "N/A",
      "First property address": "N/A",
      "First life insurance. Name of insured": "N/A",
      "First personal debt. Creditor": "N/A",
      "Legal designee name": "N/A",
      "First vehicle. Make": "Ford Focus",
      "First vehicle. Monthly Payment": "$0.00",
      "Monthly Expense Information. Heating": "$85.00",
      "Monthly Expense Information. Daycare": "N/A",
      "Third household occupant. First and last name": "Jimmy Doe",
      "Third household occupant. Relationship to applicant": "Grandson",
    });
    expect(text).not.toHaveProperty(["Third household occupant. Financial contribution to family income"]); // children: blank
    expect(text).not.toHaveProperty(["First vehicle. Balance owed"]);
  });

  it("ticks the boxes the person affirmed, and Form 2368's answers", () => {
    const { checks, text } = planFill(full);
    expect(Object.keys(checks)).toHaveLength(8); // own, homestead, guidelines + five on Form 2368 (no other property)
    expect(checks).toMatchObject({ "Check Box2": "No", Property: "Yes", Claimed: "no", "If yes to 16": "No", "18": "No" });
    expect(text).toMatchObject({ "Local Unit": "Detroit", County: "Wayne", Percentage: "100", Date: "06/01/2013" });
  });

  it("puts the petitioner's 4988 on the named page and others on the spare pages", () => {
    expect(planFill(minimal)).toMatchObject({ applicant4988: true, extra4988Names: ["John Doe"], over4988Capacity: [] });
  });

  it("folds income sources past the second into the third row", () => {
    const many = { ...minimal, people: [person("Jane Doe", { sources: [1, 2, 3, 4].map((n) => ({ label: `S${n}`, amount: n * 100 })) })] };
    const { text } = planFill(many);
    expect(text["Third source of income"]).toBe("Jane Doe: S3 $300.00; Jane Doe: S4 $400.00");
    expect(text["Third income. Amount. Indicate whether monthly or annual"]).toBe("$700.00 annual");
  });

  it("reports rows that don't fit and adults beyond the spare 4988 pages", () => {
    const vehicles = ["A", "B", "C"].map((make) => ({ id: make, make, year: "", monthlyPayment: "", balanceOwed: "" }));
    const five = { ...minimal, vehicles, people: ["A", "B", "C", "D", "E"].map((n) => person(n, { needs4988: true })) };
    const plan = planFill(five);
    expect(plan).toMatchObject({ extra4988Names: ["B", "C", "D"], over4988Capacity: ["E"] });
    expect(plan.overflow).toEqual(["1 more vehicles than the form has room for. List them on a separate page."]);
  });
});

describe("fillHopePdf (official 2026 PDF)", () => {
  const pdf = readFileSync("public/forms/2026-hope-application.pdf");
  const state = (form: ReturnType<PDFDocument["getForm"]>, name: string) =>
    form.getField(name).acroField.dict.get(PDFName.of("V"))?.toString();

  it("fills fields and keeps only the pages this household needs", async () => {
    const out = await PDFDocument.load(await fillHopePdf(pdf, minimal));
    // 21 pages − partner letter (2) − Form 2368 (2) − unused spare 4988s (2)
    expect(out.getPageCount()).toBe(15);
    const form = out.getForm();
    expect(form.getTextField("Petitioner's Name").getText()).toBe("Jane Doe");
    expect(form.getTextField("First source of income").getText()).toBe("Jane Doe: Social Security (SSA-1099)");
    // Shared fields lost the widgets on removed pages, and fields only on removed pages are gone.
    expect(form.getTextField("Petitioner's Name").acroField.getWidgets()).toHaveLength(5); // pages 9, 11, 12, 17, 18
    expect(() => form.getTextField("Local Unit")).toThrow();
  }, 30000);

  it("ticks boxes and keeps Form 2368 when PRE is missing", async () => {
    const out = await PDFDocument.load(await fillHopePdf(pdf, full));
    expect(out.getPageCount()).toBe(17); // 21 − partner (2) − 2 unused spares
    const form = out.getForm();
    expect(form.getCheckBox("I own the property in which the exemption is being claimed").isChecked()).toBe(true);
    expect(state(form, "Check Box2")).toBe("/No");
    expect(state(form, "Claimed")).toBe("/no");
    expect(form.getTextField("Monthly Expense Information. Daycare").getText()).toBe("N/A");
    // Each widget of a Yes/No pair shows only its own state.
    const widgets = form.getField("Claimed").acroField.getWidgets().map((w) => w.dict.get(PDFName.of("AS"))?.toString());
    expect(widgets).toEqual(["/Off", "/no"]);
  }, 30000);
});
