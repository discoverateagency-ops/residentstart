"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { idr } from "@/lib/format";
import type { PricingRow } from "@/lib/pricing";
import { ConfirmModal } from "@/components/ConfirmModal";
import { toast } from "@/components/Toaster";

export function BuyCard({ verified, rows, cashPriceIdr, listPriceIdr, discountPct, downPaymentPct }: { verified: boolean; rows: PricingRow[]; cashPriceIdr: number; listPriceIdr: number; discountPct: number; downPaymentPct: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"cash" | "installment">("installment");
  const [tenor, setTenor] = useState(rows.find((r) => r.tenor_years === 10)?.tenor_years ?? rows[0]?.tenor_years);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const row = rows.find((r) => r.tenor_years === tenor)!;

  async function go() {
    setConfirm(false);
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/loans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, tenorYears: tenor }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not create the loan");
      toast(mode === "cash" ? "Reservation recorded (demo)" : "Loan recorded on NEAR", "ok", d.nearblocksUrl);
      router.push(mode === "cash" ? "/buyer" : "/buyer/schedule");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const disabledTip = verified ? "" : "Verify first";
  return (
    <section className="card">
      <h2 className="text-lg mb-3">Buy this home</h2>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-rs-green-100 p-1" role="tablist">
        {(["cash", "installment"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-lg py-2.5 text-sm font-semibold ${mode === m ? "bg-white text-rs-green-700 shadow-sm" : "text-rs-green-900/70"}`}>
            {m === "cash" ? "Cash" : "Installment"}
          </button>
        ))}
      </div>
      {mode === "cash" ? (
        <div className="mt-4 text-sm tabular space-y-1">
          <div className="flex justify-between gap-2"><span className="text-rs-ink/60">List price</span><span className="line-through">{idr(listPriceIdr)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-rs-ink/60">Cash price (−{discountPct} %)</span><span className="font-semibold text-rs-green-900 text-base">{idr(cashPriceIdr)}</span></div>
          <button className="btn-primary w-full mt-4" disabled={!verified || busy} title={disabledTip} onClick={() => setConfirm(true)}>{busy ? "Saving…" : "Reserve (demo)"}</button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-2">
            {rows.map((r) => (
              <button key={r.tenor_years} onClick={() => setTenor(r.tenor_years)} aria-pressed={tenor === r.tenor_years} className={`rounded-xl border py-2 text-sm font-semibold ${tenor === r.tenor_years ? "bg-rs-green-700 text-white border-rs-green-700" : "bg-white text-rs-green-700 border-rs-border"}`}>
                {r.tenor_years} yr
              </button>
            ))}
          </div>
          <dl className="mt-4 text-sm tabular space-y-1.5">
            <div className="flex justify-between gap-2"><dt className="text-rs-ink/60">Down payment ({downPaymentPct} %)</dt><dd>{idr(row.down_payment_idr)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-rs-ink/60">Principal</dt><dd>{idr(row.principal_idr)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-rs-ink/60">Monthly</dt><dd className="font-semibold text-rs-green-900 text-base">{idr(row.monthly_idr)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-rs-ink/60">Total ({row.tenor_years * 12} months)</dt><dd>{idr(row.total_idr)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-rs-ink/60">Financed by the Residentstart DAO on NEAR · repayments recorded on-chain</p>
          <button className="btn-primary w-full mt-4" disabled={!verified || busy} title={disabledTip} onClick={() => setConfirm(true)}>{busy ? "Recording on NEAR…" : `Confirm ${row.tenor_years}-year installment`}</button>
        </div>
      )}
      {!verified && <p className="mt-2 text-xs text-[#B54708]">Verify first: complete the identity check above to unlock buying.</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <ConfirmModal open={confirm} title={mode === "cash" ? "Reserve this home (demo)?" : `Confirm ${row.tenor_years}-year installment?`} confirmLabel="Confirm" onCancel={() => setConfirm(false)} onConfirm={go}>
        {mode === "cash" ? (
          <>Records your interest at {idr(cashPriceIdr)}. No payment is taken in this demo.</>
        ) : (
          <>Creates your loan on the vault contract on NEAR testnet: {row.tenor_years * 12} monthly payments of {idr(row.monthly_idr)}. The tenor cannot be changed later in this demo.</>
        )}
      </ConfirmModal>
    </section>
  );
}
