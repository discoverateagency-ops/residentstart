import { describe, expect, it } from "vitest";
import { cashPrice, downPayment, principal, monthly, pricingTable } from "@/lib/pricing";

const P = { listPriceIdr: 2_850_000_000, cashDiscountPct: 5, downPaymentPct: 20, annualRatePct: 8 };

// Reference values computed independently: ceil(P*r/(1-(1+r)^-n)), P=2,280,000,000, r=0.08/12
function ref(n: number) {
  const r = 0.08 / 12;
  return Math.ceil((2_280_000_000 * r) / (1 - Math.pow(1 + r, -n)));
}

describe("pricing", () => {
  it("cash price is 5% below list", () => expect(cashPrice(P)).toBe(2_707_500_000));
  it("down payment 20%", () => expect(downPayment(P)).toBe(570_000_000));
  it("principal", () => expect(principal(P)).toBe(2_280_000_000));
  it.each([5, 10, 15])("monthly for %i years matches the annuity formula", (y) => {
    expect(monthly(P, y)).toBe(ref(y * 12));
    expect(Number.isInteger(monthly(P, y))).toBe(true);
  });
  it("known values", () => {
    expect(monthly(P, 5)).toBe(46_230_179);
    expect(monthly(P, 10)).toBe(27_662_692);
    expect(monthly(P, 15)).toBe(21_788_868);
  });
  it("table totals = monthly × months", () => {
    for (const row of pricingTable(P, [5, 10, 15])) expect(row.total_idr).toBe(row.monthly_idr * row.tenor_years * 12);
  });
});
