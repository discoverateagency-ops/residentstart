import { prisma } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { chat, provider, type ChatMessage } from "@/lib/llm";
import { buildBuyerContext, buildInvestorContext, loadKnowledge, mockVarsBuyer, mockVarsInvestor, readPrompt } from "@/lib/agent-context";

export const maxDuration = 60;

/** POST /api/agent {agent: investor|buyer, message} — prompt order: guardrails → agent prompt → KNOWLEDGE → CONTEXT → last 6 messages → question. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { agent?: string; message?: string };
    const agent = body.agent;
    const message = (body.message || "").trim();
    if (agent !== "investor" && agent !== "buyer") return json({ error: "Unknown agent" }, 400);
    if (!message) return json({ error: "Type a question" }, 400);
    if (message.length > 1000) return json({ error: "Question is too long (max 1000 characters)" }, 400);
    const user = await requireRole(agent);

    const ctx = agent === "investor" ? await buildInvestorContext(user.id) : await buildBuyerContext(user.id);
    const system = [
      readPrompt("guardrails"),
      readPrompt(agent === "investor" ? "investor_agent" : "buyer_agent"),
      "KNOWLEDGE:\n" + loadKnowledge(agent),
      "CONTEXT:\n" + JSON.stringify(ctx, null, 1),
    ].join("\n\n");

    const history = await prisma.agentMessage.findMany({ where: { userId: user.id, agent }, orderBy: [{ createdAt: "desc" }, { role: "asc" }], take: 6 });
    const messages: ChatMessage[] = history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    // the API needs alternating turns that start with user
    while (messages.length && messages[0].role !== "user") messages.shift();
    messages.push({ role: "user", content: message });
    const merged: ChatMessage[] = [];
    for (const m of messages) {
      const prev = merged[merged.length - 1];
      if (prev && prev.role === m.role) prev.content += "\n\n" + m.content;
      else merged.push({ ...m });
    }

    const mockVars = agent === "investor" ? mockVarsInvestor(ctx as Awaited<ReturnType<typeof buildInvestorContext>>) : mockVarsBuyer(ctx as Awaited<ReturnType<typeof buildBuyerContext>>);
    let res;
    try {
      res = await chat({ system, messages: merged, mockAgent: agent, mockVars, mockQuestion: message });
    } catch (e) {
      console.error("[agent] provider error", (e as Error).message);
      throw new HttpError(502, "The agent is unavailable right now. Please try again.");
    }
    const askedAt = new Date();
    await prisma.agentMessage.createMany({
      data: [
        { userId: user.id, agent, role: "user", content: message, createdAt: askedAt },
        { userId: user.id, agent, role: "assistant", content: res.text, latencyMs: res.latencyMs, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens, createdAt: new Date(askedAt.getTime() + 1) },
      ],
    });
    return json({ reply: res.text, latencyMs: res.latencyMs, provider: res.provider });
  } catch (e) {
    return handleError(e);
  }
}

/** GET /api/agent?agent=investor — last 20 messages. */
export async function GET(req: Request) {
  try {
    const agent = new URL(req.url).searchParams.get("agent");
    if (agent !== "investor" && agent !== "buyer") return json({ error: "Unknown agent" }, 400);
    const user = await requireRole(agent);
    const rows = await prisma.agentMessage.findMany({ where: { userId: user.id, agent }, orderBy: [{ createdAt: "desc" }, { role: "asc" }], take: 20 });
    return json({ provider: provider(), messages: rows.reverse().map((r) => ({ role: r.role, content: r.content, latencyMs: r.latencyMs })) });
  } catch (e) {
    return handleError(e);
  }
}
