// All eligibility numbers live here. They are ILLUSTRATIVE until someone checks
// them against the current City of Detroit HOPE guidelines and flips the flag.
export const THRESHOLDS_VERIFIED = false;

// Federal poverty guideline (48 contiguous states, illustrative 2025 values).
export const POVERTY_BASE = 15650; // household of 1
export const POVERTY_PER_ADDITIONAL = 5500;

// Liquid asset cap (cash, savings, etc.). Over this → not eligible.
export const ASSET_CAP = 12000;

// Exemption tiers, checked in order. A household qualifies for the first tier
// whose income limit (povertyLine * maxIncomeRatio) it is at or under.
export const TIERS = [
  { maxIncomeRatio: 1.0, exemption: 1.0, label: "100% exemption" },
  { maxIncomeRatio: 1.25, exemption: 0.75, label: "75% exemption" },
  { maxIncomeRatio: 1.5, exemption: 0.5, label: "50% exemption" },
  { maxIncomeRatio: 1.75, exemption: 0.25, label: "25% exemption" },
  { maxIncomeRatio: 2.0, exemption: 0.1, label: "10% exemption" },
] as const;

export function povertyLineFor(householdSize: number): number {
  const size = Math.max(1, Math.floor(householdSize));
  return POVERTY_BASE + POVERTY_PER_ADDITIONAL * (size - 1);
}
