import { describe, expect, it } from "vitest";
import { applicationData, evaluate, householdInput, incomeBands, initialState, liquidAssets, newPerson, type AppState, type DocEntry } from "@/lib/application";
import { ASSET_CAP } from "@/lib/config";

const doc = (over: Partial<DocEntry>): DocEntry => ({
  id: "d", filename: "x.png", status: "done", manual: false, docType: "SSA_1099", income: "14400", personName: null,
  employerName: null, employerAddress: null, confidence: "high", issues: [], ...over,
});

const demo = (): AppState => {
  const s = initialState();
  const john = { ...newPerson("Spouse"), name: "John Doe", age: "70" };
  return {
    ...s,
    ownsAndLives: true, householdSize: "2", assetsOverCap: false, incomeBand: 0, currentTaxBill: "2100", delinquentAmount: "4800",
    address: "1234 Example St, Detroit, MI 48200", preExemptionPercent: "100", movedIn: "2013-06",
    maritalStatus: "Married", hasMortgage: false, hasAccounts: true,
    accounts: [{ id: "a", institution: "Example CU", balance: "3000", owner: "Jane Doe", interestRate: "", investment: false }],
    people: [{ ...s.people[0], name: "Jane Doe", age: "68", docs: [doc({})] }, john],
  };
};

describe("income bands", () => {
  it("covers the 2026 table without gaps", () => {
    const { bands, over } = incomeBands(2);
    expect(bands.map((b) => [b.lo, b.hi])).toEqual([
      [null, 26015], [26016, 27707], [27708, 29187], [29188, 32148], [32149, 50729],
    ]);
    expect(over.lo).toBe(50730);
  });
});

describe("selectors", () => {
  it("uses the self-reported band until there are documents", () => {
    const s = { ...demo(), people: demo().people.map((p) => ({ ...p, docs: [] })) };
    expect(householdInput(s).adults[0].annualIncome).toBe(26015);
    expect(householdInput(demo()).adults[0].annualIncome).toBe(14400);
  });

  it("uses itemized accounts once given, else the eligibility answer", () => {
    expect(liquidAssets(demo())).toBe(3000);
    expect(liquidAssets({ ...initialState(), assetsOverCap: true })).toBe(ASSET_CAP + 1);
    expect(liquidAssets({ ...initialState(), hasAccounts: false, assetsOverCap: true })).toBe(0);
  });

  it("demo household: 100%, 4988 for both, application data derived", () => {
    const s = demo();
    const r = evaluate(s);
    expect(r.tier).toBe(1);
    const d = applicationData(s, r, new Date("2026-10-24"));
    expect(d).toMatchObject({
      maritalStatus: "Married", spouseAge: "70", dependents: 0, lengthAtResidence: "13 years", occupiedSince: "06/01/2013",
      ownAndOccupy: true, mortgage: null, employer: null,
    });
    expect(d.people.map((p) => [p.name, p.relationship, p.needs4988])).toEqual([["Jane Doe", "SELF", true], ["John Doe", "Spouse", true]]);
    expect(d.vehicles).toBeUndefined(); // not answered yet → left blank, not N/A
  });

  it("children aren't adults and count as dependents", () => {
    const s = demo();
    s.people.push({ ...newPerson("Grandson"), name: "Jimmy", age: "12" });
    const d = applicationData(s, evaluate(s));
    expect(d.dependents).toBe(1);
    expect(d.people[2]).toMatchObject({ adult: false, needs4988: false });
  });
});
