import { DemoBanner } from "./DemoBanner";
import { Header } from "./Header";
import { Footer } from "./Footer";

/** Page shell. `banner` defaults to true (dashboards, pay, receipts must show it). */
export function Shell({ children, banner = true, footer = true }: { children: React.ReactNode; banner?: boolean; footer?: boolean }) {
  return (
    <>
      {banner && <DemoBanner />}
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      {footer && <Footer />}
    </>
  );
}
