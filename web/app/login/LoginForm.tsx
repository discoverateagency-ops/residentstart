"use client";
import Link from "next/link";
import { useState } from "react";

const DEMO = ["admin@residentstart.demo", "investor1@residentstart.demo", "investor2@residentstart.demo", "buyer1@residentstart.demo"];

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Login failed");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      window.location.href = safeNext || d.redirect;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      <p className="text-sm text-center">Don&apos;t have an account? <Link href="/signup" className="text-rs-green-700 font-semibold">Sign up</Link></p>
      <div className="rounded-xl bg-[#F2F4F3] p-4 text-sm">
        <p className="font-semibold text-rs-green-900 mb-2">Demo accounts</p>
        <ul className="space-y-1.5">
          {DEMO.map((d) => (
            <li key={d} className="flex items-center justify-between gap-2">
              <button type="button" className="mono text-left break-all hover:text-rs-green-700" onClick={() => setEmail(d)}>{d}</button>
              <button type="button" aria-label={`Copy ${d}`} className="shrink-0 text-rs-green-700" onClick={() => navigator.clipboard?.writeText(d)}>⧉</button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-rs-ink/60">Password: see README (tap an email to fill it in).</p>
      </div>
    </form>
  );
}
