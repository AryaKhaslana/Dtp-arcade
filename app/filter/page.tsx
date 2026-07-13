"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

export default function FilterPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const sunglassesImgRef = useRef<HTMLImageElement | null>(null);
  const faceapiRef = useRef<any>(null);

  const [status, setStatus] = useState<"loading-models" | "requesting-camera" | "ready" | "error">(
    "loading-models"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Load face-api models sekali di awal
  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      try {
        const faceapi = await import("face-api.js");
        faceapiRef.current = faceapi;

        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);

        // Preload overlay image
        const img = new Image();
        img.src = "/assets/sunglasses.png";
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        sunglassesImgRef.current = img;

        if (!cancelled) setStatus("requesting-camera");
      } catch (err) {
        console.error("Gagal load model:", err);
        if (!cancelled) {
          setErrorMsg("Gagal load AI model. Cek koneksi internet ya.");
          setStatus("error");
        }
      }
    };

    loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  // Start webcam setelah model siap
  useEffect(() => {
    if (status !== "requesting-camera") return;
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("ready");
      } catch (err) {
        console.error("Gagal akses kamera:", err);
        setErrorMsg("Gak bisa akses kamera. Cek izin browser ya.");
        setStatus("error");
      }
    };

    startCamera();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Detection loop - jalan terus selama status "ready"
  useEffect(() => {
    if (status !== "ready") return;

    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!faceapi || !video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const detect = async () => {
      if (video.readyState === 4) {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        detections.forEach((det: any) => {
          const landmarks = det.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          const leftCenter = averagePoint(leftEye);
          const rightCenter = averagePoint(rightEye);

          const eyeDistance = distance(leftCenter, rightCenter);
          const angle = Math.atan2(
            rightCenter.y - leftCenter.y,
            rightCenter.x - leftCenter.x
          );
          const centerX = (leftCenter.x + rightCenter.x) / 2;
          const centerY = (leftCenter.y + rightCenter.y) / 2;

          const glassesWidth = eyeDistance * 2.4;
          const glassesHeight = glassesWidth * 0.5;

          const img = sunglassesImgRef.current;
          if (img) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            ctx.drawImage(
              img,
              -glassesWidth / 2,
              -glassesHeight / 2,
              glassesWidth,
              glassesHeight
            );
            ctx.restore();
          }
        });
      }
      rafIdRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [status]);

  // Cleanup total pas unmount - stop stream + cancel loop
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    if (!video || !overlay) return;

    const composite = document.createElement("canvas");
    composite.width = video.videoWidth;
    composite.height = video.videoHeight;
    const ctx = composite.getContext("2d");
    if (!ctx) return;

    // Video sedikit di-mirror biar natural kayak cermin
    ctx.translate(composite.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, composite.width, composite.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(overlay, 0, 0, composite.width, composite.height);

    const dataUrl = composite.toDataURL("image/png");
    setSnapshotUrl(dataUrl);
  }, []);

  const downloadSnapshot = () => {
    if (!snapshotUrl) return;
    const link = document.createElement("a");
    link.href = snapshotUrl;
    link.download = `dtp-arcade-${Date.now()}.png`;
    link.click();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-4xl md:text-5xl font-extrabold text-clay-ink mb-8 text-center">
        🎭 Live Face Filter
      </h1>

      {/* Arcade monitor frame */}
      <div
        className="relative rounded-clay-lg p-5 md:p-8 shadow-clay-lg"
        style={{ backgroundColor: "#CFEEFB" }}
      >
        {/* Decorative arcade lights */}
        <div className="absolute -top-3 left-8 flex gap-2">
          <span className="w-4 h-4 rounded-full bg-clay-pink shadow-clay-sm" />
          <span className="w-4 h-4 rounded-full bg-clay-butter shadow-clay-sm" />
          <span className="w-4 h-4 rounded-full bg-clay-mint shadow-clay-sm" />
        </div>

        <div className="relative rounded-clay overflow-hidden bg-black shadow-clay-pressed w-[320px] h-[240px] md:w-[560px] md:h-[420px]">
          {status !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center bg-clay-ink/80 z-10">
              <p className="text-white font-semibold text-center px-4">
                {status === "loading-models" && "Lagi siapin AI model... 🤖"}
                {status === "requesting-camera" && "Minta izin kamera... 📸"}
                {status === "error" && errorMsg}
              </p>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full -scale-x-100 pointer-events-none"
          />
        </div>
      </div>

      {/* Snapshot button */}
      <motion.button
        onClick={takeSnapshot}
        disabled={status !== "ready"}
        whileHover={status === "ready" ? { y: -4, scale: 1.03 } : {}}
        whileTap={status === "ready" ? { scale: 0.94 } : {}}
        className={`mt-10 clay-button px-10 py-4 text-lg font-bold rounded-clay-lg ${
          status === "ready"
            ? "bg-clay-butter text-clay-ink cursor-pointer"
            : "bg-clay-base text-clay-ink/40 cursor-not-allowed"
        }`}
      >
        📸 Take Snapshot
      </motion.button>

      {/* Snapshot preview + download */}
      {snapshotUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 clay-surface p-5 flex flex-col items-center gap-4"
        >
          <img
            src={snapshotUrl}
            alt="Snapshot"
            className="w-64 rounded-clay shadow-clay-sm"
          />
          <motion.button
            onClick={downloadSnapshot}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
            className="clay-button px-6 py-3 rounded-clay bg-clay-mint text-clay-ink font-semibold"
          >
            ⬇️ Download Foto
          </motion.button>
        </motion.div>
      )}
    </main>
  );
}

// Helper functions
function averagePoint(points: { x: number; y: number }[]) {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}