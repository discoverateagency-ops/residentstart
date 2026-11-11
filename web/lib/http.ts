import { NextResponse } from "next/server";
import { HttpError } from "./session";

/** JSON response that serialises BigInt as string. */
export function json(data: unknown, init?: number | ResponseInit) {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  const opts: ResponseInit = typeof init === "number" ? { status: init } : init || {};
  return new NextResponse(body, { ...opts, headers: { "content-type": "application/json", ...(opts.headers || {}) } });
}

export function handleError(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[api]", msg);
  return json({ error: msg }, 500);
}

/** Recursively converts BigInt to string so data can cross to client components. */
export function plain<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}
