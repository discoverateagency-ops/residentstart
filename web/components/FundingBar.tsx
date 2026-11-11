import { pct } from "@/lib/format";

export function FundingBar({ sold, total, compact = false }: { sold: number; total: number; compact?: boolean }) {
  const p = total > 0 ? (sold / total) * 100 : 0;
  return (
    <div>
      {!compact && (
        <div className="flex justify-between text-sm mb-1 tabular">
          <span>
            {sold} / {total} shares
          </span>
          <span className="font-semibold">{pct(p)}</span>
        </div>
      )}
      <div className="h-2.5 w-full rounded-full bg-rs-green-100 overflow-hidden" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-rs-green-700 transition-all" style={{ width: `${Math.min(100, p)}%` }} />
      </div>
    </div>
  );
}
