// The question flow, following GOV.UK "Structuring forms": eligibility questions first,
// one thing per page, and branching so people only see questions that apply to them.
// Pure: which pages exist, in what order, and where "Continue" goes.
import { TIERS } from "./config";
import { adults, evaluate, type AppState } from "./application";

export type SectionId = "check" | "home" | "you" | "people" | "income" | "savings" | "money-out" | "send";

export type Section = { id: SectionId; title: string; summary: string };

export const SECTIONS: Section[] = [
  { id: "check", title: "Check if you can apply", summary: "5 quick questions" },
  { id: "home", title: "Your home", summary: "Scan your tax bill to fill most of this" },
  { id: "you", title: "About you", summary: "Name, age, and how to reach you" },
  { id: "people", title: "People in your home", summary: "Everyone who lives with you" },
  { id: "income", title: "Income", summary: "Photos of W-2s, SSA-1099s, or paystubs" },
  { id: "savings", title: "Savings and property", summary: "Bank accounts, vehicles, insurance" },
  { id: "money-out", title: "Debts and expenses", summary: "What you owe and spend each month" },
  { id: "send", title: "Check and download", summary: "Review, then get your filled application" },
];

/** The application sections shown on the task list (the eligibility check comes before it). */
export const TASKS = SECTIONS.filter((s) => s.id !== "check");

const HARDSHIP_TIER = TIERS.findIndex((t) => t.requiresHardship);

/** Pages in a section, in order, given the answers so far. Branches drop pages that don't apply. */
export function sectionPages(s: AppState, section: SectionId): string[] {
  switch (section) {
    case "check":
      return ["own-home", "household-size", "assets", "income-band", ...(s.incomeBand === HARDSHIP_TIER ? ["hardship"] : []), "tax-bill", "check-result"];
    case "home":
      return [
        "home-bill", "home-details", "home-moved-in", "mortgage",
        ...(s.hasMortgage ? ["mortgage-details"] : []),
        // Form 2368's questions only matter when the bill shows the PRE missing.
        ...(evaluate(s).flags.some((f) => f.code === "PRE_MISSING") ? ["pre-elsewhere"] : []),
      ];
    case "you":
      return ["you-name", "you-contact", "you-marital", "designee", ...(s.hasDesignee ? ["designee-details"] : [])];
    case "people":
      return ["people"];
    case "income":
      return adults(s).flatMap((p) => [`income:${p.id}`, `filed:${p.id}`]);
    case "savings":
      return [
        "accounts", ...(s.hasAccounts ? ["accounts-list"] : []),
        "other-property", ...(s.hasOtherProperty ? ["other-property-list"] : []),
        "vehicles", ...(s.hasVehicles ? ["vehicles-list"] : []),
        "life-insurance", ...(s.hasLifeInsurance ? ["policies-list"] : []),
      ];
    case "money-out":
      return ["debts", ...(s.hasDebts ? ["debts-list"] : []), "expenses"];
    case "send":
      return ["statement", "check-answers"];
  }
}

export function sectionOf(s: AppState, page: string): SectionId | null {
  if (page === "stop-own" || page === "stop-income" || page === "assets-warning") return "check";
  return SECTIONS.find((sec) => sectionPages(s, sec.id).includes(page))?.id ?? null;
}

/** Where "Continue" goes from `page`. Returns "tasks" at the end of a section, "results" after the last one. */
export function nextPage(s: AppState, page: string): string {
  // Eligibility stops: tell people early if they can't apply, so we don't waste their time.
  if (page === "own-home" && s.ownsAndLives === false) return "stop-own";
  if (page === "assets" && s.assetsOverCap === true) return "assets-warning";
  if (page === "assets-warning") return "income-band";
  if (page === "income-band" && s.incomeBand === TIERS.length) return "stop-income";
  if (page === "hardship" && s.hardship === false) return "stop-income";
  if (page === "check-answers") return "results";

  const section = sectionOf(s, page);
  if (!section) return "tasks";
  const pages = sectionPages(s, section);
  const i = pages.indexOf(page);
  return i >= 0 && i < pages.length - 1 ? pages[i + 1] : "tasks";
}

export const firstPage = (s: AppState, section: SectionId) => sectionPages(s, section)[0] ?? "tasks";

export type TaskStatus = "completed" | "not-started" | "cannot-start";

export function taskStatus(s: AppState, section: SectionId): TaskStatus {
  if (s.completed.includes(section)) return "completed";
  // You can only check and download once everything else is done.
  if (section === "send" && TASKS.some((t) => t.id !== "send" && !s.completed.includes(t.id))) return "cannot-start";
  return "not-started";
}
