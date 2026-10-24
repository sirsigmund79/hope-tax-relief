import { ASSET_CAP } from "@/lib/config";
import { usd } from "@/lib/format";
import { Card } from "./ui";

export default function Requirements({ incomeLimit, householdSize }: { incomeLimit: number; householdSize: number }) {
  const items = [
    <>You <b>own and live in</b> the home, and it's in Detroit.</>,
    <>Household income is <b>{usd(incomeLimit)} or less</b> for {householdSize} {householdSize === 1 ? "person" : "people"}. Lower income means a bigger cut, up to 100%.</>,
    <>Cash and savings (all adults) are under <b>{usd(ASSET_CAP)}</b>. Your house and car don't count.</>,
    <>Every adult shows proof of income, or signs <b>Form 4988</b> if they have none.</>,
    <>You apply <b>every year</b>, with a photo ID for each adult.</>,
  ];
  return (
    <Card className="border-blue-200 bg-blue-50/60">
      <h2 className="text-lg font-semibold text-blue-950">Who qualifies for HOPE</h2>
      <ul className="mt-2 space-y-2 text-sm text-slate-800">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-0.5 text-blue-700" aria-hidden>✓</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
