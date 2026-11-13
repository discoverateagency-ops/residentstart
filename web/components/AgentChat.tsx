"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string; latencyMs?: number | null };

export function AgentChat({ agent, project, title, chips }: { agent: "investor" | "buyer"; project?: string; title: string; chips: string[] }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/agent?agent=${agent}`)
      .then((r) => r.json())
      .then((d) => setMsgs(d.messages || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [agent]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setErr("");
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const r = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agent, message: q, project }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "The agent could not answer");
      setMsgs((m) => [...m, { role: "assistant", content: d.reply, latencyMs: d.latencyMs }]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-0 overflow-hidden flex flex-col" aria-label={title}>
      <div className="px-5 py-4 border-b border-rs-border flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#12B76A]" aria-hidden />
        <h2 className="text-base">{title}</h2>
      </div>
      <div ref={listRef} className="px-4 py-4 flex flex-col gap-3 max-h-[420px] min-h-[160px] overflow-y-auto bg-rs-bg/50">
        {!loaded && <div className="skeleton h-10 w-2/3" />}
        {loaded && msgs.length === 0 && <p className="text-sm text-rs-ink/60">Ask anything about the project. Answers use the project data only.</p>}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-rs-green-100 px-4 py-2 text-sm whitespace-pre-wrap break-words">{m.content}</div>
          ) : (
            <div key={i} className="self-start max-w-[92%]">
              <div className="rounded-2xl rounded-bl-sm bg-white border border-rs-border px-4 py-2 text-sm break-words [&_a]:text-rs-green-700 [&_a]:underline [&_a]:break-all [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:text-xs [&_td]:pr-2 [&_th]:pr-2 [&_th]:text-left">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}>{m.content}</ReactMarkdown>
              </div>
              {m.latencyMs != null && <p className="text-[11px] text-rs-ink/50 mt-1 ml-1">answered in {(m.latencyMs / 1000).toFixed(1)} s</p>}
            </div>
          ),
        )}
        {busy && <div className="self-start rounded-2xl bg-white border border-rs-border px-4 py-2 text-sm text-rs-ink/60">Thinking…</div>}
      </div>
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
        {chips.map((c) => (
          <button key={c} onClick={() => send(c)} disabled={busy} className="shrink-0 rounded-full border border-rs-green-700 text-rs-green-700 text-xs font-medium px-3 py-1.5 hover:bg-rs-green-100 disabled:opacity-40">
            {c}
          </button>
        ))}
      </div>
      <form className="p-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input className="input py-2.5" placeholder="Type a question…" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} aria-label="Your question" />
        <button className="btn-primary px-4" disabled={busy || !input.trim()} aria-label="Send">➤</button>
      </form>
      {err && <p className="err px-4 -mt-2 mb-2" role="alert">{err}</p>}
      <p className="px-4 pb-4 text-[12px] text-rs-ink/55">Demo agent · not financial advice · answers use project data only</p>
    </section>
  );
}
