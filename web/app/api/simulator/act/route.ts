import { getSession } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { sendSimulatorEvent } from "@/lib/payments/service";
import { verifySimulatorToken } from "@/lib/payments/simulator";

export const maxDuration = 60;

/** The simulator page "plays the bank": signs an event and POSTs it to the webhook. Admin session or signed token. */
export async function POST(req: Request) {
  try {
    const { paymentId, action, t } = (await req.json()) as { paymentId?: string; action?: string; t?: string };
    if (!paymentId || (action !== "pay" && action !== "fail" && action !== "expire")) return json({ error: "paymentId and action are required" }, 400);
    const s = await getSession();
    if (s?.role !== "admin" && !verifySimulatorToken(paymentId, t, process.env.SIMULATOR_SECRET || "")) return json({ error: "Not allowed" }, 403);
    const origin = new URL(req.url).origin;
    const r = await sendSimulatorEvent(origin, paymentId, action);
    return json({ ok: r.httpStatus < 300, webhookStatus: r.httpStatus, webhook: r.body, eventId: r.event.event_id });
  } catch (e) {
    return handleError(e);
  }
}
