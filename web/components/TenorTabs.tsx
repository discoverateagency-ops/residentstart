"use client";
import { useState } from "react";
import { idr } from "@/lib/format";
import type { PricingRow } from "@/lib/pricing";

export function TenorTabs({ rows, downPaymentPct }: { rows: PricingRow[]; downPaymentPct: number }) {
  const [sel, setSel] = useState(rows.length > 1 ? 1 : 0);
  const r = rows[sel];
  return (
    <div className="mt-4">
      <div className="grid grid-cols-3 gap-2" role="tablist">
        {rows.map((row, k) => (
          <button key={row.tenor_years} role="tab" aria-selected={k === sel} onClick={() => setSel(k)} className={`rounded-xl border py-2 text-sm font-semibold ${k === sel ? "bg-rs-green-700 text-white border-rs-green-700" : "bg-white text-rs-green-700 border-rs-border"}`}>
            {row.tenor_years} yr
          </button>
        ))}
      </div>
      {r && (
        <dl className="mt-3 text-sm tabular space-y-1">
          <Row k={`Down payment (${downPaymentPct} %)`} v={idr(r.down_payment_idr)} />
          <Row k="Principal" v={idr(r.principal_idr)} />
          <Row k="Monthly" v={idr(r.monthly_idr)} strong />
          <Row k={`Total (${r.tenor_years * 12} months)`} v={idr(r.total_idr)} />
        </dl>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-rs-ink/70">{k}</dt>
      <dd className={strong ? "font-semibold text-rs-green-900" : ""}>{v}</dd>
    </div>
  );
}
