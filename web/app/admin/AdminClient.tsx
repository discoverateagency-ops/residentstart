"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import { StatusPill } from "@/components/StatusPill";
import { TxLinkClient } from "@/components/TxLinkClient";
import { idr } from "@/lib/format";

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

// ---------------- Project ----------------
type Photo = { kind: string; url: string; alt: string };
type Near = { name: string; kind: string; distance_km: number };
type ProjectData = {
  id: string; name: string; location: string; type: string; description: string; bedrooms: number; bathrooms: number; landM2: number; buildingM2: number; floors: number;
  listPriceIdr: string; cashDiscountPct: number; downPaymentPct: number; annualRatePct: number; tenorYears: unknown; status: string; published: boolean;
  sharePriceNear: number; totalShares: number; sharesSold: number; included: unknown; notIncluded: unknown; onchainProjectId: string | null; slug: string;
  area: string; descriptionLong: string; coverUrl: string; photos: unknown; tourSetId: string | null; units: number; certificate: string; nearby: unknown;
};

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Upload failed");
  return d.url;
}

export function ProjectForm({ project, tourSets }: { project: ProjectData; tourSets: { id: string; name: string }[] }) {
  const router = useRouter();
  const initialPhotos = (project.photos as Photo[]) ?? [];
  const [f, setF] = useState({
    ...project,
    tenorYears: (project.tenorYears as number[]).join(", "),
    included: (project.included as string[]).join("\n"),
    notIncluded: (project.notIncluded as string[]).join("\n"),
  });
  const [photos, setPhotos] = useState<Photo[]>(Array.from({ length: Math.max(6, initialPhotos.length) }, (_, i) => initialPhotos[i] ?? { kind: "other", url: "", alt: "" }));
  const [nearby, setNearby] = useState<Near[]>(Array.from({ length: 4 }, (_, i) => ((project.nearby as Near[]) ?? [])[i] ?? { name: "", kind: "other", distance_km: 0 }));
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
        photos: photos.filter((p) => p.url.trim()),
        nearby: nearby.filter((n) => n.name.trim()),
        tourSetId: f.tourSetId || null,
      });
      toast("Project saved");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File, apply: (url: string) => void) {
    try { apply(await uploadImage(file)); toast("Uploaded — remember to Save"); } catch (e) { toast((e as Error).message, "error"); }
  }

  const field = (k: keyof typeof f, label: string, type = "text", extra: Record<string, unknown> = {}) => (
    <div>
      <label className="label" htmlFor={`f-${String(k)}`}>{label}</label>
      <input id={`f-${String(k)}`} className="input" type={type} value={String(f[k] ?? "")} onChange={(e) => set(String(k), e.target.value)} {...extra} />
    </div>
  );

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex min-w-0 flex-col gap-6">
        <fieldset className="card grid gap-4 sm:grid-cols-2"><legend className="px-1 font-semibold text-rs-green-900">Basics</legend>
          {field("name", "Name")}{field("area", "Area (short label)")}{field("location", "Location")}{field("type", "Type")}
          <div className="sm:col-span-2"><label className="label" htmlFor="f-desc">Short description (cards, SEO)</label><textarea id="f-desc" className="input min-h-20" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="f-dl">Long description (detail page)</label><textarea id="f-dl" className="input min-h-36" value={f.descriptionLong} onChange={(e) => set("descriptionLong", e.target.value)} /></div>
        </fieldset>
        <fieldset className="card grid grid-cols-2 gap-4 sm:grid-cols-3"><legend className="px-1 font-semibold text-rs-green-900">Size</legend>
          {field("bedrooms", "Bedrooms (KT)", "number")}{field("bathrooms", "Bathrooms (KM)", "number")}{field("floors", "Floors", "number")}{field("landM2", "Land LT m²", "number")}{field("buildingM2", "Building LB m²", "number")}{field("units", "Units", "number")}
          <div><label className="label" htmlFor="f-cert">Certificate</label><select id="f-cert" className="input" value={f.certificate} onChange={(e) => set("certificate", e.target.value)}><option>SHM</option><option>HGB</option></select></div>
        </fieldset>
        <fieldset className="card grid gap-4 sm:grid-cols-2"><legend className="px-1 font-semibold text-rs-green-900">Pricing</legend>
          {field("listPriceIdr", "List price (IDR)", "number")}{field("cashDiscountPct", "Cash discount %", "number")}{field("downPaymentPct", "Down payment %", "number")}{field("annualRatePct", "Annual rate % (demo)", "number", { step: "0.1" })}
          {field("tenorYears", "Tenors (years, comma-separated)")}
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <div><label className="label" htmlFor="f-inc">Included (one per line)</label><textarea id="f-inc" className="input min-h-32" value={f.included} onChange={(e) => set("included", e.target.value)} /></div>
            <div><label className="label" htmlFor="f-ninc">Not included (one per line)</label><textarea id="f-ninc" className="input min-h-32" value={f.notIncluded} onChange={(e) => set("notIncluded", e.target.value)} /></div>
          </div>
        </fieldset>
        <fieldset className="card flex flex-col gap-4"><legend className="px-1 font-semibold text-rs-green-900">Photos</legend>
          <div className="grid items-end gap-3 sm:grid-cols-[96px_1fr_auto]">
            <div className="relative h-16 w-24 overflow-hidden rounded-lg bg-rs-green-100">{f.coverUrl && <Image src={f.coverUrl} alt="" fill sizes="96px" className="object-cover" unoptimized />}</div>
            <div><label className="label" htmlFor="f-cover">Cover URL (3:2)</label><input id="f-cover" className="input" value={f.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} /></div>
            <label className="btn-secondary btn-sm cursor-pointer">Upload<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], (u) => set("coverUrl", u))} /></label>
          </div>
          {photos.map((ph, i) => (
            <div key={i} className="grid items-end gap-2 border-t border-rs-border pt-3 sm:grid-cols-[72px_110px_1fr_1fr_auto]">
              <div className="relative h-12 w-[72px] overflow-hidden rounded-md bg-rs-green-100">{ph.url && <Image src={ph.url} alt="" fill sizes="72px" className="object-cover" unoptimized />}</div>
              <div><label className="label" htmlFor={`ph-k-${i}`}>Kind</label><select id={`ph-k-${i}`} className="input py-2" value={ph.kind} onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}>{["exterior", "living", "kitchen", "dining", "bedroom", "bathroom", "other"].map((k) => <option key={k}>{k}</option>)}</select></div>
              <div><label className="label" htmlFor={`ph-u-${i}`}>Photo {i + 1} URL</label><input id={`ph-u-${i}`} className="input py-2" value={ph.url} onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} /></div>
              <div><label className="label" htmlFor={`ph-a-${i}`}>Alt text</label><input id={`ph-a-${i}`} className="input py-2" value={ph.alt} onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} /></div>
              <label className="btn-secondary btn-sm cursor-pointer">Upload<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], (u) => setPhotos((cur) => cur.map((x, j) => (j === i ? { ...x, url: u } : x))))} /></label>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-sm self-start" onClick={() => setPhotos([...photos, { kind: "other", url: "", alt: "" }])}>+ Add photo slot</button>
        </fieldset>
        <fieldset className="card grid gap-4 sm:grid-cols-2"><legend className="px-1 font-semibold text-rs-green-900">Tour &amp; location</legend>
          <div><label className="label" htmlFor="f-tour">Tour set</label><select id="f-tour" className="input" value={f.tourSetId ?? ""} onChange={(e) => set("tourSetId", e.target.value)}><option value="">No tour</option>{tourSets.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}</select></div>
          <div className="sm:col-span-2 grid gap-2">
            <span className="label">Nearby (4 rows, demo)</span>
            {nearby.map((n, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_90px] gap-2">
                <input className="input py-2" placeholder="Name" aria-label={`Nearby ${i + 1} name`} value={n.name} onChange={(e) => setNearby(nearby.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <select className="input py-2" aria-label={`Nearby ${i + 1} kind`} value={n.kind} onChange={(e) => setNearby(nearby.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}>{["transport", "school", "mall", "hospital", "other"].map((k) => <option key={k}>{k}</option>)}</select>
                <input className="input py-2" type="number" step="0.1" min={0} aria-label={`Nearby ${i + 1} km`} value={n.distance_km} onChange={(e) => setNearby(nearby.map((x, j) => (j === i ? { ...x, distance_km: Number(e.target.value) } : x)))} />
              </div>
            ))}
          </div>
        </fieldset>
        <fieldset className="card grid gap-4 sm:grid-cols-2"><legend className="px-1 font-semibold text-rs-green-900">Shares</legend>
          {field("sharePriceNear", "Share price (NEAR)", "number", { disabled: locked })}{field("totalShares", "Total shares", "number", { disabled: locked })}
          {locked && <p className="text-xs text-rs-ink/60 sm:col-span-2">Fixed: the project exists on-chain ({project.onchainProjectId}).</p>}
        </fieldset>
        <fieldset className="card grid items-end gap-4 sm:grid-cols-2"><legend className="px-1 font-semibold text-rs-green-900">Status</legend>
          <div><label className="label" htmlFor="f-status">Status → audience</label>
            <select id="f-status" className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
              {["funding", "funded", "in_construction", "completed"].map((s) => <option key={s} value={s}>{s} → {s === "funding" ? "For Investor" : "For Buyer"}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 font-medium"><input type="checkbox" className="h-5 w-5 accent-[#1E4D45]" checked={f.published} onChange={(e) => set("published", e.target.checked)} /> Published</label>
          <p className="text-xs text-rs-ink/60 sm:col-span-2">On-chain projects in funding change status only through the DAO (finalize proposal).</p>
        </fieldset>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn-primary self-start" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </div>
      <aside className="self-start lg:sticky lg:top-24">
        <p className="mb-2 text-sm text-rs-ink/60">Card preview</p>
        <div className="card overflow-hidden p-0">
          <div className="relative aspect-[3/2] bg-rs-green-100">{f.coverUrl && <Image src={f.coverUrl} alt="" fill sizes="280px" className="object-cover" unoptimized />}</div>
          <div className="flex flex-col gap-1.5 p-4 text-sm">
            <span className="text-lg font-semibold text-rs-green-900 tabular">{idr(Number(f.listPriceIdr) || 0)}</span>
            <strong className="text-rs-green-900">{f.name}</strong>
            <span className="text-rs-ink/60">{f.location}</span>
            <span className="tabular">KT {f.bedrooms} · KM {f.bathrooms} · LT {f.landM2} · LB {f.buildingM2} · {f.certificate}</span>
            <span><StatusPill status={f.status} /> {!f.published && <span className="text-xs text-rs-danger">unpublished</span>}</span>
          </div>
        </div>
      </aside>
    </form>
  );
}

// ---------------- DAO ----------------
type Prop = { id: string; onchainId: string; description: string; status: string; yes: number; no: number; createTx: string | null; finalizedTx: string | null };

export function DaoActions({ projectId, projectStatus, onchain, status, defaultDescription, proposals }: { projectId: string; projectStatus: string; onchain: boolean; status: string; defaultDescription: string; proposals: Prop[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [desc, setDesc] = useState(defaultDescription);
  const [err, setErr] = useState("");
  const open = proposals.find((p) => p.status === "open");

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setErr("");
    try {
      const d = await post("/api/admin/dao", { action, projectId, ...extra });
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
          <button className="btn-primary" disabled={onchain || projectStatus !== "funding" || !!busy} title={projectStatus !== "funding" ? "Only funding projects go on-chain" : ""} onClick={() => act("create_project")}>{busy === "create_project" ? "Creating…" : onchain ? "Project created on-chain ✓" : "Create project on-chain"}</button>
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

// ---------------- Blog ----------------
export function BlogToggle({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" role="switch" className="h-5 w-5 accent-[#1E4D45]" checked={published} disabled={busy} onChange={async (e) => {
        setBusy(true);
        try { await post("/api/admin/blog", { id, published: e.target.checked }); toast(e.target.checked ? "Published" : "Unpublished"); router.refresh(); } catch (err) { toast((err as Error).message, "error"); } finally { setBusy(false); }
      }} />
      {published ? "Published" : "Draft"}
    </label>
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
