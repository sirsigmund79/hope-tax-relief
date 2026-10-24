import { ASSET_CAP, TIERS, povertyLineFor } from "./config";

export type Adult = {
  name: string;
  annualIncome: number | null;
  hasIncomeDoc: boolean;
};

export type HouseholdInput = {
  householdSize: number;
  adults: Adult[];
  liquidAssets: number | null;
  currentTaxBill: number | null;
  delinquentAmount: number | null;
  preExemptionPercent: number | null;
};

export type Flag =
  | { code: "FORM_4988_NEEDED"; person: string }
  | { code: "PRE_MISSING" }
  | { code: "DTRF_CHECK"; amount: number }
  | { code: "ASSET_CAP_EXCEEDED"; assets: number; cap: number };

export type TierRow = {
  label: string;
  exemption: number;
  maxIncome: number;
  newBill: number | null;
  savings: number | null;
};

export type Evaluation = {
  qualified: boolean;
  tier: number; // exemption fraction, 0..1
  label: string;
  reason?: string;
  // The tier income alone would earn, even if something else (assets) blocks it.
  incomeTier: { exemption: number; label: string } | null;
  overIncomeBy: number; // 0 unless income is over the top tier
  totalIncome: number;
  povertyLine: number;
  incomeLimit: number; // top of the household's qualifying tier, or of the highest tier
  estimatedNewBill: number | null;
  annualSavings: number | null;
  flags: Flag[];
};

const money = (n: number) => Math.round(n * 100) / 100;

/** Income limits and estimated bills for every tier, for a household size and current bill. */
export function tierTable(householdSize: number, currentTaxBill: number | null): TierRow[] {
  const line = povertyLineFor(householdSize);
  return TIERS.map((t) => {
    const newBill = currentTaxBill === null ? null : money(currentTaxBill * (1 - t.exemption));
    return {
      label: t.label,
      exemption: t.exemption,
      maxIncome: money(line * t.maxIncomeRatio),
      newBill,
      savings: currentTaxBill === null || newBill === null ? null : money(currentTaxBill - newBill),
    };
  });
}

export function evaluateHousehold(input: HouseholdInput): Evaluation {
  const povertyLine = povertyLineFor(input.householdSize);
  const totalIncome = money(
    input.adults.reduce((sum, a) => sum + (a.annualIncome ?? 0), 0),
  );

  const flags: Flag[] = [];
  for (const a of input.adults.filter((a) => !a.hasIncomeDoc)) {
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

  const tier = TIERS.find((t) => totalIncome <= money(povertyLine * t.maxIncomeRatio));
  const topLimit = money(povertyLine * TIERS[TIERS.length - 1].maxIncomeRatio);

  let qualified = false;
  let exemption = 0;
  let label = "Not eligible";
  let reason: string | undefined;

  if (overAssets) {
    reason = `Liquid assets of $${assets.toLocaleString()} are over the $${ASSET_CAP.toLocaleString()} limit.`;
  } else if (!tier) {
    reason = `Household income of $${totalIncome.toLocaleString()} is over the $${topLimit.toLocaleString()} limit for a household of ${input.householdSize}.`;
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
    incomeTier: tier ? { exemption: tier.exemption, label: tier.label } : null,
    overIncomeBy: tier ? 0 : money(totalIncome - topLimit),
    totalIncome,
    povertyLine,
    incomeLimit: tier ? money(povertyLine * tier.maxIncomeRatio) : topLimit,
    estimatedNewBill,
    annualSavings,
    flags,
  };
}
