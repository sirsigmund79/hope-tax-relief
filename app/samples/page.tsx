// Synthetic documents for the demo. Every name, number and employer here is fake.
import type { ReactNode } from "react";

export const metadata = { title: "HOPE Check · Sample documents" };

function Box({ n, label, value, className = "" }: { n?: string; label: string; value?: ReactNode; className?: string }) {
  return (
    <div className={`border border-slate-800 p-1.5 ${className}`}>
      <div className="text-[10px] leading-tight text-slate-700">
        {n && <b className="mr-1">{n}</b>}
        {label}
      </div>
      <div className="mt-1 min-h-[1.25rem] font-mono text-base font-semibold">{value}</div>
    </div>
  );
}

function Doc({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="relative w-[720px] overflow-hidden bg-white p-5 text-slate-900 shadow">
      <div className="pointer-events-none absolute right-4 top-3 rotate-[-8deg] rounded border-2 border-red-500 px-2 text-sm font-bold text-red-500">
        SAMPLE · NOT A REAL DOCUMENT
      </div>
      {children}
    </div>
  );
}

export default function Samples() {
  return (
    <main className="space-y-10 bg-slate-200 p-6">
      <p className="text-sm text-slate-700">Synthetic documents for demo screenshots. All data is fictional.</p>
      <section className="space-y-2">
        <h2 className="font-semibold">Real example: a 2026 Detroit summer tax bill</h2>
        <p className="text-sm text-slate-700">A real bill with the parcel number blacked out. Its PRE is 0%, so it also shows the Form 2368 path.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/samples/detroit-summer-tax-bill-2026.jpg" alt="2026 Detroit summer property tax bill" className="w-[720px] shadow" />
      </section>

      <Doc id="ssa-1099">
        <div className="mb-3">
          <div className="text-lg font-bold">FORM SSA-1099 – SOCIAL SECURITY BENEFIT STATEMENT</div>
          <div className="text-xs">2025 · Part of your Social Security benefits shown in box 5 may be taxable income.</div>
        </div>
        <div className="grid grid-cols-2 gap-0">
          <Box n="Box 1." label="Name" value="JANE DOE" />
          <Box n="Box 2." label="Beneficiary's Social Security Number" value="XXX-XX-1234" />
          <Box n="Box 3." label="Benefits Paid in 2025" value="$14,400.00" />
          <Box n="Box 4." label="Benefits Repaid to SSA in 2025" value="$0.00" />
          <Box n="Box 5." label="Net Benefits for 2025 (Box 3 minus Box 4)" value="$14,400.00" className="bg-yellow-50" />
          <Box n="Box 6." label="Voluntary Federal Income Tax Withheld" value="$0.00" />
        </div>
        <div className="mt-2 text-[10px]">Address: 1234 EXAMPLE ST, DETROIT MI 48200 · Claim number: XXX-XX-1234A</div>
      </Doc>

      <Doc id="w2">
        <div className="mb-3 text-lg font-bold">Form W-2 Wage and Tax Statement 2025</div>
        <div className="grid grid-cols-3 gap-0">
          <Box n="a" label="Employee's social security number" value="XXX-XX-5678" />
          <Box n="b" label="Employer identification number (EIN)" value="00-0000000" />
          <Box n="1" label="Wages, tips, other compensation" value="18250.00" className="bg-yellow-50" />
          <Box n="c" label="Employer's name, address, and ZIP code" value={<span className="text-sm">ACME EXAMPLE WIDGETS LLC (FAKE)<br />1 Sample Plaza, Nowhere MI 00000</span>} className="col-span-2" />
          <Box n="2" label="Federal income tax withheld" value="912.50" />
          <Box n="e" label="Employee's first name and initial · Last name" value="JOHN DOE" className="col-span-2" />
          <Box n="3" label="Social security wages" value="18250.00" />
          <Box n="f" label="Employee's address and ZIP code" value={<span className="text-sm">1234 EXAMPLE ST, DETROIT MI 48200</span>} className="col-span-2" />
          <Box n="5" label="Medicare wages and tips" value="18250.00" />
        </div>
        <div className="mt-2 text-[10px]">Copy B — To Be Filed With Employee's FEDERAL Tax Return.</div>
      </Doc>

      <Doc id="tax-bill">
        <div className="mb-3">
          <div className="text-lg font-bold">CITY OF DETROIT · 2025 SUMMER PROPERTY TAX BILL (SAMPLE)</div>
          <div className="text-xs">Parcel: 00000000.000 · Property: 1234 EXAMPLE ST · Owner: JANE DOE</div>
        </div>
        <div className="grid grid-cols-3 gap-0">
          <Box label="Taxable Value" value="$29,850" />
          <Box label="PRE %" value="100.0000" />
          <Box label="Millage Rate" value="70.3470" />
          <Box label="Current Year Taxes Due" value="$2,100.00" className="col-span-2 bg-yellow-50" />
          <Box label="Due Date" value="08/31/2025" />
          <Box label="Prior Year Delinquent Taxes" value="$4,800.00" className="col-span-2 bg-red-50" />
          <Box label="Status" value="DELINQUENT" />
        </div>
        <div className="mt-2 text-[10px]">Delinquent amounts are payable to the Wayne County Treasurer. This is a fictional bill for demonstration.</div>
      </Doc>
      <Doc id="bank-statement">
        <div className="mb-3">
          <div className="text-lg font-bold">EXAMPLE COMMUNITY CREDIT UNION (FAKE) · Monthly Statement</div>
          <div className="text-xs">Statement period: 09/01/2026 – 09/30/2026 · Member: JANE DOE · Account: XXXX-XX12</div>
        </div>
        <div className="grid grid-cols-3 gap-0">
          <Box label="Beginning balance" value="$2,940.12" />
          <Box label="Deposits" value="$1,200.00" />
          <Box label="Withdrawals" value="$1,140.12" />
          <Box label="Ending balance" value="$3,000.00" className="col-span-2 bg-yellow-50" />
          <Box label="Dividend rate" value="0.10%" />
        </div>
      </Doc>

      <Doc id="mortgage-statement">
        <div className="mb-3">
          <div className="text-lg font-bold">SAMPLE HOME LOANS (FAKE) · Mortgage Statement</div>
          <div className="text-xs">Borrower: JANE DOE · Property: 1234 EXAMPLE ST, DETROIT MI 48200 · Loan: XXXXXX789</div>
        </div>
        <div className="grid grid-cols-3 gap-0">
          <Box label="Payment due 11/01/2026" value="$412.00" className="bg-yellow-50" />
          <Box label="Unpaid principal balance" value="$18,400.00" className="bg-yellow-50" />
          <Box label="Interest rate" value="4.125%" />
        </div>
      </Doc>
    </main>
  );
}
