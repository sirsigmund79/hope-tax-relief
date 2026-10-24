// Eligibility numbers, transcribed from the City of Detroit 2026 HOPE Application
// (Board of Review "2026 Process for Reviewing HOPE Application", section 3, page 7).
export const THRESHOLDS_SOURCE = "2026 HOPE Application, Board of Review guidelines";
export const THRESHOLDS_VERIFIED = true;

export const TAX_YEAR = 2026;
export const INCOME_YEAR = 2025; // income and tax returns are for the prior year

// Last day to submit: first Friday in November, by 4:30 p.m. (Eastern Standard Time).
export const DEADLINE = new Date("2026-11-06T16:30:00-05:00");
export const DEADLINE_LABEL = "Friday, November 6, 2026 by 4:30 p.m.";

// Total household assets (bank accounts, other real property, boats, campers, stocks, bonds, IRAs…) shall not exceed this.
export const ASSET_CAP = 12000;

export type Tier = {
  exemption: number;
  label: string;
  limits: readonly number[]; // income limit for household sizes 1..8
  perExtraMember: number; // added per household member above eight
  requiresHardship: boolean; // 10%: only with a 20% income loss or property tax foreclosure
};

// Checked in order: a household gets the first tier whose limit it is at or under.
export const TIERS: readonly Tier[] = [
  { exemption: 1.0, label: "100% exemption", perExtraMember: 5500, requiresHardship: false,
    limits: [21597, 26015, 28782, 33436, 37650, 43150, 48650, 54150] },
  { exemption: 0.75, label: "75% exemption", perExtraMember: 5665, requiresHardship: false,
    limits: [23162, 27707, 30381, 35044, 39533, 44876, 50596, 55775] },
  { exemption: 0.5, label: "50% exemption", perExtraMember: 5830, requiresHardship: false,
    limits: [24884, 29187, 31980, 36651, 41039, 46602, 52056, 57399] },
  { exemption: 0.25, label: "25% exemption", perExtraMember: 6160, requiresHardship: false,
    limits: [28014, 32148, 34912, 39866, 44051, 49623, 54975, 60648] },
  { exemption: 0.1, label: "10% exemption", perExtraMember: 10725, requiresHardship: true,
    limits: [42114, 50729, 56125, 65200, 73418, 84143, 94868, 105593] },
];

export function incomeLimit(tier: Tier, householdSize: number): number {
  const size = Math.max(1, Math.floor(householdSize));
  if (size <= 8) return tier.limits[size - 1];
  return tier.limits[7] + tier.perExtraMember * (size - 8);
}
