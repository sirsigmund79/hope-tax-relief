import { describe, expect, it } from "vitest";
import { initialState, newPerson, type AppState } from "@/lib/application";
import { nextPage, sectionPages, taskStatus } from "@/lib/flow";
import { TIERS } from "@/lib/config";

const st = (over: Partial<AppState> = {}): AppState => ({ ...initialState(), ...over });

describe("eligibility check", () => {
  it("stops early when you don't own and live in the home", () => {
    expect(nextPage(st({ ownsAndLives: false }), "own-home")).toBe("stop-own");
    expect(nextPage(st({ ownsAndLives: true }), "own-home")).toBe("household-size");
  });

  it("warns about assets but lets you carry on", () => {
    expect(nextPage(st({ assetsOverCap: true }), "assets")).toBe("assets-warning");
    expect(nextPage(st({ assetsOverCap: true }), "assets-warning")).toBe("income-band");
    expect(nextPage(st({ assetsOverCap: false }), "assets")).toBe("income-band");
  });

  it("asks about hardship only for the 10% band", () => {
    const hardshipTier = TIERS.findIndex((t) => t.requiresHardship);
    expect(sectionPages(st({ incomeBand: 0 }), "check")).not.toContain("hardship");
    expect(nextPage(st({ incomeBand: hardshipTier }), "income-band")).toBe("hardship");
    expect(nextPage(st({ incomeBand: hardshipTier, hardship: false }), "hardship")).toBe("stop-income");
    expect(nextPage(st({ incomeBand: TIERS.length }), "income-band")).toBe("stop-income");
  });
});

describe("branching", () => {
  it("skips follow-up pages when the answer is no", () => {
    expect(sectionPages(st({ hasMortgage: false }), "home")).not.toContain("mortgage-details");
    expect(sectionPages(st({ hasMortgage: true }), "home")).toContain("mortgage-details");
    expect(sectionPages(st({ hasAccounts: false, hasVehicles: true }), "savings")).toEqual([
      "accounts", "other-property", "vehicles", "vehicles-list", "life-insurance",
    ]);
  });

  it("asks Form 2368 questions only when the PRE is missing", () => {
    expect(sectionPages(st({ preExemptionPercent: "100" }), "home")).not.toContain("pre-elsewhere");
    expect(sectionPages(st({ preExemptionPercent: "0" }), "home")).toContain("pre-elsewhere");
  });

  it("asks income questions for adults only", () => {
    const kid = { ...newPerson("Grandson"), age: "12" };
    const spouse = { ...newPerson("Spouse"), age: "70" };
    const s = st({ people: [initialState().people[0], spouse, kid] });
    expect(sectionPages(s, "income")).toEqual([
      `income:${s.people[0].id}`, `filed:${s.people[0].id}`, `income:${spouse.id}`, `filed:${spouse.id}`,
    ]);
  });

  it("returns to the task list at the end of a section", () => {
    expect(nextPage(st(), "expenses")).toBe("tasks");
    expect(nextPage(st(), "check-answers")).toBe("results");
  });
});

describe("task list", () => {
  it("unlocks check-and-download only when the other sections are done", () => {
    expect(taskStatus(st(), "send")).toBe("cannot-start");
    const done = st({ completed: ["home", "you", "people", "income", "savings", "money-out"] });
    expect(taskStatus(done, "send")).toBe("not-started");
    expect(taskStatus(done, "home")).toBe("completed");
  });
});
