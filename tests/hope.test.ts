import { describe, expect, it } from "vitest";
import { evaluateHousehold, tierTable, type HouseholdInput } from "@/lib/hope";
import { ASSET_CAP, TIERS, incomeLimit } from "@/lib/config";

const base = (over: Partial<HouseholdInput> = {}): HouseholdInput => ({
  householdSize: 1,
  adults: [{ name: "Jane Doe", annualIncome: 10000, filedTaxReturn: false }],
  liquidAssets: 0,
  currentTaxBill: 2100,
  delinquentAmount: 0,
  preExemptionPercent: 100,
  hardship: false,
  ...over,
});

const oneEarner = (size: number, income: number, hardship = false) =>
  base({ householdSize: size, hardship, adults: [{ name: "A", annualIncome: income, filedTaxReturn: true }] });

const [T100, T75, , , T10] = TIERS;

describe("2026 income table", () => {
  it("matches the published limits", () => {
    expect(incomeLimit(T100, 1)).toBe(21597);
    expect(incomeLimit(T100, 2)).toBe(26015);
    expect(incomeLimit(T75, 3)).toBe(30381);
    expect(incomeLimit(T10, 8)).toBe(105593);
  });

  it("adds the per-member amount above eight", () => {
    expect(incomeLimit(T100, 10)).toBe(54150 + 2 * 5500);
    expect(incomeLimit(T10, 9)).toBe(105593 + 10725);
  });
});

describe("evaluateHousehold", () => {
  it("single senior with SSA income below the limit → 100%, bill $0", () => {
    const r = evaluateHousehold(base({ adults: [{ name: "Jane Doe", annualIncome: 14400, filedTaxReturn: false }] }));
    expect(r.qualified).toBe(true);
    expect(r.tier).toBe(1);
    expect(r.estimatedNewBill).toBe(0);
    expect(r.annualSavings).toBe(2100);
  });

  it("3-person household just above the 100% limit → 75%", () => {
    const r = evaluateHousehold(oneEarner(3, incomeLimit(T100, 3) + 1));
    expect(r.tier).toBe(0.75);
    expect(r.estimatedNewBill).toBe(525);
  });

  it.each(TIERS.filter((t) => !t.requiresHardship).map((t) => [t.label, t] as const))(
    "boundary is inclusive: %s",
    (_label, t) => {
      expect(evaluateHousehold(oneEarner(4, incomeLimit(t, 4))).tier).toBe(t.exemption);
    },
  );

  it("10% tier needs hardship", () => {
    const income = incomeLimit(T10, 2);
    const without = evaluateHousehold(oneEarner(2, income));
    expect(without).toMatchObject({ qualified: false, blocker: "hardship" });
    expect(without.incomeTier?.exemption).toBe(0.1);
    expect(evaluateHousehold(oneEarner(2, income, true))).toMatchObject({ qualified: true, tier: 0.1 });
  });

  it("income above the top tier → not qualified with reason", () => {
    const r = evaluateHousehold(oneEarner(2, incomeLimit(T10, 2) + 1));
    expect(r).toMatchObject({ qualified: false, tier: 0, blocker: "income", estimatedNewBill: 2100 });
    expect(r.reason).toMatch(/over/);
  });

  it("assets over cap → not qualified, ASSET_CAP_EXCEEDED", () => {
    const r = evaluateHousehold(base({ liquidAssets: ASSET_CAP + 1 }));
    expect(r).toMatchObject({ qualified: false, blocker: "assets" });
    expect(r.flags.map((f) => f.code)).toContain("ASSET_CAP_EXCEEDED");
  });

  it("assets block but income still reports the tier it would earn", () => {
    const r = evaluateHousehold({ ...oneEarner(3, incomeLimit(T100, 3) + 1), liquidAssets: ASSET_CAP + 1 });
    expect(r.qualified).toBe(false);
    expect(r.incomeTier).toEqual({ exemption: 0.75, label: "75% exemption" });
  });

  it("over income reports how far over the top limit", () => {
    const r = evaluateHousehold(oneEarner(1, incomeLimit(T10, 1) + 500));
    expect(r.incomeTier).toBeNull();
    expect(r.overIncomeBy).toBe(500);
  });

  it("adults who didn't file a tax return → FORM_4988_NEEDED; null income counts as $0", () => {
    const r = evaluateHousehold(
      base({
        householdSize: 2,
        adults: [
          { name: "Jane Doe", annualIncome: 14400, filedTaxReturn: true },
          { name: "John Doe", annualIncome: null, filedTaxReturn: false },
        ],
      }),
    );
    expect(r.totalIncome).toBe(14400);
    expect(r.flags.filter((f) => f.code === "FORM_4988_NEEDED")).toEqual([{ code: "FORM_4988_NEEDED", person: "John Doe" }]);
  });

  it("PRE at 0 → PRE_MISSING", () => {
    expect(evaluateHousehold(base({ preExemptionPercent: 0 })).flags.map((f) => f.code)).toContain("PRE_MISSING");
  });

  it("delinquent > 0 → DTRF_CHECK", () => {
    expect(evaluateHousehold(base({ delinquentAmount: 4800 })).flags).toContainEqual({ code: "DTRF_CHECK", amount: 4800 });
  });

  it("demo script household → 100%, $2,100 → $0, 4988 for both non-filers, DTRF", () => {
    const r = evaluateHousehold({
      householdSize: 2,
      adults: [
        { name: "Jane Doe", annualIncome: 14400, filedTaxReturn: false },
        { name: "John Doe", annualIncome: null, filedTaxReturn: false },
      ],
      liquidAssets: 3000,
      currentTaxBill: 2100,
      delinquentAmount: 4800,
      preExemptionPercent: 100,
      hardship: false,
    });
    expect(r.tier).toBe(1);
    expect(r.estimatedNewBill).toBe(0);
    expect(r.flags.map((f) => f.code).sort()).toEqual(["DTRF_CHECK", "FORM_4988_NEEDED", "FORM_4988_NEEDED"]);
  });
});

describe("tierTable", () => {
  it("gives limits, new bill and savings for every tier", () => {
    const rows = tierTable(2, 2100);
    expect(rows).toHaveLength(TIERS.length);
    expect(rows[0]).toEqual({ label: "100% exemption", exemption: 1, requiresHardship: false, maxIncome: 26015, newBill: 0, savings: 2100 });
    expect(rows[1].newBill).toBe(525);
    expect(rows[4]).toMatchObject({ savings: 210, requiresHardship: true });
  });

  it("leaves dollars blank without a bill", () => {
    expect(tierTable(1, null)[0]).toMatchObject({ newBill: null, savings: null });
  });
});
