import "server-only";
// All LLM calls go through here. LLM_PROVIDER = anthropic | openai | mock. Keys are server-side env only.
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatInput = {
  system: string;
  messages: ChatMessage[];
  json?: boolean;
  /** which mock agent table to use when LLM_PROVIDER=mock */
  mockAgent?: "investor" | "buyer" | "marketing";
  /** values for {braces} in mock answers */
  mockVars?: Record<string, string>;
};
export type ChatResult = { text: string; latencyMs: number; usage: { inputTokens: number; outputTokens: number }; provider: string; model: string };

export function provider(): "anthropic" | "openai" | "mock" {
  const p = (process.env.LLM_PROVIDER || "mock").toLowerCase();
  if (p === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export async function chat(input: ChatInput): Promise<ChatResult> {
  const p = provider();
  const started = Date.now();
  if (p === "anthropic") return { ...(await anthropicChat(input)), latencyMs: Date.now() - started };
  if (p === "openai") return { ...(await openaiChat(input)), latencyMs: Date.now() - started };
  return { ...mockChat(input), latencyMs: Date.now() - started };
}

// ---------------- Anthropic ----------------
let anthropicClient: Anthropic | null = null;
async function anthropicChat(input: ChatInput): Promise<Omit<ChatResult, "latencyMs">> {
  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 });
  const model = (input.json ? process.env.ANTHROPIC_MODEL_MARKETING : process.env.ANTHROPIC_MODEL) || "claude-opus-5-5";
  const effort = (input.json ? process.env.ANTHROPIC_EFFORT_MARKETING : process.env.ANTHROPIC_EFFORT) || (input.json ? "medium" : "low");
  const system = input.json ? `${input.system}\n\nReturn ONLY the JSON object, no prose, no code fences.` : input.system;
  const res = await anthropicClient.messages.create({
    model,
    max_tokens: 16000,
    system,
    messages: input.messages as Anthropic.MessageParam[],
    output_config: { effort: effort as "low" | "medium" | "high" },
  } as Anthropic.MessageCreateParamsNonStreaming);
  if (res.stop_reason === "refusal") {
    return { text: "I can't help with that request. I can answer questions about this demo project, its prices, shares, voting and payments.", usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens }, provider: "anthropic", model };
  }
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  return { text, usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens }, provider: "anthropic", model };
}

// ---------------- OpenAI ----------------
let openaiClient: OpenAI | null = null;
async function openaiChat(input: ChatInput): Promise<Omit<ChatResult, "latencyMs">> {
  openaiClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 1 });
  const model = (input.json ? process.env.OPENAI_MODEL_MARKETING : process.env.OPENAI_MODEL) || "gpt-5-mini";
  const res = await openaiClient.chat.completions.create({
    model,
    messages: [{ role: "system", content: input.system }, ...input.messages],
    ...(input.json ? { response_format: { type: "json_object" as const } } : {}),
  });
  return {
    text: (res.choices[0]?.message?.content || "").trim(),
    usage: { inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 },
    provider: "openai",
    model,
  };
}

// ---------------- Mock ----------------
type MockEntry = { keywords: string[]; answer: string };
type MockFile = { investor: MockEntry[]; buyer: MockEntry[]; fallback: string };
let mockData: MockFile | null = null;
function loadMock(): MockFile {
  mockData ??= JSON.parse(readFileSync(join(process.cwd(), "data", "mock-answers.json"), "utf8")) as MockFile;
  return mockData;
}

export function fillBraces(template: string, vars: Record<string, string>): string {
  // conditional blocks {if_verified:...} / {if_unverified:...}
  let out = template.replace(/\{if_(verified|unverified):([^}]*)\}/g, (_m, cond: string, body: string) => {
    const verified = vars.verified === "true";
    return (cond === "verified") === verified ? body : "";
  });
  out = out.replace(/\{([a-z0-9_]+)\}/gi, (m, k: string) => (k in vars ? vars[k] : m));
  return out.trim();
}

function mockChat(input: ChatInput): Omit<ChatResult, "latencyMs"> {
  const last = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (input.json || input.mockAgent === "marketing") {
    return { text: input.mockVars?.__marketing_json ?? "{}", usage: { inputTokens: 0, outputTokens: 0 }, provider: "mock", model: "mock" };
  }
  const data = loadMock();
  const table = input.mockAgent === "buyer" ? data.buyer : data.investor;
  const q = last.toLowerCase();
  const hit = table.find((e) => e.keywords.every((k) => matchesKeyword(q, k.toLowerCase())));
  const text = fillBraces(hit ? hit.answer : data.fallback, input.mockVars ?? {});
  return { text, usage: { inputTokens: 0, outputTokens: 0 }, provider: "mock", model: "mock" };
}

/** Numeric keywords ("5", "10") must match as whole numbers so "15 years" doesn't hit the 5-year answer. */
function matchesKeyword(q: string, k: string): boolean {
  if (/^\d+$/.test(k)) return new RegExp(`(^|[^0-9])${k}([^0-9]|$)`).test(q);
  return q.includes(k);
}
