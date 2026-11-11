"use client";
// Browser-only face check (demo verification, not KYC). Live frames never leave the device.
type FaceApi = typeof import("@vladmandic/face-api");
let api: FaceApi | null = null;
let loading: Promise<FaceApi> | null = null;

export async function loadFaceApi(): Promise<FaceApi> {
  if (api) return api;
  if (!loading) {
    loading = (async () => {
      const faceapi = await import("@vladmandic/face-api/dist/face-api.esm.js" as string) as unknown as FaceApi;
      const tf = faceapi.tf as unknown as { setBackend(b: string): Promise<boolean>; ready(): Promise<void> };
      await tf.setBackend("webgl").catch(() => tf.setBackend("cpu"));
      await tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      api = faceapi;
      return faceapi;
    })();
  }
  return loading;
}

/** Returns a 128-number descriptor, or null when no face is found. */
export async function descriptorFrom(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<number[] | null> {
  const faceapi = await loadFaceApi();
  const det = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return det ? Array.from(det.descriptor) : null;
}

export function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export const MATCH_THRESHOLD = 0.6;

export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image"));
    img.src = URL.createObjectURL(file);
  });
}

/** Downscales a photo to max 640px JPEG for upload. */
export async function compressImage(img: HTMLImageElement, max = 640): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("compress failed"))), "image/jpeg", 0.85));
}
