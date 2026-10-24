"use client";

import { EXPENSES, newId, type Account, type Debt, type OtherProperty, type Policy, type Vehicle } from "@/lib/application";
import { AddAnother, Input, Radios, YesNo } from "../form";
import { ScanCard, answered, type Ctx, type PageSpec } from "./shared";

const needs = (list: { id: string }[], noun: string) => () => (list.length ? null : `Add at least one ${noun}, or go back and answer no`);

export function moneyPage(page: string, { s, set }: Ctx): PageSpec | null {
  switch (page) {
    case "accounts":
      return {
        title: "Does anyone in your home have a bank account, credit union account, or investments?",
        hint: "Checking, savings, CDs, stocks, bonds, or retirement accounts like an IRA.",
        body: <YesNo legend="Accounts" value={s.hasAccounts} onChange={(v) => set({ hasAccounts: v })} />,
        validate: answered(s.hasAccounts, "Select yes or no"),
      };
    case "accounts-list":
      return {
        title: "Your accounts",
        hint: "Scan a recent statement for each account, or type the details. Never enter account numbers.",
        body: (
          <>
            <ScanCard
              label="Scan a statement"
              onRead={(d) => set({
                accounts: [...s.accounts, {
                  id: newId(), institution: d.institutionName ?? "", owner: d.personName ?? "", interestRate: "", investment: false,
                  balance: d.accountBalance == null ? "" : String(d.accountBalance),
                }],
              })}
            />
            <AddAnother<Account>
              items={s.accounts}
              onChange={(accounts) => set({ accounts })}
              noun="account"
              max={3}
              make={() => ({ id: newId(), institution: "", balance: "", owner: "", interestRate: "", investment: false })}
              render={(a, up) => (
                <>
                  <Input label="Bank, credit union, or company" value={a.institution} onChange={(v) => up({ institution: v })} />
                  <Input label={a.investment ? "Current value" : "Balance"} money width="half" value={a.balance} onChange={(v) => up({ balance: v })} />
                  <Input label="Name on the account" value={a.owner} onChange={(v) => up({ owner: v })} />
                  <label className="flex gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-blue-700" checked={a.investment} onChange={(e) => up({ investment: e.target.checked })} />This is an investment (stocks, bonds, IRA)</label>
                </>
              )}
            />
          </>
        ),
        validate: needs(s.accounts, "account"),
      };
    case "other-property":
      return {
        title: "Does anyone in your home own, or are they buying, any other property?",
        hint: "Another house, land, or side lots next to your home.",
        body: <YesNo legend="Other property" value={s.hasOtherProperty} onChange={(v) => set({ hasOtherProperty: v })} />,
        validate: answered(s.hasOtherProperty, "Select yes or no"),
      };
    case "other-property-list":
      return {
        title: "Your other property",
        hint: "The amounts are on that property's tax bill.",
        body: (
          <AddAnother<OtherProperty>
            items={s.otherProperties}
            onChange={(otherProperties) => set({ otherProperties })}
            noun="property"
            max={2}
            make={() => ({ id: newId(), address: "", owners: "", assessedValue: "", lastTaxesPaid: "", taxesPaid: "" })}
            render={(p, up) => (
              <>
                <Input label="Address" value={p.address} onChange={(v) => up({ address: v })} />
                <Input label="Owner names" value={p.owners} onChange={(v) => up({ owners: v })} />
                <Input label="Assessed value" money width="half" value={p.assessedValue} onChange={(v) => up({ assessedValue: v })} />
                <Input label="Date taxes were last paid" width="half" placeholder="MM/YYYY" value={p.lastTaxesPaid} onChange={(v) => up({ lastTaxesPaid: v })} />
                <Input label="Amount of taxes paid" money width="half" value={p.taxesPaid} onChange={(v) => up({ taxesPaid: v })} />
              </>
            )}
          />
        ),
        validate: needs(s.otherProperties, "property"),
      };
    case "vehicles":
      return {
        title: "Does anyone in your home own a vehicle?",
        hint: "Cars, trucks, motorcycles, motor homes, or camper trailers.",
        body: <YesNo legend="Vehicles" value={s.hasVehicles} onChange={(v) => set({ hasVehicles: v })} />,
        validate: answered(s.hasVehicles, "Select yes or no"),
      };
    case "vehicles-list":
      return {
        title: "Your vehicles",
        body: (
          <AddAnother<Vehicle>
            items={s.vehicles}
            onChange={(vehicles) => set({ vehicles })}
            noun="vehicle"
            max={2}
            make={() => ({ id: newId(), make: "", year: "", monthlyPayment: "", balanceOwed: "" })}
            render={(v, up) => (
              <>
                <Input label="Make and model" placeholder="Ford Focus" value={v.make} onChange={(x) => up({ make: x })} />
                <Input label="Year" width="short" inputMode="numeric" value={v.year} onChange={(x) => up({ year: x.replace(/\D/g, "").slice(0, 4) })} />
                <Input label="Monthly payment" hint="0 if it's paid off" money width="half" value={v.monthlyPayment} onChange={(x) => up({ monthlyPayment: x })} />
                <Input label="Amount still owed" money width="half" value={v.balanceOwed} onChange={(x) => up({ balanceOwed: x })} />
              </>
            )}
          />
        ),
        validate: needs(s.vehicles, "vehicle"),
      };
    case "life-insurance":
      return {
        title: "Does anyone in your home have life insurance?",
        body: <YesNo legend="Life insurance" value={s.hasLifeInsurance} onChange={(v) => set({ hasLifeInsurance: v })} />,
        validate: answered(s.hasLifeInsurance, "Select yes or no"),
      };
    case "policies-list":
      return {
        title: "Your life insurance",
        body: (
          <AddAnother<Policy>
            items={s.policies}
            onChange={(policies) => set({ policies })}
            noun="policy"
            max={3}
            make={() => ({ id: newId(), insured: "", amount: "", monthlyPayment: "", paidInFull: "", beneficiary: "", relationship: "" })}
            render={(p, up) => (
              <>
                <Input label="Who is insured" value={p.insured} onChange={(v) => up({ insured: v })} />
                <Input label="Policy amount" money width="half" value={p.amount} onChange={(v) => up({ amount: v })} />
                <Input label="Monthly payment" money width="half" value={p.monthlyPayment} onChange={(v) => up({ monthlyPayment: v })} />
                <div>
                  <p className="font-medium">Is it paid in full?</p>
                  <Radios legend="Paid in full" value={p.paidInFull || null} onChange={(v) => up({ paidInFull: v })} options={[{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }]} />
                </div>
                <Input label="Beneficiary" value={p.beneficiary} onChange={(v) => up({ beneficiary: v })} />
                <Input label="Beneficiary's relationship to the insured" value={p.relationship} onChange={(v) => up({ relationship: v })} />
              </>
            )}
          />
        ),
        validate: needs(s.policies, "policy"),
      };
    case "debts":
      return {
        title: "Does anyone in your home owe money on a debt?",
        hint: "Credit cards, car loans, medical bills, student loans, personal or payday loans. Not your mortgage.",
        body: <YesNo legend="Debts" value={s.hasDebts} onChange={(v) => set({ hasDebts: v })} />,
        validate: answered(s.hasDebts, "Select yes or no"),
      };
    case "debts-list":
      return {
        title: "Your debts",
        hint: "Rough amounts are fine.",
        body: (
          <AddAnother<Debt>
            items={s.debts}
            onChange={(debts) => set({ debts })}
            noun="debt"
            max={8}
            make={() => ({ id: newId(), creditor: "", purpose: "", date: "", originalBalance: "", monthlyPayment: "", balanceOwed: "" })}
            render={(d, up) => (
              <>
                <Input label="Who is it owed to" placeholder="Capital One" value={d.creditor} onChange={(v) => up({ creditor: v })} />
                <Input label="What it was for" placeholder="Credit card" value={d.purpose} onChange={(v) => up({ purpose: v })} />
                <Input label="When it started" width="half" placeholder="MM/YYYY" value={d.date} onChange={(v) => up({ date: v })} />
                <Input label="Original amount" money width="half" value={d.originalBalance} onChange={(v) => up({ originalBalance: v })} />
                <Input label="Monthly payment" money width="half" value={d.monthlyPayment} onChange={(v) => up({ monthlyPayment: v })} />
                <Input label="Amount still owed" money width="half" value={d.balanceOwed} onChange={(v) => up({ balanceOwed: v })} />
              </>
            )}
          />
        ),
        validate: needs(s.debts, "debt"),
      };
    case "expenses":
      return {
        title: "What does your household spend each month?",
        hint: "Rough amounts are fine. Leave blank anything you don't pay; we'll write N/A, as the form asks.",
        body: (
          <div className="grid grid-cols-2 gap-3">
            {EXPENSES.map(([key, label]) => (
              <Input key={key} label={label} money value={s.expenses[key]} onChange={(v) => set({ expenses: { ...s.expenses, [key]: v } })} />
            ))}
          </div>
        ),
      };
    case "statement":
      return {
        title: "Is there anything else you want the Board of Review to know?",
        hint: "For example, a job loss, medical bills, or a death in the family. This is optional.",
        body: (
          <div>
            <textarea
              aria-label="Statement"
              maxLength={250}
              rows={4}
              value={s.statement}
              onChange={(e) => set({ statement: e.target.value })}
              className="w-full rounded-lg border-2 border-slate-400 p-3 focus:border-blue-700 focus:outline-none"
            />
            <p className="text-sm text-slate-500">{250 - s.statement.length} characters left. The form&apos;s statement box is one line; attach a page for more.</p>
          </div>
        ),
      };
  }
  return null;
}
