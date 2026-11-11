"use client";
import { useEffect, useState } from "react";

type Toast = { id: number; text: string; kind: "ok" | "error"; href?: string };

export function toast(text: string, kind: "ok" | "error" = "ok", href?: string) {
  window.dispatchEvent(new CustomEvent("rs-toast", { detail: { text, kind, href } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as Omit<Toast, "id">;
      const id = Date.now() + Math.random();
      setItems((x) => [...x, { ...d, id }]);
      setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 6000);
    };
    window.addEventListener("rs-toast", on);
    return () => window.removeEventListener("rs-toast", on);
  }, []);
  return (
    <div className="fixed z-50 bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[min(92vw,420px)]" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`rounded-xl px-4 py-3 text-sm shadow-lg text-white ${t.kind === "ok" ? "bg-rs-green-700" : "bg-rs-danger"}`}>
          {t.text}{" "}
          {t.href && (
            <a href={t.href} target="_blank" rel="noreferrer" className="underline font-semibold">
              view tx ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
