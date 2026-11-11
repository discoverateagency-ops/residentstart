"use client";
import { useState } from "react";
export function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn-secondary btn-sm" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? "Copied" : "copy"}
    </button>
  );
}
