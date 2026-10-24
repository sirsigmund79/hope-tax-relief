"use client";

import { INCOME_YEAR } from "@/lib/config";
import { MARITAL, defaultFiled, householdSize, newPerson, personLabel, type Person } from "@/lib/application";
import DocList from "../DocList";
import { Input, Radios, YesNo } from "../form";
import { Inset, ScanCard, answered, type Ctx, type PageSpec } from "./shared";
import { billPatch } from "./check";

const RELATIONSHIPS = ["Spouse", "Partner", "Son", "Daughter", "Grandchild", "Parent", "Brother", "Sister", "Other relative", "Friend or roommate"];

export function householdPage(page: string, ctx: Ctx): PageSpec | null {
  const { s, set, update } = ctx;
  const setPerson = (id: string, patch: Partial<Person>) =>
    update((st) => ({ ...st, people: st.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  if (page.startsWith("income:") || page.startsWith("filed:")) {
    const id = page.split(":")[1];
    const i = s.people.findIndex((p) => p.id === id);
    const p = s.people[i];
    if (!p) return null;
    const you = i === 0;
    const who = you ? "you" : personLabel(p, i);
    if (page.startsWith("income:")) {
      return {
        title: you ? "Add your income documents" : `Add ${who}'s income documents`,
        hint: <>Take a photo of each {INCOME_YEAR} W-2, SSA-1099 (Social Security), or paystub. We&apos;ll read the amounts{you && " and your employer"}.</>,
        body: (
          <>
            <DocList docs={p.docs} onChange={(fn) => update((st) => ({ ...st, people: st.people.map((x) => (x.id === id ? { ...x, docs: fn(x.docs), noIncome: false } : x)) }))} />
            {p.docs.length === 0 && (
              <label className="flex gap-3 rounded-lg border-2 border-slate-300 bg-white p-3">
                <input type="checkbox" className="h-5 w-5 accent-blue-700" checked={p.noIncome} onChange={(e) => setPerson(id, { noIncome: e.target.checked })} />
                <span>{you ? "I" : who} had no income in {INCOME_YEAR}</span>
              </label>
            )}
          </>
        ),
        validate: () =>
          p.docs.some((d) => d.status === "loading") ? "Wait for the photos to finish reading"
          : p.docs.length || p.noIncome ? null
          : `Add a document, or tick "no income"`,
      };
    }
    const guess = defaultFiled(p);
    return {
      title: you ? `Did you file a ${INCOME_YEAR} tax return?` : `Did ${who} file a ${INCOME_YEAR} tax return?`,
      hint: "People whose only income is Social Security usually don't have to file.",
      body: (
        <Radios
          legend="Filed a tax return"
          value={p.filedTaxReturn}
          onChange={(v) => setPerson(id, { filedTaxReturn: v })}
          options={[
            { value: true, label: "Yes", hint: "Bring the complete federal and state returns, with all schedules" },
            { value: false, label: "No, not required to", hint: "We'll fill in Form 4988 for them to sign" },
          ]}
        />
      ),
      validate: answered(p.filedTaxReturn, guess ? "Select yes if they filed (W-2 earners usually do)" : "Select yes or no"),
    };
  }

  switch (page) {
    case "home-bill":
      return {
        title: "Add a photo of your property tax bill",
        hint: "We'll read your address, parcel number, and amounts from it, so you don't have to type them.",
        body: <ScanCard label="Scan your tax bill" done={!!s.billImage} image={s.billImage || undefined} onRead={(d, _ok, url) => set(billPatch(s, d, url))} />,
        continueLabel: s.billImage ? "Continue" : "Continue without a photo",
      };
    case "home-details":
      return {
        title: s.billImage ? "Check the details from your tax bill" : "Your property details",
        body: (
          <>
            <Input label="Home address" value={s.address} onChange={(v) => set({ address: v })} autoComplete="street-address" hint="Street, city, and ZIP code" />
            <Input label="Parcel number" value={s.parcelNumber} onChange={(v) => set({ parcelNumber: v })} hint="On your tax bill, near the top. You can leave it blank." width="half" />
            <Input label="PRE %" value={s.preExemptionPercent} onChange={(v) => set({ preExemptionPercent: v })} hint="Principal Residence Exemption, on your bill. Usually 100." width="short" inputMode="numeric" />
            <Input label="Past-due property taxes" money value={s.delinquentAmount} onChange={(v) => set({ delinquentAmount: v })} hint="Leave blank if you're caught up." width="half" />
          </>
        ),
        validate: () => (s.address.trim() ? null : "Enter your home address"),
      };
    case "home-moved-in": {
      const [y, m] = s.movedIn.split("-");
      const setYM = (yy: string, mm: string) => set({ movedIn: `${yy}-${mm}` });
      return {
        title: "When did you start living in this home?",
        hint: "For example, 6 2013. A rough date is fine.",
        body: (
          <div className="flex gap-3">
            <Input label="Month" width="short" inputMode="numeric" value={m ? String(Number(m)) : ""} onChange={(v) => setYM(y ?? "", v.replace(/\D/g, "").slice(0, 2).padStart(2, "0"))} />
            <Input label="Year" width="short" inputMode="numeric" value={y ?? ""} onChange={(v) => setYM(v.replace(/\D/g, "").slice(0, 4), m ?? "01")} />
          </div>
        ),
        validate: () => {
          const mm = Number(m), yy = Number(y);
          return yy >= 1900 && yy <= new Date().getFullYear() && mm >= 1 && mm <= 12 ? null : "Enter the month and year you moved in";
        },
      };
    }
    case "mortgage":
      return {
        title: "Do you have a mortgage or land contract on this home?",
        body: <YesNo legend="Mortgage" value={s.hasMortgage} onChange={(v) => set({ hasMortgage: v })} />,
        validate: answered(s.hasMortgage, "Select yes or no"),
      };
    case "mortgage-details":
      return {
        title: "Your mortgage or land contract",
        hint: "Scan a recent statement to fill this in, or type it.",
        body: (
          <>
            <ScanCard
              label="Scan a mortgage statement"
              done={!!s.lender}
              onRead={(d) => set({
                lender: s.lender || d.lenderName || "",
                loanBalance: s.loanBalance || (d.loanBalance == null ? "" : String(d.loanBalance)),
                mortgagePayment: s.mortgagePayment || (d.monthlyPayment == null ? "" : String(d.monthlyPayment)),
              })}
            />
            <Input label="Lender or land contract holder" value={s.lender} onChange={(v) => set({ lender: v })} />
            <Input label="Amount still owed" money width="half" value={s.loanBalance} onChange={(v) => set({ loanBalance: v })} />
            <Input label="Monthly payment" money width="half" value={s.mortgagePayment} onChange={(v) => set({ mortgagePayment: v })} />
          </>
        ),
      };
    case "pre-elsewhere":
      return {
        title: "Have you or your spouse claimed a homestead exemption on another home, or filed taxes as a resident of another state?",
        hint: "Your tax bill shows your Principal Residence Exemption is missing, so we're also filling in Form 2368 to fix it.",
        body: <YesNo legend="Exemption elsewhere" value={s.otherExemptionElsewhere} onChange={(v) => set({ otherExemptionElsewhere: v })} noHint="Most people answer no" />,
        validate: answered(s.otherExemptionElsewhere, "Select yes or no"),
      };
    case "you-name": {
      const me = s.people[0];
      return {
        title: "Your name and age",
        hint: me.name && s.billImage ? "We took your name from the tax bill. Change it if it's not right." : undefined,
        body: (
          <>
            <Input label="Full name" value={me.name} onChange={(v) => setPerson(me.id, { name: v })} autoComplete="name" />
            <Input label="Age" width="short" inputMode="numeric" value={me.age} onChange={(v) => setPerson(me.id, { age: v.replace(/\D/g, "") })} />
          </>
        ),
        validate: () => (!me.name.trim() ? "Enter your full name" : !me.age ? "Enter your age" : null),
      };
    }
    case "you-contact":
      return {
        title: "How can the Board of Review contact you?",
        body: (
          <>
            <Input label="Daytime phone number" type="tel" width="half" value={s.phone} onChange={(v) => set({ phone: v })} autoComplete="tel" />
            <Input label="Email (optional)" type="email" value={s.email} onChange={(v) => set({ email: v })} autoComplete="email" />
          </>
        ),
        validate: () => (s.phone.replace(/\D/g, "").length >= 10 ? null : "Enter a phone number, like 313-555-0100"),
      };
    case "you-marital":
      return {
        title: "What is your marital status?",
        body: <Radios legend="Marital status" value={s.maritalStatus || null} onChange={(v) => set({ maritalStatus: v })} options={MARITAL.map((m) => ({ value: m, label: m }))} />,
        validate: answered(s.maritalStatus, "Select your marital status"),
      };
    case "designee":
      return {
        title: "Is someone applying for you as your legal designee?",
        hint: "For example, someone with power of attorney. Most people answer no.",
        body: <YesNo legend="Legal designee" value={s.hasDesignee} onChange={(v) => set({ hasDesignee: v })} />,
        validate: answered(s.hasDesignee, "Select yes or no"),
      };
    case "designee-details":
      return {
        title: "Your legal designee",
        body: (
          <>
            <Input label="Name" value={s.designee.name} onChange={(v) => set({ designee: { ...s.designee, name: v } })} />
            <Input label="Daytime phone" type="tel" width="half" value={s.designee.phone} onChange={(v) => set({ designee: { ...s.designee, phone: v } })} />
            <Input label="Mailing address" value={s.designee.address} onChange={(v) => set({ designee: { ...s.designee, address: v } })} />
          </>
        ),
        validate: () => (s.designee.name.trim() ? null : "Enter your designee's name"),
      };
    case "people": {
      const size = householdSize(s);
      const others = s.people.slice(1);
      const married = s.maritalStatus === "Married";
      return {
        title: size === 1 ? "You live alone" : "Who else lives in your home?",
        hint: size === 1
          ? "You told us 1 person lives in your home. If someone else lives with you, add them."
          : `You told us ${size} people live in your home. Add everyone except you, including children.`,
        body: (
          <div className="space-y-4">
            {others.map((p, n) => (
              <div key={p.id} className="space-y-3 rounded-lg border-l-4 border-slate-400 bg-white p-3 shadow-sm">
                <div className="flex justify-between">
                  <h2 className="font-semibold">Person {n + 2}</h2>
                  <button type="button" className="text-sm text-blue-700 underline" onClick={() => update((st) => ({ ...st, people: st.people.filter((x) => x.id !== p.id) }))}>Remove</button>
                </div>
                <Input label="Full name" value={p.name} onChange={(v) => setPerson(p.id, { name: v })} />
                <div className="flex gap-3">
                  <Input label="Age" width="short" inputMode="numeric" value={p.age} onChange={(v) => setPerson(p.id, { age: v.replace(/\D/g, "") })} />
                  <div className="flex-1">
                    <Input label="Relationship to you" list="relationships" value={p.relationship} onChange={(v) => setPerson(p.id, { relationship: v })} />
                  </div>
                </div>
              </div>
            ))}
            <datalist id="relationships">{RELATIONSHIPS.map((r) => <option key={r} value={r} />)}</datalist>
            <button
              type="button"
              className="rounded-lg border-2 border-slate-400 bg-white px-4 py-2.5 font-semibold"
              onClick={() => update((st) => ({ ...st, people: [...st.people, newPerson(married && st.people.length === 1 ? "Spouse" : "")] }))}
            >
              + Add a person
            </button>
            {others.length + 1 !== size && others.length > 0 && (
              <Inset>You&apos;ve listed {others.length + 1} people including you. We&apos;ll update your household size to match when you continue.</Inset>
            )}
          </div>
        ),
        validate: () => {
          const missing = others.find((p) => !p.name.trim() || !p.age);
          if (missing) return "Enter a name and age for everyone";
          if (others.length + 1 !== size && others.length === 0 && size > 1) return `Add the ${size - 1} other ${size - 1 === 1 ? "person" : "people"} who live with you`;
          return null;
        },
      };
    }
  }
  return null;
}

/** Keep one blank row per expected person when arriving at the people page. */
export function seedPeople(s: Ctx["s"]): Ctx["s"] {
  const size = householdSize(s);
  if (s.people.length >= size || s.people.length > 1) return s;
  const married = s.maritalStatus === "Married";
  const rows = Array.from({ length: size - 1 }, (_, i) => newPerson(married && i === 0 ? "Spouse" : ""));
  return { ...s, people: [...s.people, ...rows] };
}

/** On leaving the people page, the list is the truth for household size. */
export const syncHouseholdSize = (s: Ctx["s"]): Ctx["s"] =>
  s.people.length > 1 && s.people.length !== householdSize(s) ? { ...s, householdSize: String(s.people.length) } : s;

