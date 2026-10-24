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

  const set = (k: keyof HouseholdState) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [k]: e.target.value });

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Your household</h2>
        <Field label="Home address" placeholder="1234 Example St, Detroit, MI" value={value.address} onChange={set("address")} autoComplete="street-address" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="People in home" inputMode="numeric" value={value.householdSize} onChange={set("householdSize")} />
          <Field label="Adults (18+)" inputMode="numeric" value={value.adultCount} onChange={set("adultCount")} />
        </div>
        <Field
          label="Cash & savings (all adults)"
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
              "Checking, savings, and cash on hand. Not your house or car."
            )
          }
        />
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
        <Field label="PRE % on your bill" inputMode="numeric" placeholder="100" value={value.preExemptionPercent} onChange={set("preExemptionPercent")} hint="Principal Residence Exemption. Usually 100% if you live here." />
      </Card>
    </div>
  );
}
