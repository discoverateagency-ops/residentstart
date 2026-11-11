export const DEMO_TEXT =
  "DEMO — NEAR testnet, synthetic data, no real money. MODE SIMULASI — jangan transfer uang sungguhan.";

export function DemoBanner() {
  return (
    <div role="note" className="w-full bg-[#FFF3CD] text-[#664D03] text-[13px] leading-tight px-4 py-2 text-center min-h-8 flex items-center justify-center" data-testid="demo-banner">
      {DEMO_TEXT}
    </div>
  );
}
