import { DemoBanner } from "./DemoBanner";
import { Header } from "./Header";
import { Footer } from "./Footer";

/** Page shell. `banner` defaults to true (dashboards, pay, receipts must show it). `app` = tinted dashboard background. */
export function Shell({ children, banner = true, footer = true, app = false }: { children: React.ReactNode; banner?: boolean; footer?: boolean; app?: boolean }) {
  return (
    <>
      {banner && <DemoBanner />}
      <Header />
      <main className={`min-h-[60vh] ${app ? "bg-rs-bg" : "bg-white"}`}>{children}</main>
      {footer && <Footer />}
    </>
  );
}
