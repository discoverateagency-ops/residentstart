/* End-to-end QA runner for the PRD test cases (T1–T18, Q2–Q7).
 * Runs against a live app on a FRESHLY SEEDED database and spends testnet NEAR (~50 NEAR).
 *   BASE=http://localhost:3000 npx tsx --env-file=.env scripts/e2e.ts
 * Needs DEMO_PASSWORD and SIMULATOR_SECRET (to sign replay / bad-signature webhooks).
 */
import { createHmac, randomUUID } from "node:crypto";

const BASE = (process.env.BASE || "http://localhost:3000").replace(/\/$/, "");
const PW = process.env.DEMO_PASSWORD!;
const SECRET = process.env.SIMULATOR_SECRET!;
let pass = 0, fail = 0;
const failures: string[] = [];

function ok(id: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✔ ${id}${detail ? " — " + detail : ""}`); }
  else { fail++; failures.push(`${id} ${detail}`); console.log(`  ✘ ${id}${detail ? " — " + detail : ""}`); }
}

class Client {
  cookie = "";
  async req(path: string, init: RequestInit = {}) {
    const res = await fetch(BASE + path, { ...init, redirect: "manual", headers: { ...(init.headers || {}), ...(this.cookie ? { cookie: this.cookie } : {}) } });
    const sc = res.headers.get("set-cookie");
    if (sc) this.cookie = sc.split(";")[0];
    return res;
  }
  async json(path: string, body?: unknown, method = body === undefined ? "GET" : "POST") {
    const res = await this.req(path, { method, headers: body !== undefined ? { "content-type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data: data as Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  async html(path: string) {
    const res = await this.req(path);
    // React separates adjacent text nodes with <!-- -->; strip them so assertions can match visible text
    return { status: res.status, text: (await res.text()).replace(/<!-- -->/g, "") };
  }
  static async login(email: string) {
    const c = new Client();
    const r = await c.json("/api/auth/login", { email, password: PW });
    if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.data)}`);
    return c;
  }
}

