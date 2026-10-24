"use client";

import { useState } from "react";
import { extractFile } from "@/lib/extractClient";
import { ASSET_CAP } from "@/lib/config";
import { num, usd } from "@/lib/format";
import { Card, Field } from "./ui";
import { UploadButton } from "./DocUploader";
import type { HouseholdState } from "./types";

export default function HouseholdForm({
  value,
  onChange,
}: {
  value: HouseholdState;
  onChange: (patch: Partial<HouseholdState>) => void;
}) {
  const [billStatus, setBillStatus] = useState<{ kind: "idle" | "loading" | "ok" | "error"; msg?: string }>({ kind: "idle" });

  async function uploadBill(file: File) {
    setBillStatus({ kind: "loading" });
    const r = await extractFile(file);
    const d = r.ok ? r.data : r.partial;
    // Keep the photo for the packet even if reading it failed: the user said it's their bill.
    const patch: Partial<HouseholdState> = { billImage: URL.createObjectURL(file) };
    if (d.taxBillAmount != null) patch.currentTaxBill = String(d.taxBillAmount);
    if (d.delinquentAmount != null) patch.delinquentAmount = String(d.delinquentAmount);
    if (d.preExemptionPercent != null) patch.preExemptionPercent = String(d.preExemptionPercent);
    if (d.parcelNumber) patch.parcelNumber = d.parcelNumber;
    onChange(patch);
    if (r.ok && d.docType === "TAX_BILL" && Object.keys(patch).length > 1) {
      const issues = r.data.issues.length ? ` Note: ${r.data.issues.join("; ")}` : "";
      setBillStatus({ kind: "ok", msg: `Filled in from your tax bill. Please double-check.${issues}` });
    } else {
      const why = r.ok ? "That doesn't look like a tax bill" : r.reason;
      setBillStatus({ kind: "error", msg: `${why}. Please type the amounts below.` });
    }
  }

  const assets = num(value.liquidAssets);
  const overAssets = assets !== null && assets > ASSET_CAP;

  type TextKey = { [K in keyof HouseholdState]: HouseholdState[K] extends string ? K : never }[keyof HouseholdState];
  const set = (k: TextKey) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [k]: e.target.value });

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Your household</h2>
        <Field label="Home address" placeholder="1234 Example St, Detroit, MI 48200" value={value.address} onChange={set("address")} autoComplete="street-address" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Daytime phone" type="tel" placeholder="313-555-0100" value={value.phone} onChange={set("phone")} autoComplete="tel" />
          <Field label="Email (optional)" type="email" value={value.email} onChange={set("email")} autoComplete="email" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="People in home" inputMode="numeric" value={value.householdSize} onChange={set("householdSize")} />
          <Field label="Adults (18+)" inputMode="numeric" value={value.adultCount} onChange={set("adultCount")} />
        </div>
        <Field
          label="Savings & other assets (everyone in the home)"
          inputMode="decimal"
          placeholder="$0"
          value={value.liquidAssets}
          onChange={set("liquidAssets")}
          hint={
            overAssets ? (
              <span className="font-semibold text-red-700">
                Over the {usd(ASSET_CAP)} limit. You likely won&apos;t qualify unless this amount is lower. You can still build your packet.
              </span>
            ) : (
              "Bank accounts, cash, stocks, bonds, IRAs, other property, boats, campers. Not this home."
            )
          }
        />
        <label className="flex gap-3 rounded-lg border border-slate-200 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0"
            checked={value.hardship}
            onChange={(e) => onChange({ hardship: e.target.checked })}
          />
          <span>
            <b>Household income dropped 20% or more</b>, or the home is in <b>property tax foreclosure</b>.
            <span className="block text-xs text-slate-500">Only needed for the 10% exemption tier.</span>
          </span>
        </label>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">Your tax bill</h2>
          <UploadButton onFile={uploadBill} disabled={billStatus.kind === "loading"}>
            {billStatus.kind === "loading" ? "Reading…" : "📷 Scan bill"}
          </UploadButton>
        </div>
        {value.billImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.billImage} alt="Your tax bill" className="h-24 w-full rounded border border-slate-200 object-cover object-top" />
        )}
        {billStatus.msg && (
          <p className={`text-sm ${billStatus.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{billStatus.msg}</p>
        )}
        <Field label="Current tax bill (per year)" inputMode="decimal" placeholder="$0" value={value.currentTaxBill} onChange={set("currentTaxBill")} />
        <Field label="Past-due (delinquent) taxes" inputMode="decimal" placeholder="$0" value={value.delinquentAmount} onChange={set("delinquentAmount")} hint="Leave blank if you're caught up." />
        <Field label="Parcel number" placeholder="On your tax bill" value={value.parcelNumber} onChange={set("parcelNumber")} hint="Goes on your application. Scanning your bill fills it in." />
        <Field label="PRE % on your bill" inputMode="numeric" placeholder="100" value={value.preExemptionPercent} onChange={set("preExemptionPercent")} hint="Principal Residence Exemption. Usually 100% if you live here." />
      </Card>
    </div>
  );
}
