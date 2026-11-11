"use client";
import Link from "next/link";
import { useState } from "react";
import { compressImage, descriptorFrom, fileToImage } from "@/lib/client/face";

export function SignupForm({ initialRole }: { initialRole: "investor" | "buyer" }) {
  const [role, setRole] = useState<"investor" | "buyer">(initialRole);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) return setErr("Password must be at least 8 characters");
    if (role === "buyer" && !photo) return setErr("Add a reference photo for the identity check");
    setBusy(true);
    try {
      let descriptor: number[] | null = null;
      let blob: Blob | null = null;
      if (role === "buyer" && photo) {
        setStatus("Checking your photo on this device…");
        const img = await fileToImage(photo);
        descriptor = await descriptorFrom(img);
        if (!descriptor) throw new Error("No face found in the photo. Use a clear, front-facing photo.");
        blob = await compressImage(img);
      }
      setStatus("Creating account…");
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, displayName, role }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Sign up failed");
      if (role === "buyer" && blob && descriptor) {
        setStatus("Saving reference photo…");
        const fd = new FormData();
        fd.append("photo", new File([blob], "reference.jpg", { type: "image/jpeg" }));
        fd.append("descriptor", JSON.stringify(descriptor));
        const r2 = await fetch("/api/verification/reference", { method: "POST", body: fd });
        if (!r2.ok) {
          const d2 = await r2.json().catch(() => ({}));
          // account exists; the buyer can retry from the dashboard
          console.warn("reference upload failed", d2.error);
        }
      }
      window.location.href = d.redirect;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <span className="label">I want to</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-rs-green-100 p-1" role="radiogroup">
          {(["investor", "buyer"] as const).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)} className={`rounded-lg py-2.5 font-semibold text-sm ${role === r ? "bg-white text-rs-green-700 shadow-sm" : "text-rs-green-900/70"}`}>
              {r === "investor" ? "Invest" : "Buy a home"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="dn">Display name</label>
        <input id="dn" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={60} />
      </div>
      <div>
        <label className="label" htmlFor="em">Email</label>
        <input id="em" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="pw">Password</label>
        <input id="pw" className="input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="text-xs text-rs-ink/60 mt-1">At least 8 characters.</p>
      </div>
      {role === "buyer" && (
        <div>
          <label className="label" htmlFor="ph">Reference photo (for identity check)</label>
          <input
            id="ph"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-rs-green-100 file:px-3 file:py-2 file:font-semibold file:text-rs-green-700"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPhoto(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="Reference preview" className="mt-2 h-24 w-24 rounded-xl object-cover border border-rs-border" />}
          <p className="text-xs text-rs-ink/60 mt-1">Used only for the demo face check, never shared.</p>
        </div>
      )}
      {role === "investor" && (
        <p className="text-xs rounded-xl bg-[#FFF3CD] text-[#664D03] p-3">
          New investor accounts can browse and use the agent, but in this demo only the seeded investor accounts hold a NEAR testnet key to sign investments. Use investor1 / investor2 to try investing.
        </p>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? status || "Working…" : "Create account"}</button>
      <p className="text-sm text-center">Already have an account? <Link href="/login" className="text-rs-green-700 font-semibold">Log in</Link></p>
    </form>
  );
}
