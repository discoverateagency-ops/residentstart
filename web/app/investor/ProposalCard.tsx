"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import { TxLinkClient } from "@/components/TxLinkClient";
import { StatusPill } from "@/components/StatusPill";

type P = { id: string; description: string; status: string; yes: number; no: number; myVote: { yes: boolean; weight: number; txHash: string } | null };

export function ProposalCard({ proposal, myShares }: { proposal: P | null; myShares: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "yes" | "no">(null);
  const [err, setErr] = useState("");
  if (!proposal) {
    return (
      <section className="card">
        <h2 className="text-lg mb-2">Funding proposal</h2>
        <p className="text-sm text-rs-ink/70">No proposal is open yet. The admin opens &quot;Approve project for funding&quot; once shares are sold.</p>
      </section>
    );
  }
  const total = proposal.yes + proposal.no;
  const yesPct = total ? (proposal.yes / total) * 100 : 0;

  async function vote(yes: boolean) {
    setBusy(yes ? "yes" : "no");
    setErr("");
    try {
      const r = await fetch("/api/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposalId: proposal!.id, yes }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Vote failed");
      toast(`Vote recorded · weight ${d.weight}`, "ok", d.nearblocksUrl);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-lg">Funding proposal</h2>
        <StatusPill status={proposal.status} />
      </div>
      <p className="font-medium">&ldquo;{proposal.description}&rdquo;</p>
      <div className="mt-3 text-sm tabular flex justify-between"><span>Yes {proposal.yes} shares</span><span>No {proposal.no} shares</span></div>
      <div className="mt-1 h-2.5 rounded-full bg-[#FEE4E2] overflow-hidden"><div className="h-full bg-rs-green-700" style={{ width: `${yesPct}%` }} /></div>
      {proposal.myVote ? (
        <p className="mt-3 text-sm">You voted: <strong>{proposal.myVote.yes ? "Yes" : "No"}</strong> (weight {proposal.myVote.weight}) · <TxLinkClient hash={proposal.myVote.txHash} /></p>
      ) : proposal.status !== "open" ? (
        <p className="mt-3 text-sm text-rs-ink/70">Voting is closed.</p>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-primary" disabled={myShares === 0 || !!busy} title={myShares === 0 ? "Buy shares to vote" : ""} onClick={() => vote(true)}>{busy === "yes" ? "Sending…" : "Vote yes"}</button>
            <button className="btn-secondary" disabled={myShares === 0 || !!busy} title={myShares === 0 ? "Buy shares to vote" : ""} onClick={() => vote(false)}>{busy === "no" ? "Sending…" : "Vote no"}</button>
          </div>
          {myShares === 0 ? <p className="mt-2 text-sm text-rs-ink/70">Buy shares to vote</p> : <p className="mt-2 text-xs text-rs-ink/60">Your weight: {myShares} share{myShares === 1 ? "" : "s"} · one vote per account, final</p>}
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
    </section>
  );
}
