import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { createPayment } from "@/lib/payments/service";
import { isMethod } from "@/lib/payments/simulator";

export async function POST(req: Request) {
  try {
    const user = await requireRole("buyer");
    const { loanId, periodIndex, method } = (await req.json()) as { loanId?: string; periodIndex?: number; method?: string };
    if (!loanId || !Number.isInteger(periodIndex)) return json({ error: "loanId and periodIndex are required" }, 400);
    if (!isMethod(method)) return json({ error: "Choose VA BCA, VA BNI, VA Mandiri or QRIS" }, 400);
    const origin = process.env.APP_URL && process.env.NODE_ENV === "production" ? process.env.APP_URL : new URL(req.url).origin;
    const p = await createPayment({ userId: user.id, loanId, periodIndex: periodIndex!, method, origin });
    return json({ ok: true, paymentId: p.id, url: `/pay/${p.id}` });
  } catch (e) {
    return handleError(e);
  }
}
