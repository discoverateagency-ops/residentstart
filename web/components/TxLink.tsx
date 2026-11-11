import { NEARBLOCKS, accountUrl } from "@/lib/nearblocks";
import { shortHash } from "@/lib/format";

export function TxLink({ hash, label = "tx" }: { hash?: string | null; label?: string }) {
  if (!hash) return null;
  return (
    <a href={`${NEARBLOCKS}/txns/${hash}`} target="_blank" rel="noreferrer" className="mono text-rs-green-700 underline decoration-dotted underline-offset-2 whitespace-nowrap" title={hash}>
      {label}: {shortHash(hash)} ↗
    </a>
  );
}

export function AccountLink({ account, className = "" }: { account: string; className?: string }) {
  return (
    <a href={accountUrl(account)} target="_blank" rel="noreferrer" className={`mono text-rs-green-700 underline decoration-dotted underline-offset-2 break-all ${className}`}>
      {account} ↗
    </a>
  );
}
