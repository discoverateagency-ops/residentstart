"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildScenes, loadPannellum, type TourRoom } from "@/lib/client/pannellum";

export function TourViewer({ projectName, slug, rooms }: { projectName: string; slug: string; rooms: TourRoom[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewer = useRef<any>(null);
  const [scene, setScene] = useState(rooms[0]?.key);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState(true);
  const [err, setErr] = useState("");
  const preloaded = useRef(new Set<string>());

  const preloadNeighbours = (key: string) => {
    const r = rooms.find((x) => x.key === key);
    r?.hotspots.forEach((h) => {
      const t = rooms.find((x) => x.key === h.target_room_key);
      if (t && !preloaded.current.has(t.panoramaUrl)) {
        preloaded.current.add(t.panoramaUrl);
        const img = new Image();
        img.src = t.panoramaUrl;
      }
    });
  };

  useEffect(() => {
    let cancelled = false;
    if (!rooms.length) return;
    loadPannellum()
      .then((pannellum) => {
        if (cancelled || !ref.current) return;
        viewer.current = pannellum.viewer(ref.current, {
          default: { firstScene: rooms[0].key, sceneFadeDuration: 600, autoLoad: true, showControls: false, compass: false, orientationOnByDefault: false, mouseZoom: true, hfov: 100 },
          scenes: buildScenes(rooms),
        });
        viewer.current.on("load", () => {
          setLoading(false);
          const k = viewer.current.getScene();
          setScene(k);
          preloadNeighbours(k);
        });
        viewer.current.on("scenechange", (k: string) => { setScene(k); setLoading(true); });
        viewer.current.on("error", (m: string) => setErr(m || "Could not load the panorama"));
        // first interaction: try gyroscope where supported (iOS needs a user gesture)
        const enableGyro = () => {
          try { if (viewer.current?.isOrientationSupported?.()) viewer.current.startOrientation(); } catch { /* ignore */ }
        };
        ref.current.addEventListener("touchend", enableGyro, { once: true });
      })
      .catch((e) => setErr(e.message));
    const t = setTimeout(() => setHint(false), 3000);
    return () => {
      cancelled = true;
      clearTimeout(t);
      viewer.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = rooms.find((r) => r.key === scene);
  const go = (k: string) => { if (k !== scene) viewer.current?.loadScene(k); };

  return (
    <div className="fixed inset-0 bg-black">
      <div ref={ref} className="absolute inset-0" aria-label={`360° view of ${current?.name ?? "room"}`} />
      <div className="absolute top-0 inset-x-0 z-10 h-12 flex items-center gap-3 px-3 text-white" style={{ background: "rgba(30,77,69,.92)" }}>
        <Link href={`/project/${slug}`} className="shrink-0 text-sm font-semibold">‹ Back to project</Link>
        <span className="truncate text-sm opacity-90 hidden sm:inline">{projectName}</span>
        <span className="ml-auto truncate text-sm font-semibold">{current?.name}</span>
      </div>
      {loading && !err && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="rounded-2xl bg-white/90 px-5 py-4 text-sm font-medium text-rs-green-900 animate-pulse">Loading {current?.name}…</div>
        </div>
      )}
      {hint && !err && (
        <div className="absolute inset-x-0 top-1/3 z-10 flex justify-center pointer-events-none px-6">
          <div className="rounded-2xl bg-black/65 text-white text-center text-sm px-5 py-3 max-w-xs">Drag or tilt your phone to look around · tap a green dot to walk through</div>
        </div>
      )}
      {err && <div className="absolute inset-x-4 top-20 z-10 rounded-xl bg-white p-4 text-sm text-rs-danger">{err}</div>}
      <div className="absolute bottom-0 inset-x-0 z-10 bg-[rgba(247,249,248,.95)] border-t border-rs-border">
        <div className="flex gap-2 overflow-x-auto px-3 py-2.5">
          {rooms.map((r) => (
            <button key={r.key} onClick={() => go(r.key)} onMouseEnter={() => preloadNeighbours(r.key)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${r.key === scene ? "bg-rs-green-700 text-white border-rs-green-700" : "bg-white text-rs-green-700 border-rs-green-700"}`}>
              {r.name}
            </button>
          ))}
        </div>
        <p className="px-3 pb-2 text-[11px] text-rs-ink/60">Illustrative designs · synthetic panoramas, not a real property</p>
      </div>
    </div>
  );
}