function signed(evt: object) {
  const raw = JSON.stringify(evt);
  return { raw, sig: createHmac("sha256", SECRET).update(raw).digest("hex") };
}
async function webhook(raw: string, sig: string) {
  const r = await fetch(BASE + "/api/payments/webhook", { method: "POST", headers: { "content-type": "application/json", "x-simulator-signature": sig }, body: raw });
  return { status: r.status, data: (await r.json().catch(() => ({}))) as Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
}
const t0 = () => Date.now();

async function main() {
  console.log(`E2E against ${BASE}`);
  const anon = new Client();

  console.log("T1 · public pages and demo logins");
  for (const p of ["/", "/project/cilandak-residence", "/project/cilandak-residence/tour", "/login", "/signup"]) {
    const r = await anon.html(p);
    ok(`T1 GET ${p}`, r.status === 200, String(r.status));
  }
  const admin = await Client.login("admin@residentstart.demo");
  const inv1 = await Client.login("investor1@residentstart.demo");
  const inv2 = await Client.login("investor2@residentstart.demo");
  const buyer = await Client.login("buyer1@residentstart.demo");
  ok("T1 4 demo logins", true);
  ok("T17 banner on dashboards", (await inv1.html("/investor")).text.includes("MODE SIMULASI") && (await buyer.html("/buyer")).text.includes("MODE SIMULASI") && (await admin.html("/admin")).text.includes("MODE SIMULASI"));
  ok("auth: investor cannot open admin API", (await inv1.json("/api/admin/dao", { action: "refresh" })).status === 403);

  console.log("Setup · project on-chain");
  let r = await admin.json("/api/admin/dao", { action: "create_project" });
  ok("admin create_project", r.status === 200 || r.status === 409, JSON.stringify(r.data).slice(0, 120));

  console.log("T2/T3/T4 · investing");
  let s = t0();
  r = await inv1.json("/api/invest", { amountNear: 10 });
  ok("T2 invest 10 NEAR → 1 share", r.status === 200 && r.data.shares === 1, `${r.data.txHash ?? r.data.error} in ${t0() - s} ms`);
  s = t0();
  r = await inv1.json("/api/invest", { amountNear: 25 });
  ok("T3 invest 25 NEAR → 2 shares, 5 refunded", r.status === 200 && r.data.shares === 2 && r.data.refundNear === 5, `holding ${r.data.holding} refund ${r.data.refundNear} in ${t0() - s} ms`);
  r = await inv1.json("/api/invest", { amountNear: 1980 });
  ok("T4 oversell rejected without tx", r.status === 400 && /shares left/.test(r.data.error || "") && !r.data.txHash, r.data.error);
  r = await inv1.json("/api/invest", { amountNear: 5 });
  ok("invest below 1 share rejected", r.status === 400, r.data.error);

  console.log("T5/T6 · proposal and votes");
  r = await admin.json("/api/admin/dao", { action: "create_proposal", description: "Approve Residentstart Cilandak Residence for funding" });
  ok("admin opens proposal", r.status === 200, r.data.error ?? r.data.txHash);
  const proposalId = r.data.proposal?.id;
  r = await inv2.json("/api/vote", { proposalId, yes: true });
  ok("T5 investor2 with 0 shares cannot vote", r.status === 400 && /Buy shares/.test(r.data.error || ""), r.data.error);
  ok("T5 UI shows 'Buy shares to vote'", (await inv2.html("/investor")).text.includes("Buy shares to vote"));
  r = await inv2.json("/api/invest", { amountNear: 10 });
  ok("investor2 invests 10", r.status === 200 && r.data.shares === 1, r.data.error ?? r.data.txHash);
  r = await inv1.json("/api/vote", { proposalId, yes: true });
  ok("T6 investor1 votes yes, weight 3", r.status === 200 && r.data.weight === 3, r.data.error ?? `yes ${r.data.yesWeight}`);
  r = await inv2.json("/api/vote", { proposalId, yes: false });
  ok("T6 investor2 votes no, weight 1", r.status === 200 && r.data.weight === 1 && r.data.yesWeight === 3 && r.data.noWeight === 1, r.data.error ?? `${r.data.yesWeight}/${r.data.noWeight}`);
  r = await inv1.json("/api/vote", { proposalId, yes: false });
  ok("double vote rejected", r.status === 409 || r.status === 400, r.data.error);
  r = await admin.json("/api/admin/dao", { action: "finalize", proposalId });
  ok("T6 finalize → approved", r.status === 200 && r.data.status === "approved", r.data.error ?? r.data.status);
  const landing = await anon.html("/");
  ok("T6 landing shows funded", landing.text.includes(">funded<"));

  console.log("T7/T8 · buyer loan");
  r = await buyer.json("/api/loans", { mode: "installment", tenorYears: 10 });
  ok("unverified buyer blocked", r.status === 403, r.data.error);
  const buyersHtml = await admin.html("/admin?tab=buyers");
  ok("admin buyers tab renders", buyersHtml.status === 200);
  r = await admin.json("/api/admin/verify", { userId: await findBuyerId(admin) });
  ok("Q10 admin override verifies buyer1", r.status === 200, r.data.error);
  s = t0();
  r = await buyer.json("/api/loans", { mode: "installment", tenorYears: 10 });
  ok("T7 10-year installment created on-chain", r.status === 200 && !!r.data.txHash, `${r.data.txHash ?? r.data.error} in ${t0() - s} ms`);
  const loanId = r.data.loanId;
  const sched = await buyer.html("/buyer/schedule");
  ok("T7 schedule: 120 periods, monthly Rp 27.662.692", sched.text.includes("0 / 120") && sched.text.includes("27.662.692"));
  r = await buyer.json("/api/loans", { mode: "installment", tenorYears: 5 });
  ok("T8 second loan blocked", r.status === 409, r.data.error);

  console.log("T9/T15/T16 · pay period 1 with VA BCA");
  const [p1a, p1b] = await Promise.all([
    buyer.json("/api/payments", { loanId, periodIndex: 1, method: "va_bca" }),
    buyer.json("/api/payments", { loanId, periodIndex: 1, method: "va_bca" }),
  ]);
  ok("T15 double-click → one payment", p1a.status === 200 && p1a.data.paymentId === p1b.data.paymentId, `${p1a.data.paymentId} / ${p1b.data.paymentId}`);
  const pay1 = p1a.data.paymentId as string;
  const payHtml = await buyer.html(`/pay/${pay1}`);
  ok("VA starts with 9999 and SIMULASI shown", /9999 1\d{3}/.test(payHtml.text) && payHtml.text.includes("SIMULASI"));
  const buyer2 = new Client();
  r = await buyer2.json("/api/auth/signup", { email: `buyer2+${Date.now()}@example.com`, password: "password123", displayName: "Buyer Two", role: "buyer" });
  ok("buyer2 signup", r.status === 200, r.data.error);
  ok("T16 another buyer opening /pay → 404", (await buyer2.html(`/pay/${pay1}`)).status === 404);
  ok("T16 another buyer status API → 404", (await buyer2.json(`/api/payments/${pay1}/status`)).status === 404);
  r = await buyer.json(`/api/payments/${pay1}/status`);
  ok("payment pending", r.data.status === "pending");
  s = t0();
  r = await admin.json("/api/simulator/act", { paymentId: pay1, action: "pay" });
  const simMs = t0() - s;
  ok("T9 simulator Bayar → webhook 200 + receipt tx", r.status === 200 && r.data.webhookStatus === 200 && !!r.data.webhook?.tx_hash, `${r.data.webhook?.tx_hash ?? JSON.stringify(r.data)} in ${simMs} ms`);
  r = await buyer.json(`/api/payments/${pay1}/status`);
  ok("T9 status paid with receipt hash + tx", r.data.status === "paid" && r.data.receipt?.receiptHash?.length === 64 && !!r.data.receipt?.txHash);
  const invHtml = await inv1.html("/investor");
  ok("T9 investor sees 1 / 120 periods paid", invHtml.text.includes("1 / 120 periods paid"));

  console.log("T11/T12/T13 · webhook security");
  const replay = signed({ event_id: `evt_${randomUUID()}`, payment_id: pay1, type: "payment.paid", amount_idr: "27662692", occurred_at: new Date().toISOString() });
  r = await webhook(replay.raw, replay.sig);
  const r2 = await webhook(replay.raw, replay.sig);
  ok("T11 replayed event_id → duplicate, no second on-chain call", r.status === 200 && r2.status === 200 && r2.data.duplicate === true && !r.data.tx_hash, `${JSON.stringify(r.data)} / ${JSON.stringify(r2.data)}`);
  r = await webhook(replay.raw, "deadbeef".repeat(8));
  ok("T12 wrong signature → 401", r.status === 401);

  console.log("T10/T14 · period 2: QRIS via phone link, expiry");
  r = await buyer.json("/api/payments", { loanId, periodIndex: 2, method: "qris" });
  const pay2 = r.data.paymentId as string;
  const mismatch = signed({ event_id: `evt_${randomUUID()}`, payment_id: pay2, type: "payment.paid", amount_idr: "1", occurred_at: new Date().toISOString() });
  r = await webhook(mismatch.raw, mismatch.sig);
  ok("T13 amount mismatch rejected", r.status === 400 && /Amount/.test(r.data.error || ""), r.data.error);
  ok("T13 payment still pending", (await buyer.json(`/api/payments/${pay2}/status`)).data.status === "pending");
  r = await buyer.json("/api/payments", { loanId, periodIndex: 3, method: "qris" });
  ok("cannot pay a later period first", r.status === 400, r.data.error);
  r = await admin.json("/api/simulator/act", { paymentId: pay2, action: "expire" });
  ok("T14 Kedaluwarsakan → expired", r.status === 200 && (await buyer.json(`/api/payments/${pay2}/status`)).data.status === "expired");
  r = await buyer.json("/api/payments", { loanId, periodIndex: 2, method: "qris" });
  ok("T14 create new payment after expiry", r.status === 200 && r.data.paymentId !== pay2);
  const pay3 = r.data.paymentId as string;
  const qrPage = await buyer.html(`/pay/${pay3}`);
  ok("QRIS page renders QR + SIMULASI", qrPage.text.includes("<svg") && qrPage.text.includes("SIMULASI"));
  // the QR encodes /simulator/<id>?t=<token>; a phone without any session uses that token
  const tokenMatch = qrPage.text.match(/\/simulator\/[^"?]+\?t=([a-f0-9]{32})/);
  // the token is only in the QR image for buyers; recompute it as the phone would read it from the QR
  const token = tokenMatch?.[1] ?? createHmac("sha256", SECRET).update(`sim|${pay3}`).digest("hex").slice(0, 32);
  const phone = new Client();
  ok("T10 phone opens simulator via QR link (no login)", (await phone.html(`/simulator/${pay3}?t=${token}`)).status === 200);
  ok("simulator without token → 404", (await phone.html(`/simulator/${pay3}`)).status === 404);
  s = t0();
  r = await phone.json("/api/simulator/act", { paymentId: pay3, action: "pay", t: token });
  ok("T10 phone taps Bayar → paid + receipt on NEAR", r.status === 200 && !!r.data.webhook?.tx_hash, `${t0() - s} ms`);
  ok("T10 investor sees 2 / 120", (await inv1.html("/investor")).text.includes("2 / 120 periods paid"));

  console.log("Q2–Q6 · agents (current LLM_PROVIDER)");
  const investorQs = ["How many shares are left?", "What is one share?", "How does voting work?", "What is my vote weight?", "What is the project status?", "Show me the latest repayment", "Where can I verify on-chain?", "What tenor options are there?"];
  for (const q of investorQs) {
    r = await inv1.json("/api/agent", { agent: "investor", message: q });
    ok(`Q2 investor: ${q}`, r.status === 200 && (r.data.reply || "").length > 10, `${r.data.provider} ${r.data.latencyMs} ms · ${(r.data.reply || r.data.error || "").slice(0, 90).replace(/\n/g, " ")}`);
  }
  r = await inv1.json("/api/agent", { agent: "investor", message: "What return will I get?" });
  ok("Q3 returns question declined", r.status === 200 && /(can't|cannot|not able|no (returns|yield)|tidak)/i.test(r.data.reply || ""), (r.data.reply || "").slice(0, 100));
  const buyerQs: [string, RegExp | null][] = [["How big is the master bedroom?", /4[.,]5/], ["What's included?", /kitchen|cabinet/i], ["Monthly for 10 years?", /27\.662\.692/], ["Monthly for 7 years?", /5, 10.*15|5,? 10,? (or|and) 15/i], ["How much is the down payment?", /570\.000\.000|20/], ["When is my next payment?", /3|period/i], ["How do I pay?", /VA|QRIS|Virtual/i], ["What does DAO-financed mean?", /investor|DAO/i]];
  for (const [q, re] of buyerQs) {
    r = await buyer.json("/api/agent", { agent: "buyer", message: q });
    ok(`Q4 buyer: ${q}`, r.status === 200 && (!re || re.test(r.data.reply || "")), `${r.data.latencyMs} ms · ${(r.data.reply || r.data.error || "").slice(0, 90).replace(/\n/g, " ")}`);
  }
  r = await buyer2.json("/api/agent", { agent: "buyer", message: "I want to buy" });
  ok("Q5 unverified buyer told to verify", /verif/i.test(r.data.reply || ""), (r.data.reply || "").slice(0, 100));
  ok("agent: buyer cannot use investor agent", (await buyer.json("/api/agent", { agent: "investor", message: "hi" })).status === 403);

  console.log("Q7 · marketing agents");
  const sitesHtml = await admin.html("/admin?tab=marketing");
  const siteIds = [...new Set([...sitesHtml.text.matchAll(/data-site-id="([^"]+)"/g)].map((m) => m[1]))];
  for (const id of siteIds) {
    r = await admin.json("/api/admin/marketing", { siteId: id });
    ok(`Q7 marketing ${id}`, r.status === 200 && r.data.report?.report?.simulated_metrics?.note === "simulated", r.data.error ?? `${r.data.latencyMs} ms, attempts ${r.data.attempts}`);
  }
  ok("Q7 three marketing sites found", siteIds.length === 3, String(siteIds.length));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log("Failures:\n - " + failures.join("\n - "));
    process.exit(1);
  }
}

async function findBuyerId(admin: Client): Promise<string> {
  const h = await admin.html("/admin?tab=buyers");
  const m = h.text.match(/data-buyer-email="buyer1@residentstart\.demo" data-buyer-id="([^"]+)"/);
  if (!m) throw new Error("buyer1 id not found on admin buyers tab");
  return m[1];
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
