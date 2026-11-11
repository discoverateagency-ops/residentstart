"use client";
import Link from "next/link";
import { useState } from "react";

export function MobileMenu({ session }: { session: { role: string; roleLabel: string; dashboard: string } | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)} className="h-11 w-11 flex items-center justify-center rounded-xl border border-rs-border">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1E4D45" strokeWidth="2"><path d={open ? "M4 4l12 12M16 4L4 16" : "M3 5h14M3 10h14M3 15h14"} /></svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-16 bg-white border-b border-rs-border shadow-sm">
          <nav className="container-rs py-4 flex flex-col gap-1 text-base" onClick={() => setOpen(false)}>
            <Link href="/#projects" className="py-2">Projects</Link>
            <Link href="/#how" className="py-2">How it works</Link>
            <Link href="/#faq" className="py-2">FAQ</Link>
            <div className="h-px bg-rs-border my-2" />
            {session ? (
              <>
                <span className="text-sm text-rs-green-500">Signed in as {session.roleLabel}</span>
                <Link href={session.dashboard} className="btn-primary mt-2">Dashboard</Link>
                <form action="/api/auth/logout" method="post" className="mt-2">
                  <button className="btn-secondary w-full" type="submit">Log out</button>
                </form>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" className="btn-secondary">Log in</Link>
                <Link href="/signup" className="btn-primary">Sign up</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
