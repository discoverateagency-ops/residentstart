import Link from "next/link";
import { getSession, dashboardPath } from "@/lib/session";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

const ROLE_LABEL = { investor: "Investor", buyer: "Buyer", admin: "Admin" } as const;

export async function Header() {
  const s = await getSession();
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-rs-border">
      <div className="container-rs h-16 flex items-center justify-between gap-3">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium">
          <Link href="/#projects" className="hover:text-rs-green-700">Projects</Link>
          <Link href="/#how" className="hover:text-rs-green-700">How it works</Link>
          <Link href="/#faq" className="hover:text-rs-green-700">FAQ</Link>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {s ? (
            <>
              <span className="rounded-full bg-rs-green-100 text-rs-green-700 px-3 py-1 text-xs font-semibold">{ROLE_LABEL[s.role]}</span>
              <Link href={dashboardPath(s.role)} className="btn-secondary btn-sm">Dashboard</Link>
              <form action="/api/auth/logout" method="post">
                <button className="btn-sm btn text-rs-green-700 hover:bg-rs-green-100" type="submit">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm text-rs-green-700 hover:bg-rs-green-100">Log in</Link>
              <Link href="/signup" className="btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>
        <MobileMenu session={s ? { role: s.role, roleLabel: ROLE_LABEL[s.role], dashboard: dashboardPath(s.role) } : null} />
      </div>
    </header>
  );
}
