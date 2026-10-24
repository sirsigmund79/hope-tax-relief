import { describe, expect, it } from "vitest";
import { evaluateHousehold } from "@/lib/hope";
import { buildPacket, packetProgress, type PacketInput } from "@/lib/packet";

const demo: PacketInput = {
  address: "1234 Example St",
  householdSize: 2,
  adults: [
    { name: "Jane Doe", income: 14400, filedTaxReturn: false, docs: [{ label: "SSA-1099", image: "blob:jane" }] },
    { name: "John Doe", income: null, filedTaxReturn: false, docs: [] },
  ],
  taxBill: { amount: 2100 },
  incomeStepStarted: true,
};

const evaluate = (input: PacketInput = demo, pre = 100) =>
  evaluateHousehold({
    householdSize: input.householdSize,
    adults: input.adults.map((a) => ({ name: a.name, annualIncome: a.income, filedTaxReturn: a.filedTaxReturn })),
    liquidAssets: 3000,
    currentTaxBill: 2100,
    delinquentAmount: 4800,
    preExemptionPercent: pre,
    hardship: false,
  });

const ids = (input: PacketInput, pre = 100) => buildPacket(input, evaluate(input, pre)).map((i) => i.id);

describe("buildPacket", () => {
  it("builds the demo packet from the official checklist", () => {
    const items = buildPacket(demo, evaluate());
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(items.map((i) => i.id)).toEqual(["application", "ownership", "id", "income-0", "4988-0", "4988-1"]);
    expect(byId.application.status).toBe("prefilled");
    expect(byId["income-0"]).toMatchObject({ status: "ready", person: "Jane Doe" });
    expect(byId["4988-1"]).toMatchObject({ status: "prefilled", person: "John Doe" });
    expect(packetProgress(items)).toEqual({ done: 4, total: 6 });
  });

  it("adults who filed need their tax returns instead of Form 4988", () => {
    const filed = { ...demo, adults: [{ ...demo.adults[0], filedTaxReturn: true }, demo.adults[1]] };
    const items = ids(filed);
    expect(items).toContain("return-0");
    expect(items).not.toContain("4988-0");
  });

  it("asks for minors' proof of residency when the household has children", () => {
    expect(ids({ ...demo, householdSize: 4 })).toContain("minors");
    expect(ids(demo)).not.toContain("minors");
  });

  it("adds Form 2368 when PRE is missing", () => {
    expect(ids(demo, 0)).toContain("2368");
  });

  it("application is todo without an address; tax bill appears only when scanned", () => {
    const items = buildPacket({ ...demo, address: " ", taxBill: { amount: 2100, image: "blob:bill" } }, evaluate());
    expect(items.find((i) => i.id === "application")?.status).toBe("todo");
    expect(items.find((i) => i.id === "taxbill")?.status).toBe("ready");
    expect(ids(demo)).not.toContain("taxbill");
  });

  it("income typed by hand without a photo is still todo", () => {
    const typed = { ...demo, adults: [{ ...demo.adults[0], docs: [{ label: "W-2 (typed in)" }] }, demo.adults[1]] };
    expect(buildPacket(typed, evaluate(typed)).find((i) => i.id === "income-0")?.status).toBe("todo");
  });

  it("before the documents step, nobody is flagged for Form 4988 yet", () => {
    const items = buildPacket({ ...demo, incomeStepStarted: false, adults: [demo.adults[1]] }, evaluate());
    expect(items.some((i) => i.kind === "form4988")).toBe(false);
    expect(items.find((i) => i.id === "income-0")).toMatchObject({ status: "todo", kind: "income" });
  });
});
