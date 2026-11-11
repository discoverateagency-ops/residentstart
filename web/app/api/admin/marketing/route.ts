import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { chat, provider } from "@/lib/llm";
import { buildMarketingContext, readPrompt } from "@/lib/agent-context";
import { ReportSchema, extractJson, mockReport } from "@/lib/marketing";

export const maxDuration = 120;

/** Run one marketing agent: {siteId}. JSON validated against the Prompt C schema; one retry on invalid output. */
export async function POST(req: Request) {
  try {
    const admin = await requireRole("admin");
    const { siteId } = (await req.json()) as { siteId?: string };
    const site = siteId ? await prisma.marketingSite.findUnique({ where: { id: siteId } }) : null;
    if (!site) return json({ error: "Site not found" }, 404);
    const ctx = await buildMarketingContext(site.id);
    const system = [
      readPrompt("guardrails"),
      readPrompt("marketing_agent").replaceAll("{site_name}", site.name).replaceAll("{site_url}", site.url),
      "CONTEXT:\n" + JSON.stringify(ctx, null, 1),
    ].join("\n\n");
    const runIndex = await prisma.marketingReport.count({ where: { siteId: site.id } });
    const mockJson = JSON.stringify(mockReport(site, runIndex));

    let lastErr = "";
    let totalMs = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const user = attempt === 0
        ? "Produce this week's simulated SEO work report as JSON."
        : `Your previous reply was invalid (${lastErr}). Return ONLY a JSON object that matches the schema exactly.`;
      const res = await chat({ system, messages: [{ role: "user", content: user }], json: true, mockAgent: "marketing", mockVars: { __marketing_json: mockJson } });
      totalMs += res.latencyMs;
      try {
        const report = ReportSchema.parse(extractJson(res.text));
        const saved = await prisma.marketingReport.create({ data: { siteId: site.id, weekOf: report.week_of, report } });
        await prisma.agentMessage.create({ data: { userId: admin.id, agent: site.key, role: "assistant", content: `report ${saved.id}`, latencyMs: totalMs, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens } });
        return json({ ok: true, report: saved, latencyMs: totalMs, provider: provider(), attempts: attempt + 1 });
      } catch (e) {
        lastErr = e instanceof Error ? e.message.slice(0, 300) : "invalid JSON";
      }
    }
    return json({ error: `The agent returned invalid JSON twice: ${lastErr}` }, 502);
  } catch (e) {
    return handleError(e);
  }
}
