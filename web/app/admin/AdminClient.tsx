"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import { StatusPill } from "@/components/StatusPill";
import { TxLinkClient } from "@/components/TxLinkClient";
import { idr, pct } from "@/lib/format";
import { buildScenes, loadPannellum, type TourRoom } from "@/lib/client/pannellum";

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

// ---------------- Project ----------------
type ProjectData = {
  id: string; name: string; location: string; type: string; description: string; bedrooms: number; bathrooms: number; landM2: number; buildingM2: number; floors: number;
  listPriceIdr: string; cashDiscountPct: number; downPaymentPct: number; annualRatePct: number; tenorYears: unknown; status: string; published: boolean;
  sharePriceNear: number; totalShares: number; sharesSold: number; included: unknown; notIncluded: unknown; onchainProjectId: string | null; slug: string;
};

export function ProjectForm({ project, coverUrl }: { project: ProjectData; coverUrl: string | null }) {
  const router = useRouter();
  const [f, setF] = useState({
    ...project,
    tenorYears: (project.tenorYears as number[]).join(", "),
    included: (project.included as string[]).join("\n"),
    notIncluded: (project.notIncluded as string[]).join("\n"),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const locked = !!project.onchainProjectId;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await post("/api/admin/project", {
        ...f,
        tenorYears: f.tenorYears.split(/[,\s]+/).filter(Boolean).map(Number),
        included: f.included.split("\n").map((s) => s.trim()).filter(Boolean),
        notIncluded: f.notIncluded.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      toast("Project saved");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof f, label: string, type = "text", extra: Record<string, unknown> = {}) => (
    <div>
      <label className="label" htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} className="input" type={type} value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value)} {...extra} />
    </div>
  );

  return (
    <form onSubmit={save} className="grid lg:grid-cols-[1fr_300px] gap-6">
      <div className="flex flex-col gap-6 min-w-0">
        <fieldset className="card grid sm:grid-cols-2 gap-4"><legend className="font-semibold text-rs-green-900 px-1">Basics</legend>
          {field("name", "Name")}{field("location", "Location")}{field("type", "Type")}
          <div className="sm:col-span-2"><label className="label" htmlFor="f-desc">Description</label><textarea id="f-desc" className="input min-h-28" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        </fieldset>
        <fieldset className="card grid grid-cols-2 sm:grid-cols-3 gap-4"><legend className="font-semibold text-rs-green-900 px-1">Size</legend>
          {field("bedrooms", "Bedrooms", "number")}{field("bathrooms", "Bathrooms", "number")}{field("floors", "Floors", "number")}{field("landM2", "Land m²", "number")}{field("buildingM2", "Building m²", "number")}
        </fieldset>
        <fieldset className="card grid sm:grid-cols-2 gap-4"><legend className="font-semibold text-rs-green-900 px-1">Pricing</legend>
          {field("listPriceIdr", "List price (IDR)", "number")}{field("cashDiscountPct", "Cash discount %", "number")}{field("downPaymentPct", "Down payment %", "number")}{field("annualRatePct", "Annual rate % (demo)", "number", { step: "0.1" })}
          {field("tenorYears", "Tenors (years, comma-separated)")}
          <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
            <div><label className="label" htmlFor="f-inc">Included (one per line)</label><textarea id="f-inc" className="input min-h-32" value={f.included} onChange={(e) => set("included", e.target.value)} /></div>
            <div><label className="label" htmlFor="f-ninc">Not included (one per line)</label><textarea id="f-ninc" className="input min-h-32" value={f.notIncluded} onChange={(e) => set("notIncluded", e.target.value)} /></div>
          </div>
        </fieldset>
        <fieldset className="card grid sm:grid-cols-2 gap-4"><legend className="font-semibold text-rs-green-900 px-1">Shares</legend>
          {field("sharePriceNear", "Share price (NEAR)", "number", { disabled: locked })}{field("totalShares", "Total shares", "number", { disabled: locked })}
          {locked && <p className="sm:col-span-2 text-xs text-rs-ink/60">Fixed: the project exists on-chain ({project.onchainProjectId}).</p>}
        </fieldset>
        <fieldset className="card grid sm:grid-cols-2 gap-4 items-end"><legend className="font-semibold text-rs-green-900 px-1">Status</legend>
          <div><label className="label" htmlFor="f-status">Status (DB)</label>
            <select id="f-status" className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
              {["funding", "funded", "in_construction", "completed"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 font-medium"><input type="checkbox" className="h-5 w-5 accent-[#1E4D45]" checked={f.published} onChange={(e) => set("published", e.target.checked)} /> Published</label>
          <p className="sm:col-span-2 text-xs text-rs-ink/60">funding/funded are driven by the DAO contract; use the DAO tab to change the on-chain status.</p>
        </fieldset>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn-primary self-start" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </div>
      <aside className="lg:sticky lg:top-24 self-start">
        <p className="text-sm text-rs-ink/60 mb-2">Landing card preview</p>
        <div className="card p-0 overflow-hidden">
          <div className="relative aspect-video bg-rs-green-100">{coverUrl && <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />}</div>
          <div className="p-4 text-sm flex flex-col gap-2">
            <strong className="text-rs-green-900">{f.name}</strong>
            <span className="text-rs-ink/60">{f.location}</span>
            <span className="tabular">{f.sharePriceNear} NEAR / share · {pct(project.totalShares ? (project.sharesSold / project.totalShares) * 100 : 0)}</span>
            <span className="tabular">{idr(Number(f.listPriceIdr) || 0)}</span>
            <span><StatusPill status={f.status} /> {!f.published && <span className="text-rs-danger text-xs">unpublished</span>}</span>
          </div>
        </div>
      </aside>
    </form>
  );
}

// ---------------- DAO ----------------
type Prop = { id: string; onchainId: string; description: string; status: string; yes: number; no: number; createTx: string | null; finalizedTx: string | null };

export function DaoActions({ onchain, status, defaultDescription, proposals }: { onchain: boolean; status: string; defaultDescription: string; proposals: Prop[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [desc, setDesc] = useState(defaultDescription);
  const [err, setErr] = useState("");
  const open = proposals.find((p) => p.status === "open");

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setErr("");
    try {
      const d = await post("/api/admin/dao", { action, ...extra });
      toast(action === "refresh" ? "Refreshed from chain" : "Done on NEAR", "ok", d.nearblocksUrl);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="card flex flex-col gap-4">
        <h2 className="text-lg">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" disabled={onchain || !!busy} onClick={() => act("create_project")}>{busy === "create_project" ? "Creating…" : onchain ? "Project created on-chain ✓" : "Create project on-chain"}</button>
          <button className="btn-secondary" disabled={!!busy} onClick={() => act("refresh")}>{busy === "refresh" ? "Refreshing…" : "Refresh from chain"}</button>
        </div>
        <div>
          <label className="label" htmlFor="pdesc">Open funding proposal</label>
          <textarea id="pdesc" className="input min-h-20" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} />
          <button className="btn-primary mt-2" disabled={!onchain || !!open || !!busy} onClick={() => act("create_proposal", { description: desc })} title={!onchain ? "Create the project on-chain first" : open ? "A proposal is already open" : ""}>
            {busy === "create_proposal" ? "Opening…" : "Open funding proposal"}
          </button>
        </div>
        {status === "funded" && (
          <div className="flex flex-wrap gap-2 items-center text-sm">
            <span className="text-rs-ink/60">After funding:</span>
            <button className="btn-secondary btn-sm" disabled={!!busy} onClick={() => act("set_status", { status: "in_construction" })}>Mark in construction</button>
          </div>
        )}
        {status === "in_construction" && <button className="btn-secondary btn-sm self-start" disabled={!!busy} onClick={() => act("set_status", { status: "completed" })}>Mark completed</button>}
        {err && <p className="err" role="alert">{err}</p>}
      </section>
      <section className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-rs-border"><h2 className="text-lg">Proposals</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular min-w-[640px]">
            <thead className="bg-rs-bg text-left text-rs-ink/60"><tr><th className="px-4 py-2">Id</th><th>Description</th><th>Yes / No</th><th>Status</th><th>Tx</th><th className="pr-4" /></tr></thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id} className="border-t border-rs-border">
                  <td className="px-4 py-2">{p.onchainId}</td>
                  <td>{p.description}</td>
                  <td>{p.yes} / {p.no}</td>
                  <td><StatusPill status={p.status} /></td>
                  <td className="space-x-2"><TxLinkClient hash={p.createTx} label="open" /> <TxLinkClient hash={p.finalizedTx} label="final" /></td>
                  <td className="pr-4 py-2">{p.status === "open" && <button className="btn-primary btn-sm" disabled={!!busy} onClick={() => act("finalize", { proposalId: p.id })}>{busy === "finalize" ? "Finalizing…" : "Finalize proposal"}</button>}</td>
                </tr>
              ))}
              {proposals.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-rs-ink/60">No proposals yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function VerifyButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn-secondary btn-sm" disabled={busy} onClick={async (e) => {
      e.preventDefault();
      setBusy(true);
      try { await post("/api/admin/verify", { userId }); toast("Buyer verified (admin override)"); router.refresh(); } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
    }}>{busy ? "…" : "Mark verified (override)"}</button>
  );
}

export function RetryReceiptButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="text-rs-green-700 underline disabled:opacity-40" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await post("/api/admin/retry-receipt", { paymentId }); toast("Receipt recorded on NEAR"); router.refresh(); } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
    }}>{busy ? "Retrying…" : "Retry receipt"}</button>
  );
}

