"use client";

import { ImagePlus, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export type ScannedUpi = {
  pa: string;
  pn?: string;
  am?: string;
  tn?: string;
};

function parseUpiPayload(raw: string): ScannedUpi | null {
  const text = raw.trim();
  if (!text) return null;

  const fromParams = (params: URLSearchParams): ScannedUpi | null => {
    const pa = params.get("pa")?.trim();
    if (!pa || !pa.includes("@")) return null;
    const pn = params.get("pn")?.trim();
    const am = params.get("am")?.trim();
    const tn = params.get("tn")?.trim();
    const amount = am ? Number.parseFloat(am) : Number.NaN;
    return {
      pa,
      pn: pn || undefined,
      am: Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : undefined,
      tn: tn || undefined,
    };
  };

  try {
    const url = new URL(text);
    if (url.protocol === "upi:" && url.hostname === "pay") {
      return fromParams(url.searchParams);
    }
  } catch {
    // Plain VPA or an EMV payload, handled below.
  }

  if (/^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}$/.test(text)) {
    return { pa: text };
  }

  const embedded = text.match(/[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}/);
  if (embedded && (text.startsWith("000201") || /upi/i.test(text))) {
    return { pa: embedded[0] };
  }

  return null;
}

function readQr(image: ImageData): string | null {
  const code = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "dontInvert",
  });
  return code?.data ?? null;
}

function formatRupees(amount: string | undefined): string | null {
  if (!amount) return null;
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return null;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Camera access is blocked. Allow the camera for this site, then try again.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No camera was found on this device. You can upload a QR photo instead.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is in use by another app. Close it and try again.";
    }
  }
  if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
    return "This browser cannot open the camera. Use HTTPS, or upload a QR photo.";
  }
  return "Could not open the camera. Try again, or upload a QR photo.";
}

