"use client";
// Loads Pannellum 2.5.6 from jsDelivr once (no build step needed).
/* eslint-disable @typescript-eslint/no-explicit-any */
export type PannellumViewer = any;
declare global {
  interface Window { pannellum?: any }
}
let p: Promise<any> | null = null;
export function loadPannellum(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.pannellum) return Promise.resolve(window.pannellum);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
      s.async = true;
      s.onload = () => (window.pannellum ? resolve(window.pannellum) : reject(new Error("Pannellum failed to load")));
      s.onerror = () => { p = null; reject(new Error("Could not load the 360° viewer")); };
      document.head.appendChild(s);
    });
  }
  return p;
}

export type TourRoom = { key: string; name: string; panoramaUrl: string; initialYaw: number; hotspots: { yaw: number; pitch: number; target_room_key: string; label: string }[] };

export function hotspotTooltip(div: HTMLElement, label: string) {
  div.classList.add("rs-hs");
  const span = document.createElement("span");
  span.className = "rs-hs-label";
  span.textContent = label;
  div.appendChild(span);
}

export function buildScenes(rooms: TourRoom[]) {
  const scenes: Record<string, any> = {};
  for (const r of rooms) {
    scenes[r.key] = {
      title: r.name,
      type: "equirectangular",
      panorama: r.panoramaUrl,
      yaw: r.initialYaw,
      hfov: 100,
      hotSpots: r.hotspots.map((h) => ({ pitch: h.pitch, yaw: h.yaw, type: "scene", sceneId: h.target_room_key, cssClass: "rs-hs-base", createTooltipFunc: hotspotTooltip, createTooltipArgs: h.label })),
    };
  }
  return scenes;
}
