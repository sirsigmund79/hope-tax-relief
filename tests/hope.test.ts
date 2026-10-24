import { describe, expect, it } from "vitest";
import { evaluateHousehold, type HouseholdInput } from "@/lib/hope";
import { ASSET_CAP, TIERS, povertyLineFor } from "@/lib/config";

const base = (over: Partial<HouseholdInput> = {}): HouseholdInput => ({
  householdSize: 1,
  adults: [{ name: "Jane Doe", annualIncome: 10000, hasIncomeDoc: true }],
  liquidAssets: 0,
  currentTaxBill: 2100,
  delinquentAmount: 0,
  preExemptionPercent: 100,
  ...over,
});

const oneEarner = (size: number, income: number) =>
  base({ householdSize: size, adults: [{ name: "A", annualIncome: income, hasIncomeDoc: true }] });

describe("evaluateHousehold", () => {
  it("single senior with SSA income below the line → 100%, bill $0", () => {
    const r = evaluateHousehold(base({ adults: [{ name: "Jane Doe", annualIncome: 14400, hasIncomeDoc: true }] }));
    expect(r.qualified).toBe(true);
    expect(r.tier).toBe(1);
    expect(r.estimatedNewBill).toBe(0);
    expect(r.annualSavings).toBe(2100);
  });

  it("3-person household just above the 100% line → 75%", () => {
    const r = evaluateHousehold(oneEarner(3, povertyLineFor(3) + 1));
    expect(r.tier).toBe(0.75);
    expect(r.estimatedNewBill).toBe(525);
  });

  it.each(TIERS.map((t) => [t.label, t.maxIncomeRatio, t.exemption] as const))(
    "boundary is inclusive: %s",
    (_label, ratio, exemption) => {
      const limit = Math.round(povertyLineFor(4) * ratio * 100) / 100;
      expect(evaluateHousehold(oneEarner(4, limit)).tier).toBe(exemption);
    },
  );

  it("income above the top tier → not qualified with reason", () => {
    const r = evaluateHousehold(oneEarner(2, povertyLineFor(2) * 2 + 1));
    expect(r.qualified).toBe(false);
    expect(r.tier).toBe(0);
    expect(r.reason).toMatch(/over/);
    expect(r.estimatedNewBill).toBe(2100);
  });

  it("assets over cap → not qualified, ASSET_CAP_EXCEEDED", () => {
    const r = evaluateHousehold(base({ liquidAssets: ASSET_CAP + 1 }));
    expect(r.qualified).toBe(false);
    expect(r.flags.map((f) => f.code)).toContain("ASSET_CAP_EXCEEDED");
  });

  it("two adults, one with no doc → FORM_4988_NEEDED for that person, counted as $0", () => {
    const r = evaluateHousehold(
      base({
        householdSize: 2,
        adults: [
          { name: "Jane Doe", annualIncome: 14400, hasIncomeDoc: true },
          { name: "John Doe", annualIncome: null, hasIncomeDoc: false },
        ],
      }),
    );
    expect(r.totalIncome).toBe(14400);
    expect(r.flags).toContainEqual({ code: "FORM_4988_NEEDED", person: "John Doe" });
    expect(r.flags.filter((f) => f.code === "FORM_4988_NEEDED")).toHaveLength(1);
    expect(r.packet.some((p) => p.includes("4988") && p.includes("John Doe"))).toBe(true);
  });

  it("PRE at 0 → PRE_MISSING and Form 2368 in packet", () => {
    const r = evaluateHousehold(base({ preExemptionPercent: 0 }));
    expect(r.flags.map((f) => f.code)).toContain("PRE_MISSING");
    expect(r.packet.some((p) => p.includes("2368"))).toBe(true);
  });

  it("delinquent > 0 → DTRF_CHECK", () => {
    const r = evaluateHousehold(base({ delinquentAmount: 4800 }));
    expect(r.flags).toContainEqual({ code: "DTRF_CHECK", amount: 4800 });
  });

  it("demo script household → 100%, $2,100 → $0, 4988 for John, DTRF", () => {
    const r = evaluateHousehold({
      householdSize: 2,
      adults: [
        { name: "Jane Doe", annualIncome: 14400, hasIncomeDoc: true },
        { name: "John Doe", annualIncome: null, hasIncomeDoc: false },
      ],
      liquidAssets: 3000,
      currentTaxBill: 2100,
      delinquentAmount: 4800,
      preExemptionPercent: 100,
    });
    expect(r.tier).toBe(1);
    expect(r.estimatedNewBill).toBe(0);
    expect(r.flags.map((f) => f.code).sort()).toEqual(["DTRF_CHECK", "FORM_4988_NEEDED"]);
  });
});
