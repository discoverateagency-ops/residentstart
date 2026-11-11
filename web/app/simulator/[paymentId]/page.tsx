import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { refreshPayment } from "@/lib/payments/service";
import { METHOD_LABEL, groupVa, verifySimulatorToken } from "@/lib/payments/simulator";
import type { Method } from "@/lib/payments/types";
import { idr } from "@/lib/format";
import { DemoBanner } from "@/components/DemoBanner";
import { SimulatorActions } from "./SimulatorActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment Simulator", robots: { index: false } };

export default async function SimulatorPage({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { paymentId } = await params;
  const { t } = await searchParams;
  const s = await getSession();
  const allowed = s?.role === "admin" || verifySimulatorToken(paymentId, t, process.env.SIMULATOR_SECRET || "");
  if (!allowed) notFound();
  const p = await refreshPayment(paymentId);
  if (!p) notFound();
  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#333]">
      <DemoBanner />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="!text-[#333] text-xl">Residentstart Payment Simulator — this page plays the bank</h1>
        <div className="mt-6 rounded-xl border border-[#ccc] bg-white p-5 text-sm space-y-2 tabular">
          <p><span className="text-[#777]">Payment:</span> <span className="font-mono">{p.id}</span></p>
          <p><span className="text-[#777]">Method:</span> {METHOD_LABEL[p.method as Method]}</p>
          {p.vaNumber && <p><span className="text-[#777]">VA:</span> <span className="font-mono">{groupVa(p.vaNumber)}</span></p>}
          {p.qrPayload && <p className="break-all"><span className="text-[#777]">QR payload:</span> <span className="font-mono text-xs">{p.qrPayload.replace(/\?t=.*/, "?t=…")}</span></p>}
          <p><span className="text-[#777]">Amount:</span> <strong>{idr(p.amountIdr)}</strong></p>
          <p><span className="text-[#777]">Status:</span> <strong>{p.status}</strong></p>
        </div>
        <SimulatorActions paymentId={p.id} token={t ?? null} status={p.status} />
        <p className="mt-10 text-xs text-[#777]">Signed with SIMULATOR_SECRET · not a real bank</p>
      </main>
    </div>
  );
}
