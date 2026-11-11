import "server-only";
import { z } from "zod";

export const ReportSchema = z.object({
  site: z.string().min(1),
  week_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  focus_keywords: z.array(z.object({ keyword: z.string().min(1), intent: z.enum(["informational", "transactional", "navigational"]), priority: z.number().int().min(1).max(3) })).min(5).max(12),
  title_meta_suggestions: z.array(z.object({ page: z.string().min(1), title: z.string().min(1).max(70), meta_description: z.string().min(1).max(170) })).min(2).max(5),
  content_ideas: z.array(z.object({ title: z.string().min(1), format: z.enum(["article", "video", "landing"]), target_keyword: z.string().min(1), why: z.string().min(1) })).min(3).max(7),
  backlink_plan: z.array(z.object({ target: z.string().min(1), approach: z.string().min(1) })).min(2).max(5),
  weekly_tasks: z.array(z.object({ day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri"]), task: z.string().min(1), owner: z.string().min(1) })).min(3).max(7),
  simulated_metrics: z.object({ impressions: z.number().int().min(0), clicks: z.number().int().min(0), avg_position: z.number().min(0), note: z.literal("simulated") }),
});
export type Report = z.infer<typeof ReportSchema>;

/** Pulls the first JSON object out of a model reply (tolerates code fences). */
export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in the reply");
  return JSON.parse(t.slice(start, end + 1));
}

export function weekOf(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

/** Deterministic simulated report for LLM_PROVIDER=mock. */
export function mockReport(site: { name: string; url: string; purpose: string }, runIndex: number): Report {
  const base: Record<string, { kw: [string, Report["focus_keywords"][number]["intent"], number][]; pages: [string, string, string][] }> = {
    corporate: {
      kw: [["developer properti jakarta", "navigational", 1], ["residentstart", "navigational", 1], ["property crowdfunding indonesia", "informational", 1], ["rumah cicilan tanpa bank", "transactional", 2], ["DAO properti", "informational", 2], ["developer rumah jakarta selatan", "navigational", 2], ["how property DAO works", "informational", 3], ["investasi rumah blockchain", "informational", 3]],
      pages: [["Home", "Residentstart · Property crowdfunding in Jakarta", "Residentstart funds its own homes through a DAO on NEAR. Buyers pay in rupiah; repayments are recorded on-chain. Hackathon demo."], ["About", "About Residentstart · Developer + DAO on NEAR", "Who we are and how the Residentstart DAO funds housing projects in Jakarta. Demo on NEAR testnet."], ["How it works", "How Residentstart works · Invest, buy, verify", "Four steps: browse, invest or buy, the DAO funds the build, buyers repay and investors verify on-chain."]],
    },
    "project-listing": {
      kw: [["rumah cilandak", "transactional", 1], ["rumah dijual jakarta selatan", "transactional", 1], ["rumah 3 kamar cilandak", "transactional", 1], ["cicilan rumah 10 tahun", "informational", 2], ["rumah dekat MRT fatmawati", "transactional", 2], ["virtual tour rumah", "informational", 2], ["harga rumah cilandak 2026", "informational", 3], ["rumah 2 lantai jakarta selatan", "transactional", 3]],
      pages: [["Listing", "Rumah 3 Kamar di Cilandak · Cicilan 5–15 Tahun", "Rumah 2 lantai di Cilandak, Jakarta Selatan. 3 kamar, 2 kamar mandi, tur 360°. Cicilan dibiayai DAO. Demo."], ["Virtual tour", "Tur Virtual 360° · Cilandak Residence", "Jelajahi ruang tamu, dapur, kamar utama dan kamar mandi dari ponsel Anda. Desain ilustratif."], ["Payment options", "Cara Bayar · Tunai atau Cicilan Rupiah", "Bayar tunai dengan diskon 5 % atau cicilan 5, 10, 15 tahun. Pembayaran simulasi VA dan QRIS."]],
    },
    investor: {
      kw: [["real world assets NEAR", "informational", 1], ["property DAO", "informational", 1], ["tokenized real estate Indonesia", "informational", 1], ["invest in Jakarta property crypto", "transactional", 2], ["on-chain repayment receipts", "informational", 2], ["NEAR testnet DAO demo", "navigational", 2], ["RWA housing finance", "informational", 3], ["residentstart invest", "navigational", 3]],
      pages: [["Invest", "Invest in Jakarta homes through a DAO on NEAR", "Buy shares in a housing project with NEAR testnet and track every rupiah repayment on-chain. Demo, no real money."], ["Transparency", "On-chain receipts · Residentstart vault", "Each paid installment is hashed and written to the vault contract. Verify progress on NearBlocks."], ["Governance", "DAO voting · Approve project funding", "Share holders vote to approve funding; weight equals shares. See how proposals work in the demo."]],
    },
  };
  const b = base[site.purpose] ?? base.corporate;
  const growth = 1 + runIndex * 0.18;
  return {
    site: site.name,
    week_of: weekOf(),
    focus_keywords: b.kw.map(([keyword, intent, priority]) => ({ keyword, intent, priority })),
    title_meta_suggestions: b.pages.map(([page, title, meta_description]) => ({ page, title: title.slice(0, 60), meta_description: meta_description.slice(0, 155) })),
    content_ideas: [
      { title: `Panduan cicilan rumah tanpa bank (${site.name})`, format: "article", target_keyword: b.kw[3][0], why: "Answers the most common buyer question with the demo's real numbers." },
      { title: "60-second walk through Cilandak Residence", format: "video", target_keyword: b.kw[0][0], why: "Short tour clip reuses the 360° panoramas for social channels." },
      { title: "How repayments appear on NEAR", format: "article", target_keyword: b.kw[2][0], why: "Builds trust by showing the receipt → NearBlocks path." },
      { title: "Cilandak area guide: MRT, schools, business corridor", format: "article", target_keyword: b.kw[4][0], why: "Local intent searches convert well for listing pages." },
      { title: "Invest or buy? Two paths, one project", format: "landing", target_keyword: b.kw[1][0], why: "Splits traffic by intent early." },
    ],
    backlink_plan: [
      { target: "local property news sites", approach: "Pitch a data-backed story about small-developer financing." },
      { target: "Web3 community blogs", approach: "Guest post explaining on-chain repayment receipts." },
      { target: "neighbourhood directories", approach: "List the project page with accurate location and contact." },
    ],
    weekly_tasks: [
      { day: "Mon", task: "Review keyword positions and pick this week's focus", owner: "agent" },
      { day: "Tue", task: "Draft the article for the top content idea", owner: "agent" },
      { day: "Wed", task: "Update titles and meta descriptions on 3 pages", owner: "agent" },
      { day: "Thu", task: "Prepare backlink outreach notes", owner: "agent" },
      { day: "Fri", task: "Write the weekly report and next-week plan", owner: "agent" },
    ],
    simulated_metrics: { impressions: Math.round(1200 * growth), clicks: Math.round(54 * growth), avg_position: Math.round((24 - runIndex * 1.4) * 10) / 10, note: "simulated" },
  };
}
