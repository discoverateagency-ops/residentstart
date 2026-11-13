"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import { ConfirmModal } from "@/components/ConfirmModal";

export function InvestForm({ projectSlug, sharePrice, remainingShares, onchain, canSign, status }: { projectSlug: string; sharePrice: number; remainingShares: number; onchain: boolean; canSign: boolean; status: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(sharePrice));
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0;
  const shares = valid ? Math.floor(n / sharePrice) : 0;
  const refund = valid ? Math.round((n - shares * sharePrice) * 10000) / 10000 : 0;
  const over = shares > remainingShares;
  const disabled = !onchain || !canSign || status !== "funding" || busy || !valid || shares === 0 || over;
  const reason = !onchain ? "The admin has not created the project on-chain yet" : !canSign ? "This demo account has no NEAR testnet key" : status !== "funding" ? `Project is ${status}` : over ? `Only ${remainingShares} shares left` : shares === 0 ? `Minimum ${sharePrice} NEAR` : "";

  async function go() {
    setConfirm(false);
    setBusy(true);
    setErr("");
    setStep("1/2 signing");
    const t = setTimeout(() => setStep("2/2 confirming on NEAR"), 1200);
    try {
      const r = await fetch("/api/invest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amountNear: n, projectSlug }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Transaction failed");
      toast(`${d.shares} share${d.shares === 1 ? "" : "s"} added${d.refundNear ? ` · ${d.refundNear} NEAR refunded` : ""}`, "ok", d.nearblocksUrl);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      toast((e as Error).message, "error");
    } finally {
      clearTimeout(t);
      setBusy(false);
      setStep("");
    }
  }

  return (
    <div className="mt-4">
      <label className="label" htmlFor="amt">Amount</label>
      <div className="flex items-center gap-2">
        <input id="amt" className="input tabular" type="number" inputMode="decimal" min={0} step={sharePrice} value={amount} onChange={(e) => setAmount(e.target.value)} aria-describedby="amt-calc" />
        <span className="font-semibold text-rs-green-900">NEAR</span>
      </div>
      <p id="amt-calc" className="mt-2 text-sm tabular">You get {shares} share{shares === 1 ? "" : "s"} · {refund} NEAR refunded</p>
      <button className="btn-primary w-full sm:w-auto mt-3" disabled={disabled} title={reason} onClick={() => setConfirm(true)}>
        {busy ? "Sending…" : `Invest ${valid ? n : 0} NEAR`}
      </button>
      {busy && <p className="mt-2 text-sm text-rs-green-700" aria-live="polite">{step}</p>}
      {!busy && reason && valid && <p className="mt-2 text-xs text-rs-ink/60">{reason}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <ConfirmModal open={confirm} title="Sign and send on NEAR testnet?" confirmLabel={`Invest ${n} NEAR`} onCancel={() => setConfirm(false)} onConfirm={go}>
        The server signs <span className="mono">dao.invest</span> for your demo account with {n} NEAR attached. You get {shares} share{shares === 1 ? "" : "s"}{refund ? ` and ${refund} NEAR is refunded` : ""}.
      </ConfirmModal>
    </div>
  );
}