// ---------------- Designs ----------------
export function DesignsAdmin({ designs }: { designs: { id: string; kind: string; title: string; imageUrl: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/designs", { method: "POST", body: new FormData(e.currentTarget) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");
      (e.target as HTMLFormElement).reset();
      toast("Design uploaded");
      router.refresh();
    } catch (er) {
      setErr((er as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function patch(id: string, action: string) {
    if (action === "delete" && !confirm("Delete this design?")) return;
    const r = await fetch("/api/admin/designs", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (!r.ok) toast((await r.json()).error || "Failed", "error");
    router.refresh();
  }
  return (
    <section className="card">
      <h2 className="text-lg mb-3">2D designs</h2>
      <ul className="flex flex-col gap-2">
        {designs.map((d, i) => (
          <li key={d.id} className="flex items-center gap-3 border border-rs-border rounded-xl p-2">
            <div className="relative h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-rs-green-100"><Image src={d.imageUrl} alt="" fill className="object-cover" unoptimized /></div>
            <div className="min-w-0 flex-1 text-sm"><p className="font-medium truncate">{d.title}</p><p className="text-rs-ink/60">{d.kind}</p></div>
            <button className="btn-sm btn border border-rs-border" disabled={i === 0} onClick={() => patch(d.id, "up")} aria-label="Move up">↑</button>
            <button className="btn-sm btn border border-rs-border" disabled={i === designs.length - 1} onClick={() => patch(d.id, "down")} aria-label="Move down">↓</button>
            <button className="btn-sm btn text-rs-danger border border-rs-border" onClick={() => patch(d.id, "delete")}>Delete</button>
          </li>
        ))}
      </ul>
      <form onSubmit={upload} className="mt-4 grid sm:grid-cols-[1fr_140px_1fr_auto] gap-2 items-end">
        <div><label className="label" htmlFor="d-title">Title</label><input id="d-title" name="title" className="input" required /></div>
        <div><label className="label" htmlFor="d-kind">Kind</label><select id="d-kind" name="kind" className="input"><option value="render">render</option><option value="floor_plan">floor_plan</option></select></div>
        <div><label className="label" htmlFor="d-file">Image</label><input id="d-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" required className="block w-full text-sm" /></div>
        <button className="btn-primary" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      </form>
      {err && <p className="err" role="alert">{err}</p>}
    </section>
  );
}

type RoomRow = { id: string; key: string; name: string; floor: number; sizeM2: number; panoramaUrl: string; initialYaw: number; hotspots: unknown[] };

export function RoomsAdmin({ rooms }: { rooms: RoomRow[] }) {
  const [sel, setSel] = useState(rooms[0]?.id);
  const room = rooms.find((r) => r.id === sel) ?? rooms[0];
  if (!room) return null;
  return (
    <section className="card">
      <h2 className="text-lg mb-3">Rooms (360° tour)</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {rooms.map((r) => (
          <button key={r.id} onClick={() => setSel(r.id)} className={`shrink-0 rounded-xl border p-2 text-left text-sm ${r.id === room.id ? "border-rs-green-700 bg-rs-green-100" : "border-rs-border"}`}>
            <div className="relative h-12 w-24 rounded-lg overflow-hidden bg-black/10 mb-1"><Image src={r.panoramaUrl} alt="" fill className="object-cover" unoptimized /></div>
            <div className="font-medium">{r.name}</div>
            <div className="text-xs text-rs-ink/60">{r.key} · fl {r.floor} · {r.sizeM2} m²</div>
          </button>
        ))}
      </div>
      <RoomEditor key={room.id} room={room} allRooms={rooms} />
    </section>
  );
}

function RoomEditor({ room, allRooms }: { room: RoomRow; allRooms: RoomRow[] }) {
  const router = useRouter();
  const [yaw, setYaw] = useState(String(room.initialYaw));
  const [text, setText] = useState(JSON.stringify(room.hotspots, null, 2));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<{ destroy(): void } | null>(null);

  let parsed: RoomRow["hotspots"] | null = null;
  let parseErr = "";
  try {
    const v = JSON.parse(text);
    if (!Array.isArray(v)) throw new Error("must be an array");
    parsed = v;
  } catch (e) {
    parseErr = (e as Error).message;
  }

  useEffect(() => {
    let cancelled = false;
    if (!parsed || !previewRef.current) return;
    const hs = parsed as TourRoom["hotspots"];
    loadPannellum()
      .then((pannellum) => {
        if (cancelled || !previewRef.current) return;
        viewerRef.current?.destroy();
        const scenes = buildScenes([{ key: room.key, name: room.name, panoramaUrl: room.panoramaUrl, initialYaw: Number(yaw) || 0, hotspots: hs.filter((h) => typeof h?.yaw === "number" && typeof h?.pitch === "number") }]);
        // hotspots link to rooms not in this preview: render as info points
        for (const h of scenes[room.key].hotSpots) h.type = "info";
        viewerRef.current = pannellum.viewer(previewRef.current, { default: { firstScene: room.key, sceneFadeDuration: 0, autoLoad: true, showControls: true }, scenes });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, yaw, room.panoramaUrl]);
  useEffect(() => () => viewerRef.current?.destroy(), []);

  async function save() {
    if (!parsed) return setErr(`Invalid JSON: ${parseErr}`);
    setBusy(true);
    setErr("");
    try {
      await post("/api/admin/rooms", { id: room.id, initialYaw: Number(yaw), hotspots: parsed });
      toast("Room saved");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function uploadPano(file: File) {
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("id", room.id);
      fd.append("panorama", file);
      const r = await fetch("/api/admin/rooms", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");
      toast("Panorama uploaded");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 grid xl:grid-cols-[1fr_480px] gap-4">
      <div className="flex flex-col gap-3 min-w-0">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="yaw">initial_yaw</label><input id="yaw" className="input" type="number" step="1" min={-180} max={180} value={yaw} onChange={(e) => setYaw(e.target.value)} /></div>
          <div><span className="label">Panorama (2:1 JPG)</span><label className="btn-secondary btn-sm cursor-pointer w-full">{busy ? "…" : "Upload panorama"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadPano(e.target.files[0])} /></label></div>
        </div>
        <div>
          <label className="label" htmlFor="hs">Hotspots JSON — targets: {allRooms.map((r) => r.key).join(", ")}</label>
          <textarea id="hs" className={`input font-mono text-xs min-h-56 ${parseErr ? "border-rs-danger" : ""}`} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          {parseErr && <p className="err">JSON: {parseErr}</p>}
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn-primary self-start" onClick={save} disabled={busy || !!parseErr}>{busy ? "Saving…" : "Save room"}</button>
      </div>
      <div ref={previewRef} className="w-full max-w-[480px] aspect-[4/3] rounded-xl overflow-hidden bg-black/80" aria-label="Pannellum preview" />
    </div>
  );
}

// ---------------- Marketing ----------------
type Rep = {
  site: string; week_of: string;
  focus_keywords: { keyword: string; intent: string; priority: number }[];
  title_meta_suggestions: { page: string; title: string; meta_description: string }[];
  content_ideas: { title: string; format: string; target_keyword: string; why: string }[];
  backlink_plan: { target: string; approach: string }[];
  weekly_tasks: { day: string; task: string; owner: string }[];
  simulated_metrics: { impressions: number; clicks: number; avg_position: number; note: string };
};
type SiteRow = { id: string; key: string; name: string; url: string; purpose: string; reports: { id: string; createdAt: string; weekOf: string; report: unknown }[] };

export function MarketingAdmin({ sites }: { sites: SiteRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm rounded-xl bg-[#FFF3CD] text-[#664D03] p-3">Simulation: these agents do not crawl, post or change anything. Metrics are simulated.</p>
      {sites.map((s) => <SiteCard key={s.id} site={s} />)}
    </div>
  );
}

function SiteCard({ site }: { site: SiteRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(site.reports[0]?.id ?? "");
  const cur = site.reports.find((r) => r.id === sel) ?? site.reports[0];
  const rep = cur?.report as Rep | undefined;

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const d = await post("/api/admin/marketing", { siteId: site.id });
      setSel(d.report.id);
      toast(`Report ready in ${(d.latencyMs / 1000).toFixed(1)} s`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const series = [...site.reports].reverse().map((r) => (r.report as Rep).simulated_metrics.impressions);
  return (
    <section className="card" data-site-id={site.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">{site.name}</h2>
          <p className="text-sm text-rs-ink/60 break-all">{site.url} · {site.purpose}</p>
          <p className="text-xs text-rs-ink/50 mt-1">Last run: {site.reports[0] ? new Date(site.reports[0].createdAt).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) + " WIB" : "never"}</p>
        </div>
        <div className="flex gap-2 items-center">
          {site.reports.length > 1 && (
            <select className="input py-2 text-sm w-auto" value={sel} onChange={(e) => setSel(e.target.value)} aria-label="History">
              {site.reports.map((r) => <option key={r.id} value={r.id}>{new Date(r.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })}</option>)}
            </select>
          )}
          <button className="btn-primary" onClick={run} disabled={busy}>{busy ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Running…</span> : "Run agent"}</button>
        </div>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {rep && (
        <div className="mt-5 grid lg:grid-cols-2 gap-5 text-sm">
          <div className="min-w-0">
            <h3 className="text-sm mb-2">Focus keywords · week of {rep.week_of}</h3>
            <div className="overflow-x-auto"><table className="w-full"><thead className="text-left text-rs-ink/60"><tr><th>Keyword</th><th>Intent</th><th>Priority</th></tr></thead>
              <tbody>{rep.focus_keywords.map((k) => <tr key={k.keyword} className="border-t border-rs-border"><td className="py-1 pr-2">{k.keyword}</td><td className="pr-2">{k.intent}</td><td>{k.priority}</td></tr>)}</tbody></table></div>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm mb-2">Simulated impressions <span className="text-xs font-normal text-rs-ink/50">(simulated)</span></h3>
            <LineChart values={series.length >= 2 ? series : [900, 1000, 1080, ...(series.length ? series : [1200])]} demo={series.length < 2} />
            <p className="mt-2 tabular text-rs-ink/70">impressions {rep.simulated_metrics.impressions} · clicks {rep.simulated_metrics.clicks} · avg position {rep.simulated_metrics.avg_position} · <em>{rep.simulated_metrics.note}</em></p>
          </div>
          <div className="lg:col-span-2">
            <h3 className="text-sm mb-2">Title / meta suggestions</h3>
            <ul className="space-y-2">{rep.title_meta_suggestions.map((t) => <li key={t.page} className="border border-rs-border rounded-xl p-3"><p className="text-xs text-rs-ink/60">{t.page}</p><p className="font-medium text-[#1a0dab]">{t.title}</p><p className="text-rs-ink/70">{t.meta_description}</p></li>)}</ul>
          </div>
          <div>
            <h3 className="text-sm mb-2">Content ideas</h3>
            <ol className="list-decimal pl-5 space-y-1">{rep.content_ideas.map((c) => <li key={c.title}><strong>{c.title}</strong> <span className="text-rs-ink/60">({c.format} · {c.target_keyword})</span><br /><span className="text-rs-ink/70">{c.why}</span></li>)}</ol>
          </div>
          <div className="flex flex-col gap-4">
            <div><h3 className="text-sm mb-2">Backlink plan</h3><ul className="list-disc pl-5 space-y-1">{rep.backlink_plan.map((b) => <li key={b.target}><strong>{b.target}</strong>: {b.approach}</li>)}</ul></div>
            <div><h3 className="text-sm mb-2">This week</h3><ul className="space-y-1">{rep.weekly_tasks.map((w) => <li key={w.day + w.task}><span className="inline-block w-10 font-semibold">{w.day}</span>{w.task}</li>)}</ul></div>
          </div>
        </div>
      )}
      {!rep && !busy && <p className="mt-4 text-sm text-rs-ink/60">No report yet. Press &ldquo;Run agent&rdquo;.</p>}
    </section>
  );
}

function LineChart({ values, demo }: { values: number[]; demo: boolean }) {
  const W = 320, H = 120, P = 24;
  const max = Math.max(...values) * 1.1, min = Math.min(...values) * 0.9;
  const pts = values.map((v, i) => [P + (i * (W - 2 * P)) / Math.max(1, values.length - 1), H - P - ((v - min) / Math.max(1, max - min)) * (H - 2 * P)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[420px] h-auto" role="img" aria-label="Simulated impressions line chart">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#D7E0DD" />
      <polyline fill="none" stroke="#1E4D45" strokeWidth="2.5" points={pts.map((p) => p.join(",")).join(" ")} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#1E4D45" />)}
      <text x={W - P} y={14} textAnchor="end" fontSize="11" fill="#667">{demo ? "simulated · static demo data" : "simulated"}</text>
    </svg>
  );
}
