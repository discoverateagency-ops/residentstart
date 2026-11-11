// Shared pricing (docs/PRD.md "Installment formula"). Integer rupiah everywhere.
export type PricingInput = {
  listPriceIdr: number;
  cashDiscountPct: number;
  downPaymentPct: number;
  annualRatePct: number;
};

export type PricingRow = {
  tenor_years: number;
  down_payment_idr: number;
  principal_idr: number;
  monthly_idr: number;
  total_idr: number;
};

export function cashPrice(p: PricingInput): number {
  return p.listPriceIdr - Math.floor((p.listPriceIdr * p.cashDiscountPct) / 100);
}

export function downPayment(p: PricingInput): number {
  return Math.floor((p.listPriceIdr * p.downPaymentPct) / 100);
}

export function principal(p: PricingInput): number {
  return p.listPriceIdr - downPayment(p);
}

export function monthly(p: PricingInput, tenorYears: number): number {
  const P = principal(p);
  const r = p.annualRatePct / 100 / 12;
  const n = tenorYears * 12;
  if (r === 0) return Math.ceil(P / n);
  // round to 6 decimals before ceil so float noise never adds a rupiah
  const raw = (P * r) / (1 - Math.pow(1 + r, -n));
  return Math.ceil(Math.round(raw * 1e6) / 1e6);
}

export function pricingRow(p: PricingInput, tenorYears: number): PricingRow {
  const m = monthly(p, tenorYears);
  return {
    tenor_years: tenorYears,
    down_payment_idr: downPayment(p),
    principal_idr: principal(p),
    monthly_idr: m,
    total_idr: m * tenorYears * 12,
  };
}

export function pricingTable(p: PricingInput, tenors: number[]): PricingRow[] {
  return tenors.map((t) => pricingRow(p, t));
}

/** Total paid by the buyer including down payment (shown as "Total" in the UI). */
export function totalWithDp(row: PricingRow): number {
  return row.total_idr + row.down_payment_idr;
}