export function UpiScanner({
  fallbackAmount,
  onClose,
  onPay,
}: {
  /** Page payable amount (`am` format); overrides any amount printed on the QR. */
  fallbackAmount?: string;
  onClose: () => void;
  onPay: (upi: ScannedUpi) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastRawRef = useRef<string | null>(null);
  const scanningRef = useRef(true);
  const cameraGen = useRef(0);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [found, setFound] = useState<ScannedUpi | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [starting, setStarting] = useState(true);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  const acceptRaw = useCallback((raw: string) => {
    if (!scanningRef.current) return;
    if (raw === lastRawRef.current) return;
    lastRawRef.current = raw;
    const parsed = parseUpiPayload(raw);
    if (!parsed) {
      setNotice("Not a UPI QR code. Align a UPI payment code in the frame.");
      return;
    }
    scanningRef.current = false;
    setNotice(null);
    setFound(parsed);
  }, []);

  const startCamera = useCallback(async () => {
    const gen = ++cameraGen.current;
    setCameraError(null);
    setStarting(true);
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      if (gen !== cameraGen.current) return;
      setCameraError(cameraErrorMessage(new Error("unsupported")));
      setStarting(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (gen !== cameraGen.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      if (gen !== cameraGen.current) return;
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
      setTorchAvailable(Boolean(caps?.torch));
      setTorchOn(false);
      setCameraError(null);
    } catch (error) {
      if (gen !== cameraGen.current) return;
      setCameraError(cameraErrorMessage(error));
    } finally {
      if (gen === cameraGen.current) setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void startCamera();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    let stopped = false;
    let misses = 0;
    let timer = 0;

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (
        scanningRef.current &&
        video &&
        canvas &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0
      ) {
        const scale = Math.min(1, 640 / video.videoWidth);
        const width = Math.max(1, Math.round(video.videoWidth * scale));
        const height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const raw = readQr(ctx.getImageData(0, 0, width, height));
          if (raw) {
            misses = 0;
            acceptRaw(raw);
          } else {
            misses += 1;
            if (misses > 3) lastRawRef.current = null;
          }
        }
      }
      timer = window.setTimeout(tick, 140);
    };
    timer = window.setTimeout(tick, 140);

    return () => {
      stopped = true;
      cameraGen.current += 1;
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      stopCamera();
    };
  }, [acceptRaw, onClose, startCamera, stopCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }, [torchOn]);

  const onPickPhoto = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setNotice(null);
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = canvasRef.current ?? document.createElement("canvas");
        const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const raw = readQr(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (!raw) {
          setNotice("No QR code found in that photo.");
          return;
        }
        lastRawRef.current = null;
        scanningRef.current = true;
        acceptRaw(raw);
      } catch {
        setNotice("Could not read that photo. Try another image.");
      }
    },
    [acceptRaw],
  );

  const resume = useCallback(() => {
    lastRawRef.current = null;
    scanningRef.current = true;
    setFound(null);
    setNotice(null);
  }, []);

  const payable = fallbackAmount ?? found?.am;
  const amountLabel = formatRupees(payable);
  const payee = found?.pn || "UPI payment";

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white" role="presentation">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative flex h-full flex-col">
        <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Close scanner"
          >
            <X className="size-6" strokeWidth={2} />
          </button>
          <h2 className="font-[family-name:var(--font-montserrat)] text-base font-semibold">
            Scan UPI QR
          </h2>
          <button
            type="button"
            onClick={() => void toggleTorch()}
            disabled={!torchAvailable}
            className={`flex size-11 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 ${
              torchOn ? "bg-white text-black" : "bg-black/40 text-white"
            }`}
            aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
            aria-pressed={torchOn}
          >
            <Zap className="size-5" strokeWidth={2} />
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8">
          <div className="relative aspect-square w-full max-w-[280px]">
            <div className="absolute inset-0 overflow-hidden rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {!found ? (
                <span
                  className="absolute inset-x-4 h-0.5 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)]"
                  style={{ animation: "upi-scan 1.8s ease-in-out infinite alternate" }}
                />
              ) : null}
            </div>
            <span className="pointer-events-none absolute left-0 top-0 size-8 rounded-tl-2xl border-l-4 border-t-4 border-white" />
            <span className="pointer-events-none absolute right-0 top-0 size-8 rounded-tr-2xl border-r-4 border-t-4 border-white" />
            <span className="pointer-events-none absolute bottom-0 left-0 size-8 rounded-bl-2xl border-b-4 border-l-4 border-white" />
            <span className="pointer-events-none absolute bottom-0 right-0 size-8 rounded-br-2xl border-b-4 border-r-4 border-white" />
          </div>
          <p className="mt-8 max-w-xs text-center text-sm font-medium text-white/90">
            {starting
              ? "Opening camera…"
              : "Point your camera at a UPI QR code"}
          </p>
          {cameraError ? (
            <div className="mt-4 max-w-xs rounded-2xl bg-black/70 px-4 py-3 text-center">
              <p className="text-sm leading-relaxed text-white">{cameraError}</p>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="mt-3 cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Try again
              </button>
            </div>
          ) : null}
          {notice && !found ? (
            <p
              role="status"
              className="mt-4 max-w-xs rounded-full bg-black/70 px-4 py-2 text-center text-sm text-white"
            >
              {notice}
            </p>
          ) : null}
        </div>

        <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mx-auto flex cursor-pointer items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ImagePlus className="size-4" strokeWidth={2} aria-hidden />
            Upload QR photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void onPickPhoto(file);
            }}
          />
        </div>
      </div>

      {found ? (
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="scanned-upi-title"
            className="rounded-3xl bg-white p-5 text-zinc-900 shadow-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-indigo">
              UPI QR found
            </p>
            <h3
              id="scanned-upi-title"
              className="mt-1 font-[family-name:var(--font-montserrat)] text-lg font-semibold text-zinc-900"
            >
              {payee}
            </h3>
            <p className="mt-1 break-all text-sm text-zinc-500">{found.pa}</p>
            {amountLabel ? (
              <p className="mt-3 font-[family-name:var(--font-montserrat)] text-2xl font-bold text-brand-plum">
                {amountLabel}
              </p>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Amount not set on this QR</p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={resume}
                className="flex-1 cursor-pointer rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
              >
                Scan again
              </button>
              <button
                type="button"
                onClick={() => onPay({ ...found, am: payable })}
                className="flex-1 cursor-pointer rounded-xl bg-gradient-to-r from-[#4a7bff] to-brand-indigo py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
              >
                Pay
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes upi-scan {
          from { top: 12%; }
          to { top: 84%; }
        }
      `}</style>
    </div>
  );
}
