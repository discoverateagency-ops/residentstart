"use client";
// Loads Pannellum 2.5.6 from jsDelivr once (no build step needed).
/* eslint-disable @typescript-eslint/no-explicit-any */
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
