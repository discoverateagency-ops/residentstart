"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage, descriptorFrom, fileToImage, loadFaceApi } from "@/lib/client/face";

export function VerificationCard({ referencePhotoUrl, hasDescriptor, failedAttempts }: { referencePhotoUrl: string | null; hasDescriptor: boolean; failedAttempts: number }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");
  const [fails, setFails] = useState(failedAttempts);
  const left = Math.max(0, 3 - fails);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function startCamera() {
    setErr("");
    try {
      loadFaceApi().catch(() => {}); // warm up models while the camera starts
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamOn(true);
    } catch {
      setErr("Camera not available. Allow camera access, or ask the admin to verify you.");
    }
  }

  async function verify() {
    if (!videoRef.current) return;
    setBusy(true);
    setErr("");
    setResult("");
    try {
      const c = document.createElement("canvas");
      c.width = videoRef.current.videoWidth;
      c.height = videoRef.current.videoHeight;
      c.getContext("2d")!.drawImage(videoRef.current, 0, 0);
      const descriptor = await descriptorFrom(c); // computed on-device; the frame is never uploaded
      if (!descriptor) throw new Error("No face found in the camera frame. Face the camera in good light.");
      const r = await fetch("/api/verification/result", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ descriptor }) });
      const d = await r.json();
      if (!r.ok && r.status !== 429) throw new Error(d.error || "Verification failed");
      if (d.verified) {
        setResult(`Match ${Number(d.distance).toFixed(2)} — Verified ✓`);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setTimeout(() => router.refresh(), 900);
      } else {
        setFails(3 - (d.attemptsLeft ?? 0));
        setResult(d.attemptsLeft > 0 ? `No match (${Number(d.distance).toFixed(2)}). Try again (${d.attemptsLeft} left)` : "Ask the admin to verify you");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadReference(file: File) {
    setBusy(true);
    setErr("");
    try {
      const img = await fileToImage(file);
      const descriptor = await descriptorFrom(img);
      if (!descriptor) throw new Error("No face found in the photo. Use a clear, front-facing photo.");
      const fd = new FormData();
      fd.append("photo", new File([await compressImage(img)], "reference.jpg", { type: "image/jpeg" }));
      fd.append("descriptor", JSON.stringify(descriptor));
      const r = await fetch("/api/verification/reference", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg">Identity verification</h2>
        <span className="rounded-full bg-[#FFF3CD] text-[#664D03] px-3 py-1 text-xs font-semibold">Demo verification · not KYC</span>
      </div>
      {!hasDescriptor ? (
        <div className="mt-3">
          <p className="text-sm text-rs-ink/75">Add a reference photo first. The face check runs on this device; only the photo and a numeric face descriptor are stored.</p>
          <label className="btn-secondary mt-3 cursor-pointer">
            {busy ? "Checking photo…" : "Upload reference photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && uploadReference(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 max-w-md">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {referencePhotoUrl ? <img src={referencePhotoUrl} alt="Your reference photo" className="aspect-[4/3] w-full rounded-xl object-cover border border-rs-border" /> : <div className="skeleton aspect-[4/3]" />}
              <figcaption className="text-xs text-rs-ink/60 mt-1">Reference photo</figcaption>
            </figure>
            <figure>
              <video ref={videoRef} playsInline muted className={`aspect-[4/3] w-full rounded-xl object-cover border border-rs-border bg-black ${camOn ? "" : "hidden"}`} style={{ transform: "scaleX(-1)" }} />
              {!camOn && <div className="aspect-[4/3] w-full rounded-xl border border-dashed border-rs-border flex items-center justify-center text-xs text-rs-ink/50">Live camera</div>}
              <figcaption className="text-xs text-rs-ink/60 mt-1">Live camera (stays on this device)</figcaption>
            </figure>
          </div>
          {left === 0 ? (
            <p className="mt-4 font-medium text-rs-danger">Ask the admin to verify you</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {!camOn ? (
                <button className="btn-primary" onClick={startCamera}>Start camera</button>
              ) : (
                <button className="btn-primary" onClick={verify} disabled={busy}>{busy ? "Comparing…" : "Verify my face"}</button>
              )}
            </div>
          )}
        </>
      )}
      {result && <p className="mt-3 font-medium tabular" aria-live="polite">{result}</p>}
      {err && <p className="err" role="alert">{err}</p>}
    </section>
  );
}
