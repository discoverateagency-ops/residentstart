"use client";
import { NEARBLOCKS } from "@/lib/nearblocks";
import { shortHash } from "@/lib/format";

export function TxLinkClient({ hash, label = "tx" }: { hash?: string | null; label?: string }) {
  if (!hash) return null;
  return (
    <a href={`${NEARBLOCKS}/txns/${hash}`} target="_blank" rel="noreferrer" className="mono text-rs-green-700 underline decoration-dotted underline-offset-2 whitespace-nowrap" title={hash}>
      {label}: {shortHash(hash)} ↗
    </a>
  );
}
