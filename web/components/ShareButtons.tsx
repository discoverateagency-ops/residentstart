"use client";
import { useState } from "react";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => (typeof window === "undefined" ? "" : window.location.href);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-1 text-rs-ink/60">Share</span>
      <button className="btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(url()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Link copied" : "Copy link"}</button>
      <button className="btn-secondary btn-sm" onClick={() => window.open(`https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url())}`, "_blank", "noopener")}>X</button>
      <button className="btn-secondary btn-sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`, "_blank", "noopener")}>WhatsApp</button>
    </div>
  );
}
