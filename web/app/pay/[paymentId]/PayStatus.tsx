"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NEARBLOCKS } from "@/lib/nearblocks";
import { shortHash } from "@/lib/format";

type Receipt = { receiptHash: string; txHash: string | null; recording?: boolean; error?: string | null };
type St = { status: string; expiresAt: string; receipt: Receipt | null };

export function PayStatus({ paymentId, initial, amountLabel, periodIndex, method, loanId, isBuyer }: { paymentId: string; initial: St; amountLabel: string; periodIndex: number; method: string; loanId: string; isBuyer: boolean }) {
  const router = useRouter();
  const [st, setSt] = useState<St>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [paidAt, setPaidAt] = useState<string | null>(null);

  const done = st.status !== "pending" && !(st.status === "paid" && !st.receipt?.txHash && !st.receipt?.error);
  useEffect(() => {
    if (done) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/payments/${paymentId}/status`, { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          setSt({ status: d.status, expiresAt: d.expiresAt, receipt: d.receipt });
          if (d.paidAt) setPaidAt(d.paidAt);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(t);
  }, [paymentId, done]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const msLeft = new Date(st.expiresAt).getTime() - now;
  const mm = Math.max(0, Math.floor(msLeft / 60000));
  const ss = Math.max(0, Math.floor((msLeft % 60000) / 1000));
  const hh = Math.floor(mm / 60);

  async function recreate() {
    setBusy(true);
    const r = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ loanId, periodIndex, method: methodKey(method) }) });
    const d = await r.json();
    if (r.ok) router.push(d.url);
    else { alert(d.error || "Could not create a new payment"); setBusy(false); }
  }

  if (st.status === "pending") {
    return (
      <div className="card mt-4">
        <p className={`tabular font-semibold ${msLeft < 120000 ? "text-rs-danger" : ""}`}>Expires in {hh > 0 ? `${hh}:${String(mm % 60).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`}</p>
        <p className="mt-2 text-sm text-rs-ink/70 flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-[#F79009] animate-pulse" /> Waiting for payment… (checking every 3 s)</p>
      </div>
    );
  }
  if (st.status === "expired" || st.status === "failed") {
    return (
      <div className="card mt-4">
        <p className="font-semibold text-rs-danger">{st.status === "expired" ? "Expired" : "Payment failed"}</p>
        {isBuyer && <button className="btn-primary mt-3" disabled={busy} onClick={recreate}>{busy ? "Creating…" : "Create new payment"}</button>}
      </div>
    );
  }
  // paid
  const r = st.receipt;
  return (
    <div className="mt-4">
      <div className="card relative overflow-hidden print:border-black" id="receipt">
        <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="text-[64px] font-black text-[#B54708]/10 -rotate-[24deg] tracking-widest">SIMULASI</span>
        </div>
        <div className="relative">
          <p className="text-[#027A48] font-semibold text-lg">Paid ✓</p>
          <p className="text-sm">{r?.txHash ? "Receipt recorded on NEAR" : r?.error ? "Paid — recording on NEAR will be retried" : "Paid — recording receipt on NEAR…"}</p>
          <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-1.5 text-sm tabular">
            <dt className="text-rs-ink/60">Payment receipt (demo)</dt><dd>Period {periodIndex} · {amountLabel}</dd>
            <dt className="text-rs-ink/60">Method</dt><dd>{method}</dd>
            {paidAt && (<><dt className="text-rs-ink/60">Paid at</dt><dd>{new Date(paidAt).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} WIB</dd></>)}
            <dt className="text-rs-ink/60">Loan id</dt><dd className="mono break-all">{loanId}</dd>
            <dt className="text-rs-ink/60">Receipt hash</dt><dd className="mono break-all">{r?.receiptHash ?? "…"}</dd>
            <dt className="text-rs-ink/60">NEAR tx</dt>
            <dd>{r?.txHash ? <a className="mono text-rs-green-700 underline decoration-dotted" target="_blank" rel="noreferrer" href={`${NEARBLOCKS}/txns/${r.txHash}`}>tx {shortHash(r.txHash)} ↗</a> : <span className="text-[#B54708]">recording…</span>}</dd>
          </dl>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <a href={isBuyer ? "/buyer/schedule" : "/admin?tab=payments"} className="btn-primary">Back to schedule</a>
        <button className="btn-secondary" onClick={() => window.print()}>Print</button>
      </div>
    </div>
  );
}

function methodKey(label: string) {
  if (label.includes("BCA")) return "va_bca";
  if (label.includes("BNI")) return "va_bni";
  if (label.includes("Mandiri")) return "va_mandiri";
  return "qris";
}
