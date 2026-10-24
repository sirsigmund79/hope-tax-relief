import { describe, expect, it } from "vitest";
import { evaluateHousehold } from "@/lib/hope";
import { buildPacket, packetProgress, type PacketInput } from "@/lib/packet";

const demo: PacketInput = {
  address: "1234 Example St",
  adults: [
    { name: "Jane Doe", income: 14400, docs: [{ label: "SSA-1099", image: "blob:jane" }] },
    { name: "John Doe", income: null, docs: [] },
  ],
  taxBill: { amount: 2100 },
  incomeStepStarted: true,
};

const evaluate = (pre = 100) =>
  evaluateHousehold({
    householdSize: 2,
    adults: [
      { name: "Jane Doe", annualIncome: 14400, hasIncomeDoc: true },
      { name: "John Doe", annualIncome: null, hasIncomeDoc: false },
    ],
    liquidAssets: 3000,
    currentTaxBill: 2100,
    delinquentAmount: 4800,
    preExemptionPercent: pre,
  });

describe("buildPacket", () => {
  it("builds the demo packet", () => {
    const items = buildPacket(demo, evaluate());
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId.application.status).toBe("prefilled");
    expect(byId["income-0"]).toMatchObject({ status: "ready", person: "Jane Doe" });
    expect(byId["4988-1"]).toMatchObject({ status: "prefilled", person: "John Doe" });
    expect(byId.taxbill.status).toBe("todo");
    expect(byId["2368"]).toBeUndefined();
    expect(packetProgress(items)).toEqual({ done: 3, total: 5 });
  });

  it("adds Form 2368 when PRE is missing", () => {
    expect(buildPacket(demo, evaluate(0)).some((i) => i.kind === "form2368")).toBe(true);
  });

  it("application is todo without an address; scanned bill is ready", () => {
    const items = buildPacket({ ...demo, address: " ", taxBill: { amount: 2100, image: "blob:bill" } }, evaluate());
    expect(items.find((i) => i.id === "application")?.status).toBe("todo");
    expect(items.find((i) => i.id === "taxbill")?.status).toBe("ready");
  });

  it("income typed by hand without a photo is still todo", () => {
    const items = buildPacket(
      { ...demo, adults: [{ name: "Jane Doe", income: 14400, docs: [{ label: "W-2 (typed in)" }] }, demo.adults[1]] },
      evaluate(),
    );
    expect(items.find((i) => i.id === "income-0")?.status).toBe("todo");
  });

  it("before the documents step, nobody is flagged for Form 4988 yet", () => {
    const items = buildPacket({ ...demo, incomeStepStarted: false }, evaluate());
    expect(items.some((i) => i.kind === "form4988")).toBe(false);
    expect(items.find((i) => i.id === "income-1")).toMatchObject({ status: "todo", kind: "income" });
  });
});
