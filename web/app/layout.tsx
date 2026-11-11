import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/Toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Residentstart · property crowdfunding on NEAR", template: "%s · Residentstart" },
  description:
    "Co-invest in homes through the Residentstart DAO on NEAR testnet. Buyers pay in rupiah; every repayment is recorded on-chain. Hackathon demo with synthetic data.",
  metadataBase: new URL(process.env.APP_URL || "https://residentstart.biz.id"),
  icons: { icon: "/brand/icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1E4D45" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
