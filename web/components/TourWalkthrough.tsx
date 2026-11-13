"use client";
// Tour v2 — port of public/tours/cilandak-residence-walkthrough/tour-test.html (PRD-2 Scope §2).
// Photos are partial panoramas (haov/vaov); a 2:1 equirectangular file with haov 360 / vaov 180 upgrades a stop in place.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadPannellum } from "@/lib/client/pannellum";

export type TourStop = {
  id: string; name: string; floor: string; panorama: string; thumbnail: string;
  haov: number; vaov: number; vOffset?: number; initialYaw?: number;
  map: { x: number; y: number }; links: { to: string; yaw: number; pitch: number; text: string }[];
};
export type TourConfig = { project?: string; mode?: string; floorplans: Record<string, string>; rooms: TourStop[] };

const FLOOR_LABEL: Record<string, string> = { gf: "Ground floor", "1f": "Upper floor" };
const FLOOR_SHORT: Record<string, string> = { gf: "Ground", "1f": "Upper" };
// JSONB reorders object keys; walk floors bottom-up
const floorRank = (f: string) => (f === "gf" ? 0 : parseInt(f, 10) || 99);

export function TourWalkthrough({ basePath, config, projectName, label, backHref }: { basePath: string; config: TourConfig; projectName: string; label: string; backHref: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewer = useRef<any>(null);
  const rooms = config.rooms;
  const [current, setCurrent] = useState(rooms[0]?.id);
  const [floor, setFloor] = useState(rooms[0]?.floor ?? "gf");
  const [hint, setHint] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [mapOpen, setMapOpen] = useState(true);
  const url = (p: string) => (p.startsWith("/") || p.startsWith("http") ? p : basePath + p);
  const floors = Object.keys(config.floorplans).sort((a, b) => floorRank(a) - floorRank(b));

  useEffect(() => {
    let cancelled = false;
    if (!rooms.length) return;
    loadPannellum()
      .then((pannellum) => {
        if (cancelled || !ref.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scenes: Record<string, any> = {};
        for (const r of rooms) {
          const full = r.haov >= 360;
          scenes[r.id] = {
            type: "equirectangular",
            panorama: url(r.panorama),
            haov: r.haov,
            vaov: r.vaov,
            vOffset: r.vOffset ?? 0,
            hfov: full ? 100 : Math.min(r.haov * 0.92, 100),
            minHfov: full ? 50 : r.haov * 0.45,
            maxHfov: full ? 120 : Math.min(r.haov, 100),
            yaw: r.initialYaw ?? 0,
            pitch: 0,
            title: r.name,
            hotSpots: r.links.map((l) => ({ yaw: l.yaw, pitch: l.pitch, type: "scene", sceneId: l.to, text: l.text, cssClass: `pnlm-hotspot-base rs-arrow${l.pitch <= -30 ? " back" : ""}` })),
          };
        }
        viewer.current = pannellum.viewer(ref.current, {
          default: { firstScene: rooms[0].id, sceneFadeDuration: 500, autoLoad: true, showControls: true, showFullscreenCtrl: true, showZoomCtrl: true, compass: false, backgroundColor: [0.06, 0.09, 0.08], orientationOnByDefault: false },
          scenes,
        });
        const sync = () => {
          const id = viewer.current?.getScene();
          if (!id) return;
          setCurrent(id);
          setLoading(false);
          const r = rooms.find((x) => x.id === id);
          if (r) setFloor(r.floor);
        };
        viewer.current.on("load", sync);
        viewer.current.on("scenechange", () => { setLoading(true); setTimeout(sync, 30); });
        viewer.current.on("error", (m: string) => setErr(m || "Could not load this photo"));
        if (new URLSearchParams(window.location.search).has("debug")) {
          viewer.current.on("mousedown", (e: MouseEvent) => {
            const c = viewer.current.mouseEventToCoords(e);
            console.log("pitch", c[0].toFixed(1), "yaw", c[1].toFixed(1));
          });
        }
      })
      .catch((e) => setErr(e.message));
    const t = setTimeout(() => setHint(false), 3500);
    return () => {
      cancelled = true;
      clearTimeout(t);
      viewer.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the active thumbnail in view
  useEffect(() => {
    // scroll only the strip; scrollIntoView would also scroll the fixed overflow-hidden root and shift the whole tour
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-id="${current}"]`);
    if (strip && el) strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [current]);

  const go = (id: string) => { if (id !== current) viewer.current?.loadScene(id); };
  const stop = rooms.find((r) => r.id === current);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0f1715] text-white">
      <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center gap-3 px-3 text-sm" style={{ background: "rgba(30,77,69,.94)" }}>
        <Link href={backHref} className="shrink-0 font-semibold">‹ Back</Link>
        <span className="hidden truncate opacity-90 sm:inline">{projectName}</span>
        <span className="hidden truncate rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold md:inline">{label}</span>
        <span className="ml-auto truncate font-semibold">{stop?.name}</span>
      </div>

      <div ref={ref} className="absolute inset-x-0 top-12 bottom-[108px]" aria-label={`Photo walkthrough: ${stop?.name ?? ""}`} />

      {hint && !err && <div className="pointer-events-none absolute left-1/2 top-[60px] z-[15] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-3.5 py-2 text-[13px]">Drag to look around · tap the green arrows to walk through</div>}
      {loading && !err && <div className="pointer-events-none absolute left-1/2 top-1/2 z-[14] -translate-x-1/2 rounded-xl bg-black/50 px-4 py-2 text-sm">Loading {stop?.name}…</div>}
      {err && <div className="absolute inset-x-4 top-20 z-30 rounded-xl bg-white p-4 text-sm text-rs-danger">{err}</div>}
      <p className="md:hidden absolute right-3 top-[56px] z-[16] max-w-[70%] truncate rounded-full bg-black/50 px-2.5 py-1 text-[11px]">{label}</p>

      {/* Floor-plan minimap */}
      {floors.length > 0 && (
        <div className="absolute bottom-[120px] left-3 z-[18] w-[160px] overflow-hidden rounded-[10px] bg-white/95 text-rs-green-900 shadow-[0_4px_16px_rgba(0,0,0,.4)] sm:w-[220px]">
          <div className="flex">
            {floors.map((f) => (
              <button key={f} onClick={() => { setFloor(f); setMapOpen(true); }} className={`flex-1 px-1 py-1.5 text-[12px] font-semibold ${floor === f ? "bg-rs-green-700 text-white" : "bg-rs-green-100 text-rs-green-700"}`}>
                <span className="hidden sm:inline">{FLOOR_LABEL[f] ?? f}</span><span className="sm:hidden">{FLOOR_SHORT[f] ?? f}</span>
              </button>
            ))}
            <button onClick={() => setMapOpen(!mapOpen)} className="bg-rs-green-100 px-2 text-[12px] font-bold text-rs-green-700" aria-label={mapOpen ? "Hide floor plan" : "Show floor plan"}>{mapOpen ? "–" : "+"}</button>
          </div>
          {mapOpen && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url(config.floorplans[floor])} alt={`${FLOOR_LABEL[floor] ?? floor} plan`} className="block w-full" />
              {rooms.filter((r) => r.floor === floor).map((r) => (
                <button
                  key={r.id}
                  title={r.name}
                  aria-label={`Go to ${r.name}`}
                  onClick={() => go(r.id)}
                  className={`absolute -ml-[7px] -mt-[7px] h-3.5 w-3.5 rounded-full border-2 border-white ${r.id === current ? "bg-rs-green-700 shadow-[0_0_0_5px_rgba(30,77,69,.3)]" : "bg-[#9fb8b2]"}`}
                  style={{ left: `${r.map.x * 100}%`, top: `${r.map.y * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <p className="absolute bottom-[116px] right-3 z-[18] max-w-[45%] rounded-md bg-black/40 px-2 py-1 text-right text-[11px] opacity-80 sm:max-w-[55%]"><span className="hidden sm:inline">Photos: Residentstart show unit · illustrative, specs may differ</span><span className="sm:hidden">Show-unit photos · illustrative</span></p>

      {/* Thumbnail strip */}
      <div ref={stripRef} className="absolute inset-x-0 bottom-0 z-20 flex h-[108px] gap-2 overflow-x-auto border-t border-rs-green-700 px-3 py-2.5" style={{ background: "rgba(15,23,21,.96)" }}>
        {rooms.map((r) => (
          <button key={r.id} data-id={r.id} onClick={() => go(r.id)} className={`relative w-32 shrink-0 overflow-hidden rounded-lg border-2 ${r.id === current ? "border-white" : "border-transparent"}`} aria-label={r.name} aria-current={r.id === current}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url(r.thumbnail)} alt="" loading="lazy" className="block h-[72px] w-32 object-cover" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 py-0.5 text-left text-[11px]">{r.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
