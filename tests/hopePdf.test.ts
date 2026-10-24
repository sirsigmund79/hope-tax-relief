import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { fillHopePdf, planFill, type ApplicationData } from "@/lib/hopePdf";

const demo: ApplicationData = {
  phone: "313-555-0100",
  email: "",
  address: "1234 Example St, Detroit, MI 48200",
  parcelNumber: "00000000.000",
  adults: [
    { name: "Jane Doe", employer: null, sources: [{ label: "Social Security (SSA-1099)", amount: 14400 }], needs4988: true },
    { name: "John Doe", employer: null, sources: [], needs4988: true },
  ],
  liquidAssets: 3000,
  preMissing: false,
};

describe("planFill", () => {
  it("maps the household onto the form's fields", () => {
    const { text } = planFill(demo);
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

  it("puts the petitioner's 4988 on the named page and others on the spare pages", () => {
    expect(planFill(demo)).toMatchObject({ applicant4988: true, extra4988Names: ["John Doe"], over4988Capacity: [] });
  });

  it("folds income sources past the second into the third row", () => {
    const many = { ...demo, adults: [{ ...demo.adults[0], sources: [1, 2, 3, 4].map((n) => ({ label: `S${n}`, amount: n * 100 })) }] };
    const { text } = planFill(many);
    expect(text["Third source of income"]).toBe("Jane Doe: S3 $300.00; Jane Doe: S4 $400.00");
    expect(text["Third income. Amount. Indicate whether monthly or annual"]).toBe("$700.00 annual");
  });

  it("reports adults beyond the spare 4988 pages", () => {
    const five = { ...demo, adults: ["A", "B", "C", "D", "E"].map((name) => ({ name, employer: null, sources: [], needs4988: true })) };
    expect(planFill(five)).toMatchObject({ extra4988Names: ["B", "C", "D"], over4988Capacity: ["E"] });
  });
});

describe("fillHopePdf (official 2026 PDF)", () => {
  const pdf = readFileSync("public/forms/2026-hope-application.pdf");

  it("fills fields and keeps only the pages this household needs", async () => {
    const out = await PDFDocument.load(await fillHopePdf(pdf, demo));
    // 21 pages − partner letter (2) − Form 2368 (2) − unused spare 4988s (2)
    expect(out.getPageCount()).toBe(15);
    const form = out.getForm();
    expect(form.getTextField("Petitioner's Name").getText()).toBe("Jane Doe");
    expect(form.getTextField("Principle Residence ZIP Code").getText()).toBe("48200");
    expect(form.getTextField("First source of income").getText()).toBe("Jane Doe: Social Security (SSA-1099)");
    // Shared fields lost the widgets on removed pages, and fields only on removed pages are gone.
    expect(form.getTextField("Petitioner's Name").acroField.getWidgets()).toHaveLength(5) // pages 9, 11, 12, 17, 18;
    expect(() => form.getTextField("Local Unit")).toThrow();
  }, 30000);

  it("keeps Form 2368 when PRE is missing, and drops the petitioner's 4988 when not needed", async () => {
    const d = { ...demo, preMissing: true, adults: [{ ...demo.adults[0], needs4988: false }, demo.adults[1]] };
    const out = await PDFDocument.load(await fillHopePdf(pdf, d));
    expect(out.getPageCount()).toBe(16); // 21 − partner (2) − petitioner 4988 (1) − 2 spares
    expect(out.getForm().getTextField("Local Unit").getText()).toBe("City of Detroit");
  }, 30000);
});
