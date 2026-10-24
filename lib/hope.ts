import { ASSET_CAP, TIERS, incomeLimit } from "./config";

export type Adult = {
  name: string;
  annualIncome: number | null;
  // Every adult gives either complete federal + state tax returns, or a Form 4988 (not required to file).
  filedTaxReturn: boolean;
};

export type HouseholdInput = {
  householdSize: number;
  adults: Adult[];
  liquidAssets: number | null;
  currentTaxBill: number | null;
  delinquentAmount: number | null;
  preExemptionPercent: number | null;
  // 20%+ drop in household income, or the home is subject to property tax foreclosure. Unlocks the 10% tier.
  hardship: boolean;
};

export type Flag =
  | { code: "FORM_4988_NEEDED"; person: string }
  | { code: "PRE_MISSING" }
  | { code: "DTRF_CHECK"; amount: number }
  | { code: "ASSET_CAP_EXCEEDED"; assets: number; cap: number };

export type TierRow = {
  label: string;
  exemption: number;
  requiresHardship: boolean;
  maxIncome: number;
  newBill: number | null;
  savings: number | null;
};

export type Evaluation = {
  qualified: boolean;
  tier: number; // exemption fraction, 0..1
  label: string;
  reason?: string;
  blocker: "assets" | "income" | "hardship" | null;
  // The tier income alone would earn, even if something else (assets) blocks it.
  incomeTier: { exemption: number; label: string } | null;
  overIncomeBy: number; // 0 unless income is over the top tier
  totalIncome: number;
  fullExemptionLimit: number; // 100% tier limit for this household size
  incomeLimit: number; // top of the household's qualifying tier, or of the highest tier
  estimatedNewBill: number | null;
  annualSavings: number | null;
  flags: Flag[];
};

const money = (n: number) => Math.round(n * 100) / 100;

/** Income limits and estimated bills for every tier, for a household size and current bill. */
export function tierTable(householdSize: number, currentTaxBill: number | null): TierRow[] {
  return TIERS.map((t) => {
    const newBill = currentTaxBill === null ? null : money(currentTaxBill * (1 - t.exemption));
    return {
      label: t.label,
      exemption: t.exemption,
      requiresHardship: t.requiresHardship,
      maxIncome: incomeLimit(t, householdSize),
      newBill,
      savings: currentTaxBill === null || newBill === null ? null : money(currentTaxBill - newBill),
    };
  });
}

export function evaluateHousehold(input: HouseholdInput): Evaluation {
  const totalIncome = money(
    input.adults.reduce((sum, a) => sum + (a.annualIncome ?? 0), 0),
  );

  const flags: Flag[] = [];
  for (const a of input.adults.filter((a) => !a.filedTaxReturn)) {
    flags.push({ code: "FORM_4988_NEEDED", person: a.name });
  }

  if (input.preExemptionPercent !== null && input.preExemptionPercent < 100) {
    flags.push({ code: "PRE_MISSING" });
  }

  if (input.delinquentAmount && input.delinquentAmount > 0) {
    flags.push({ code: "DTRF_CHECK", amount: input.delinquentAmount });
  }

  const assets = input.liquidAssets ?? 0;
  const overAssets = assets > ASSET_CAP;
  if (overAssets) flags.push({ code: "ASSET_CAP_EXCEEDED", assets, cap: ASSET_CAP });

  const size = input.householdSize;
  const tier = TIERS.find((t) => totalIncome <= incomeLimit(t, size));
  const topLimit = incomeLimit(TIERS[TIERS.length - 1], size);

  let qualified = false;
  let exemption = 0;
  let label = "Not eligible";
  let reason: string | undefined;
  let blocker: Evaluation["blocker"] = null;

  if (overAssets) {
    blocker = "assets";
    reason = `Household assets of $${assets.toLocaleString()} are over the $${ASSET_CAP.toLocaleString()} limit.`;
  } else if (!tier) {
    blocker = "income";
    reason = `Household income of $${totalIncome.toLocaleString()} is over the $${topLimit.toLocaleString()} limit for a household of ${size}.`;
  } else if (tier.requiresHardship && !input.hardship) {
    blocker = "hardship";
    reason = "Your income fits only the 10% tier, which requires a 20% loss in household income or a home in property tax foreclosure.";
  } else {
    qualified = true;
    exemption = tier.exemption;
    label = tier.label;
  }

  const bill = input.currentTaxBill;
  const estimatedNewBill = bill === null ? null : money(bill * (1 - exemption));
  const annualSavings = bill === null || estimatedNewBill === null ? null : money(bill - estimatedNewBill);

  return {
    qualified,
    tier: exemption,
    label,
    reason,
    blocker,
    incomeTier: tier ? { exemption: tier.exemption, label: tier.label } : null,
    overIncomeBy: tier ? 0 : money(totalIncome - topLimit),
    totalIncome,
    fullExemptionLimit: incomeLimit(TIERS[0], size),
    incomeLimit: tier ? incomeLimit(tier, size) : topLimit,
    estimatedNewBill,
    annualSavings,
    flags,
  };
}
