import { json, handleError } from "@/lib/http";
import { handleWebhook } from "@/lib/payments/service";

export const maxDuration = 60;

/** Signed simulator/bank webhook. HMAC-SHA256 of the raw body in x-simulator-signature. */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const r = await handleWebhook(raw, req.headers.get("x-simulator-signature"));
    return json(r.body, r.status);
  } catch (e) {
    return handleError(e);
  }
}
