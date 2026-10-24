import { ASSET_CAP, DEADLINE_LABEL, INCOME_YEAR, TAX_YEAR, TIERS, incomeLimit } from "@/lib/config";
import { usd } from "@/lib/format";
import { Button } from "./ui";

export default function StartPage({ onStart, resume }: { onStart: () => void; resume?: () => void }) {
  const top = TIERS.filter((t) => !t.requiresHardship).at(-1)!;
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold leading-tight">Apply for a HOPE property tax exemption</h1>
      <p className="text-lg">HOPE can cut a Detroit homeowner&apos;s property tax by 25% to 100% if their household income is low.</p>
      <div className="rounded-lg bg-red-600 px-4 py-3 font-semibold text-white">{TAX_YEAR} deadline: {DEADLINE_LABEL}</div>
      <div>
        <p>Use this service to:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>check if you can get HOPE, in 5 questions</li>
          <li>fill in the official {TAX_YEAR} City of Detroit application, mostly from photos of your documents</li>
          <li>get a checklist of everything to bring</li>
        </ul>
      </div>
      <div>
        <h2 className="text-lg font-semibold">You can usually get HOPE if</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>you own and live in the home</li>
          <li>household income is under the {TAX_YEAR} limit, for example {usd(incomeLimit(top, 1))} for 1 person or {usd(incomeLimit(top, 4))} for 4</li>
          <li>everyone in the home has {usd(ASSET_CAP)} or less in savings and other assets combined</li>
        </ul>
      </div>
      <div>
        <h2 className="text-lg font-semibold">Before you start</h2>
        <p className="mt-1">It takes about 15 minutes. Have these nearby to photograph:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>your property tax bill</li>
          <li>{INCOME_YEAR} W-2s, SSA-1099s, or paystubs for every adult</li>
          <li>bank statements, and your mortgage statement if you have one</li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button className="px-6 py-3 text-lg" onClick={onStart}>Start now ›</Button>
        {resume && <Button variant="secondary" className="py-3" onClick={resume}>Continue where you left off</Button>}
      </div>
      <p className="text-sm text-slate-600">
        Your answers stay on this device until you close the tab. Photos are only read to fill in the form, never stored.
      </p>
    </div>
  );
}
