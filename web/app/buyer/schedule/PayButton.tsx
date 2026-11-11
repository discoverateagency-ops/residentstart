"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const METHODS = [
  ["va_bca", "VA BCA"],
  ["va_bni", "VA BNI"],
  ["va_mandiri", "VA Mandiri"],
  ["qris", "QRIS"],
] as const;

export function PayButton({ loanId, periodIndex }: { loanId: string; periodIndex: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create(method: string) {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ loanId, periodIndex, method }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not create payment");
      router.push(d.url);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>Pay</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => !busy && setOpen(false)} role="dialog" aria-modal>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold text-[#664D03] bg-[#FFF3CD] rounded-lg px-3 py-2 mb-3">MODE SIMULASI — jangan transfer uang sungguhan.</p>
            <h2 className="text-lg">Pay period {periodIndex}</h2>
            <p className="text-sm text-rs-ink/70 mt-1">Choose a payment method (simulated).</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {METHODS.map(([m, label]) => (
                <button key={m} className="btn-secondary" disabled={busy} onClick={() => create(m)}>{label}</button>
              ))}
            </div>
            {busy && <p className="mt-3 text-sm text-rs-green-700">Creating payment…</p>}
            {err && <p className="err" role="alert">{err}</p>}
          </div>
        </div>
      )}
    </>
  );
}
