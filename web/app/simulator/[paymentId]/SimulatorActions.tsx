"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SimulatorActions({ paymentId, token, status }: { paymentId: string; token: string | null; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function act(action: "pay" | "fail" | "expire") {
    setBusy(action);
    setMsg("");
    try {
      const r = await fetch("/api/simulator/act", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId, action, t: token }) });
      const d = await r.json();
      if (d.webhookStatus) setMsg(`Event sent → webhook ${d.webhookStatus} ${d.webhookStatus < 300 ? "OK" : ""}${d.webhook?.tx_hash ? " · receipt recorded on NEAR" : ""}${d.webhook?.error ? ` · ${d.webhook.error}` : ""}`);
      else setMsg(d.error || "Error");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const pending = status === "pending";
  return (
    <div className="mt-6">
      <div className="grid gap-3">
        <button disabled={!pending || !!busy} onClick={() => act("pay")} className="h-14 rounded-xl border-2 border-[#2E7D32] text-[#2E7D32] font-bold text-lg bg-white disabled:opacity-40">{busy === "pay" ? "Sending…" : "Bayar"}</button>
        <button disabled={!pending || !!busy} onClick={() => act("fail")} className="h-14 rounded-xl border-2 border-[#C62828] text-[#C62828] font-bold text-lg bg-white disabled:opacity-40">{busy === "fail" ? "Sending…" : "Gagalkan"}</button>
        <button disabled={!pending || !!busy} onClick={() => act("expire")} className="h-14 rounded-xl border-2 border-[#777] text-[#555] font-bold text-lg bg-white disabled:opacity-40">{busy === "expire" ? "Sending…" : "Kedaluwarsakan"}</button>
      </div>
      {!pending && <p className="mt-3 text-sm">This payment is <strong>{status}</strong>; no further events can change it.</p>}
      {msg && <p className="mt-4 rounded-lg bg-white border border-[#ccc] p-3 text-sm font-mono" role="status">{msg}</p>}
    </div>
  );
}
