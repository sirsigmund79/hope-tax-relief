"use client";

import { ASSET_CAP, DEADLINE_LABEL, INCOME_YEAR, TIERS } from "@/lib/config";
import { evaluate, householdSize, incomeBands, liquidAssets } from "@/lib/application";
import { tierTable } from "@/lib/hope";
import { num, usd } from "@/lib/format";
import { Input, Radios, YesNo } from "../form";
import TierTable from "../TierTable";
import { Button } from "../ui";
import { Inset, ScanCard, answered, type Ctx, type PageSpec } from "./shared";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function checkPage(page: string, { s, set, go }: Ctx): PageSpec | null {
  switch (page) {
    case "own-home":
      return {
        title: "Do you own and live in this home?",
        hint: `It must be in Detroit and be your main home, where you lived on December 31, ${INCOME_YEAR}. Buying on a land contract counts as owning.`,
        body: <YesNo legend="Own and live in the home" value={s.ownsAndLives} onChange={(v) => set({ ownsAndLives: v })} />,
        validate: answered(s.ownsAndLives, "Select yes if you own and live in this home"),
      };
    case "stop-own":
      return {
        title: "You can only get HOPE for a home you own and live in",
        body: (
          <>
            <p>HOPE lowers property tax on the owner&apos;s main home. If you rent, you may qualify for Michigan&apos;s Homestead Property Tax Credit instead.</p>
            <Button variant="secondary" onClick={() => go("own-home")}>Change my answer</Button>
          </>
        ),
        noContinue: true,
      };
    case "household-size":
      return {
        title: "How many people live in your home, including you?",
        hint: "Count everyone: adults, children, relatives, and anyone renting a room.",
        body: <Input label="Number of people" value={s.householdSize} onChange={(v) => set({ householdSize: v.replace(/\D/g, "") })} inputMode="numeric" width="short" />,
        validate: () => ((num(s.householdSize) ?? 0) >= 1 ? null : "Enter how many people live in your home"),
      };
    case "assets":
      return {
        title: `Does everyone in your home have more than ${usd(ASSET_CAP)} in savings and other assets, added together?`,
        hint: "Count bank accounts, cash, stocks, bonds, IRAs, other property, boats, and campers. Don't count this home.",
        body: <YesNo legend="Assets over the limit" value={s.assetsOverCap} onChange={(v) => set({ assetsOverCap: v })} />,
        validate: answered(s.assetsOverCap, "Select yes or no"),
      };
    case "assets-warning":
      return {
        title: "You probably can't get HOPE with that much in assets",
        body: (
          <>
            <p>The Board of Review&apos;s 2026 guidelines say household assets <b>shall not exceed {usd(ASSET_CAP)}</b>. You can still apply, and the Board looks at each case, but it usually denies applications over the limit.</p>
            <Button variant="secondary" onClick={() => go("assets")}>Change my answer</Button>
          </>
        ),
        continueLabel: "Continue anyway",
      };
    case "income-band": {
      const size = householdSize(s);
      const { bands, over } = incomeBands(size);
      return {
        title: "What was your household's total income last year, before tax?",
        hint: <>Add up everyone in your home for {INCOME_YEAR}: wages, Social Security, pensions, child support, and any other money. A rough answer is fine; your documents will confirm it.</>,
        body: (
          <Radios
            legend="Household income"
            value={s.incomeBand}
            onChange={(v) => set({ incomeBand: v, hardship: null })}
            options={[
              ...bands.map((b) => ({
                value: b.tier,
                label: b.lo === null ? `${usd(b.hi)} or less` : `${usd(b.lo)} to ${usd(b.hi)}`,
                hint: TIERS[b.tier].requiresHardship
                  ? `${pct(b.exemption)} off, only if income dropped 20% or the home is in tax foreclosure`
                  : `About ${pct(b.exemption)} off your property tax`,
              })),
              { value: over.tier, label: `More than ${usd(over.lo - 1)}`, hint: undefined },
            ]}
          />
        ),
        validate: answered(s.incomeBand, "Select your household income"),
      };
    }
    case "hardship":
      return {
        title: "Has your household income dropped by 20% or more, or is your home in property tax foreclosure?",
        hint: "At your income, HOPE can only give a 10% exemption, and only in one of these situations.",
        body: <YesNo legend="Hardship" value={s.hardship} onChange={(v) => set({ hardship: v })} />,
        validate: answered(s.hardship, "Select yes or no"),
      };
    case "stop-income":
      return {
        title: "Your income is probably too high for HOPE",
        body: (
          <>
            <p>For a household of {householdSize(s)}, the 2026 limit is {usd(incomeBands(householdSize(s)).bands.at(-2)!.hi)}, or {usd(incomeBands(householdSize(s)).bands.at(-1)!.hi)} with a 20% income drop or tax foreclosure.</p>
            <p>Other help: a payment plan with the Wayne County Treasurer, or Michigan&apos;s Homestead Property Tax Credit when you file your state taxes.</p>
            <Button variant="secondary" onClick={() => go("income-band")}>Change my answer</Button>
          </>
        ),
        noContinue: true,
      };
    case "tax-bill":
      return {
        title: "How much is your property tax bill?",
        hint: "Scan your bill and we'll read the amount, plus your address and parcel number for the application. Or type the amount. You can skip this.",
        body: (
          <>
            <ScanCard
              label="Scan your tax bill"
              done={!!s.billImage}
              image={s.billImage || undefined}
              onRead={(d, _ok, url) => set(billPatch(s, d, url))}
            />
            <Input label="Yearly property tax" money width="half" value={s.currentTaxBill} onChange={(v) => set({ currentTaxBill: v })} />
          </>
        ),
      };
    case "check-result": {
      const r = evaluate(s);
      const bill = num(s.currentTaxBill);
      const tier = r.incomeTier;
      const likely = r.qualified && tier;
      return {
        title: likely
          ? bill !== null && r.annualSavings ? `You could save about ${usd(r.annualSavings)} a year` : `You could get a ${tier.label}`
          : "You can still apply, but you may not qualify",
        hint: likely ? <>That&apos;s a <b>{tier.label}</b>{bill !== null && <>: your {usd(bill)} bill would be about <b>{usd(r.estimatedNewBill)}</b></>}. The Board of Review makes the final decision.</> : r.reason,
        body: (
          <>
            <TierTable rows={tierTable(householdSize(s), bill)} householdSize={householdSize(s)} highlight={tier?.exemption} />
            <div className="rounded-lg bg-red-50 p-3 text-red-900"><b>Deadline:</b> {DEADLINE_LABEL}</div>
            <div>
              <h2 className="text-lg font-semibold">What happens next</h2>
              <p className="mt-1">We&apos;ll fill in the official 2026 HOPE application with you, in short sections. Have these nearby; you can photograph them instead of typing:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Your property tax bill</li>
                <li>{INCOME_YEAR} W-2s, SSA-1099s, or paystubs for every adult</li>
                <li>Bank statements, and your mortgage statement if you have one</li>
              </ul>
            </div>
            {liquidAssets(s) !== null && liquidAssets(s)! > ASSET_CAP && <Inset>Remember: assets over {usd(ASSET_CAP)} usually mean the application is denied.</Inset>}
          </>
        ),
        continueLabel: "Start your application",
      };
    }
  }
  return null;
}

/** What a tax bill photo fills in. Only empty answers are overwritten, so a re-scan never clobbers edits. */
export function billPatch(s: Ctx["s"], d: Partial<import("@/lib/schema").Extraction>, url: string): Partial<Ctx["s"]> {
  const keep = (cur: string, v: string | number | null | undefined) => (cur.trim() ? cur : v == null ? cur : String(v));
  const owner = d.personName && !s.people[0].name ? [{ ...s.people[0], name: d.personName }, ...s.people.slice(1)] : s.people;
  return {
    billImage: url,
    currentTaxBill: keep(s.currentTaxBill, d.taxBillAmount),
    delinquentAmount: keep(s.delinquentAmount, d.delinquentAmount),
    preExemptionPercent: keep(s.preExemptionPercent, d.preExemptionPercent),
    parcelNumber: keep(s.parcelNumber, d.parcelNumber),
    address: keep(s.address, d.propertyAddress),
    people: owner,
  };
}
