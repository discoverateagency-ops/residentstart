// Formatting helpers (id-ID): Rp 2.850.000.000 · 10 NEAR · 42,5 %
export function idr(n: number | bigint | string): string {
  const v = typeof n === "string" ? Number(n) : Number(n);
  return "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(v);
}

export function num(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

export function pct(n: number, digits = 1): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n) + " %";
}

export function near(n: number | string): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number(n))} NEAR`;
}

export function shortHash(h: string | null | undefined): string {
  if (!h) return "";
  return h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-3)}` : h;
}

export function dateId(d: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(d));
}

export function dateTimeId(d: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(d)) + " WIB";
}

/** Card price: "Rp 2,85 Miliar" / "Rp 950 Juta" / "Rp 27,7 Juta" (id-ID decimal comma). */
export function idrShort(n: number | bigint | string): string {
  const v = Number(n);
  const f = (x: number, d: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(x);
  if (v >= 1e9) return `Rp ${f(Math.round((v / 1e9) * 100) / 100, 2)} Miliar`;
  if (v >= 1e6) return `Rp ${f(Math.round((v / 1e6) * 10) / 10, 1)} Juta`;
  return idr(v);
}
