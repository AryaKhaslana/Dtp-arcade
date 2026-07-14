"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  unlockAudio,
  playStart,
  playScore,
  playFlap,
  playCollision,
  playGameOverJingle,
  getAudioContext,
} from "../../lib/sound";

const GAME_WIDTH = 640;
const GAME_HEIGHT = 480;
const BIRD_X = 100;
const BIRD_SIZE = 36;
const PIPE_WIDTH = 70;
const PIPE_GAP = 170;
const PIPE_SPEED = 3;
const PIPE_INTERVAL = 1600;
const GRAVITY = 0.6;
const FLAP_STRENGTH = -9.5;
const MIC_THRESHOLD = 0.16;
const FLAP_COOLDOWN = 280;

type ControlMode = "nose" | "mic" | null;
type Phase =
  | "choose-control"
  | "loading-model"
  | "requesting-permission"
  | "calibrating"
  | "ready"
  | "playing"
  | "gameover";

type Pipe = { x: number; gapY: number; passed: boolean };

export default function NoseGamePage() {
  const router = useRouter();
  const shakeControls = useAnimation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array | null>(null);
  const faceapiRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);

  const [controlMode, setControlMode] = useState<ControlMode>(null);
  const [phase, setPhase] = useState<Phase>("choose-control");
  const [errorMsg, setErrorMsg] = useState("");
  const [score, setScore] = useState(0);
  const [isVersus, setIsVersus] = useState(false);
  const [sensorOk, setSensorOk] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [micLevel, setMicLevel] = useState(0); 

  // Player Refs (P1 & P2)
  const p1YRef = useRef(GAME_HEIGHT / 2);
  const p1TargetYRef = useRef(GAME_HEIGHT / 2);
  const p2YRef = useRef(GAME_HEIGHT / 2);
  const p2TargetYRef = useRef(GAME_HEIGHT / 2);

  const baselineNoseY1Ref = useRef<number | null>(null);
  const baselineNoseY2Ref = useRef<number | null>(null);
  const lastFaceSeenRef = useRef<number>(0);

  // Mic-mode refs
  const birdVelRef = useRef(0);
  const micVolumeRef = useRef(0);
  const lastFlapTimeRef = useRef(0);

  // Fallback refs
  const manualDirectionRef = useRef<"up" | "down" | null>(null);
  const manualFlapRef = useRef(false);

  const pipesRef = useRef<Pipe[]>([]);
  const lastPipeTimeRef = useRef<number>(0);
  const scoreRef = useRef(0);

  // ---------- Stop semua sensor ----------
  const stopAllSensors = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => stopAllSensors, [stopAllSensors]);

  // ---------- Pilih kontrol ----------
  const chooseControl = (mode: ControlMode, versus = false) => {
    unlockAudio();
    setControlMode(mode);
    setIsVersus(versus);
    setErrorMsg("");
    setUsingFallback(false);
    if (mode === "nose") setPhase("loading-model");
    if (mode === "mic") setPhase("requesting-permission");
  };

  const backToChoose = () => {
    stopAllSensors();
    setControlMode(null);
    setIsVersus(false);
    setPhase("choose-control");
  };

  // ---------- NOSE: load model ----------
  useEffect(() => {
    if (phase !== "loading-model" || controlMode !== "nose") return;
    let cancelled = false;
    (async () => {
      try {
        const faceapi = await import("face-api.js");
        faceapiRef.current = faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        ]);
        if (!cancelled) setPhase("requesting-permission");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setErrorMsg("Gagal load AI model, pake kontrol manual ya");
          setUsingFallback(true);
          setPhase("ready");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [phase, controlMode]);

  // ---------- Minta izin kamera/mic ----------
  useEffect(() => {
    if (phase !== "requesting-permission") return;
    let cancelled = false;

    (async () => {
      if (controlMode === "nose") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: "user" },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          cameraStreamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setPhase("calibrating");
        } catch (err) {
          console.error(err);
          setErrorMsg("Kamera gak bisa diakses, pake kontrol manual ya");
          setUsingFallback(true);
          setPhase("ready");
        }
      } else if (controlMode === "mic") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          micStreamRef.current = stream;
          const ctx = getAudioContext();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analyserRef.current = analyser;
          analyserDataRef.current = new Uint8Array(analyser.frequencyBinCount);
          setPhase("ready");
        } catch (err) {
          console.error(err);
          setErrorMsg("Mic gak bisa diakses, pake tombol spasi ya");
          setUsingFallback(true);
          setPhase("ready");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [phase, controlMode]);

  // ---------- NOSE: kalibrasi 2 detik (Buat 1 atau 2 Muka) ----------
  useEffect(() => {
    if (phase !== "calibrating") return;
    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video) return;

    const samples1: number[] = [];
    const samples2: number[] = [];
    let cancelled = false;

    const sample = async () => {
      if (video.readyState === 4) {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks();
          
        if (detections.length > 0) {
          const sorted = detections.sort((a: any, b: any) => a.detection.box.x - b.detection.box.x);
          if (sorted[0]) samples1.push(sorted[0].landmarks.getNose()[3].y);
          if (isVersus && sorted[1]) samples2.push(sorted[1].landmarks.getNose()[3].y);
        }
      }
      if (!cancelled) rafIdRef.current = requestAnimationFrame(sample);
    };
    sample();

    const timeout = setTimeout(() => {
      cancelled = true;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      
      if (samples1.length > 5) {
        baselineNoseY1Ref.current = samples1.reduce((a, b) => a + b, 0) / samples1.length;
        
        if (isVersus) {
          if (samples2.length > 5) {
            baselineNoseY2Ref.current = samples2.reduce((a, b) => a + b, 0) / samples2.length;
            setPhase("ready");
          } else {
            setErrorMsg("Muka player 2 gak kedetect! Harus berdua di kamera.");
            setUsingFallback(true);
            setPhase("ready");
          }
        } else {
          setPhase("ready");
        }
      } else {
        setErrorMsg("Wajah gak kedetect jelas, pake kontrol manual ya");
        setUsingFallback(true);
        setPhase("ready");
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [phase, isVersus]);

  // ---------- NOSE: tracking loop (1 atau 2 Muka) ----------
  useEffect(() => {
    if (phase !== "playing" || controlMode !== "nose" || usingFallback) return;
    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video) return;
    let cancelled = false;

    const track = async () => {
      if (video.readyState === 4) {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks();

        if (detections.length > 0) {
          lastFaceSeenRef.current = Date.now();
          const sortedFaces = detections.sort((a: any, b: any) => a.detection.box.x - b.detection.box.x);

          // P1 (Kiri)
          if (sortedFaces[0] && baselineNoseY1Ref.current !== null) {
            const tipY1 = sortedFaces[0].landmarks.getNose()[3].y;
            const delta1 = tipY1 - baselineNoseY1Ref.current;
            p1TargetYRef.current = GAME_HEIGHT / 2 + delta1 * 6;
          }

          // P2 (Kanan)
          if (isVersus && sortedFaces[1] && baselineNoseY2Ref.current !== null) {
            const tipY2 = sortedFaces[1].landmarks.getNose()[3].y;
            const delta2 = tipY2 - baselineNoseY2Ref.current;
            p2TargetYRef.current = GAME_HEIGHT / 2 + delta2 * 6;
          }
        }
      }
      if (!cancelled) rafIdRef.current = requestAnimationFrame(track);
    };
    track();

    return () => {
      cancelled = true;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [phase, controlMode, usingFallback, isVersus]);

  // ---------- MIC: baca volume ----------
  useEffect(() => {
    if (controlMode !== "mic" || usingFallback) return;
    if (phase !== "ready" && phase !== "playing") return;
    const analyser = analyserRef.current;
    const data = analyserDataRef.current;
    if (!analyser || !data) return;
    let raf: number;

    const read = () => {
      // @ts-ignore: Fix beda versi tipe ArrayBuffer di Vercel
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const norm = (data[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      micVolumeRef.current = rms;
      setMicLevel(Math.min(1, rms / 0.4));
      raf = requestAnimationFrame(read);
    };
    read();

    return () => cancelAnimationFrame(raf);
  }, [controlMode, usingFallback, phase]);

  // ---------- Kontrol manual (fallback) ----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") manualDirectionRef.current = "up";
      if (e.key === "ArrowDown") manualDirectionRef.current = "down";
      if (e.code === "Space") { e.preventDefault(); manualFlapRef.current = true; }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") manualDirectionRef.current = null;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ---------- Main game loop ----------
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    pipesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    p1YRef.current = GAME_HEIGHT / 2;
    p1TargetYRef.current = GAME_HEIGHT / 2;
    p2YRef.current = GAME_HEIGHT / 2;
    p2TargetYRef.current = GAME_HEIGHT / 2;
    birdVelRef.current = 0;
    lastPipeTimeRef.current = performance.now();
    let animId: number;
    let running = true;

    const triggerCollision = () => {
      running = false;
      playCollision();
      playGameOverJingle();
      shakeControls.start({
        x: [0, -14, 14, -8, 8, -3, 3, 0],
        transition: { duration: 0.4 },
      });
      setPhase("gameover");
      localStorage.setItem("stamp_nosebird", "true");
    };

    const loop = (time: number) => {
      if (!running) return;

      if (controlMode === "nose") {
        if (usingFallback) {
          if (manualDirectionRef.current === "up") p1TargetYRef.current -= 6;
          if (manualDirectionRef.current === "down") p1TargetYRef.current += 6;
        } else {
          setSensorOk(Date.now() - lastFaceSeenRef.current <= 1500);
        }
        
        // Fisik P1
        p1TargetYRef.current = Math.max(BIRD_SIZE, Math.min(GAME_HEIGHT - BIRD_SIZE, p1TargetYRef.current));
        p1YRef.current += (p1TargetYRef.current - p1YRef.current) * 0.2;

        // Fisik P2 (Versus)
        if (isVersus) {
          p2TargetYRef.current = Math.max(BIRD_SIZE, Math.min(GAME_HEIGHT - BIRD_SIZE, p2TargetYRef.current));
          p2YRef.current += (p2TargetYRef.current - p2YRef.current) * 0.2;
        }

      } else {
        // Mic mode (Solo only)
        let shouldFlap = false;
        if (usingFallback) {
          if (manualFlapRef.current) { shouldFlap = true; manualFlapRef.current = false; }
          setSensorOk(true);
        } else {
          if (micVolumeRef.current > MIC_THRESHOLD && time - lastFlapTimeRef.current > FLAP_COOLDOWN) {
            shouldFlap = true;
          }
          setSensorOk(true);
        }
        if (shouldFlap) {
          birdVelRef.current = FLAP_STRENGTH;
          lastFlapTimeRef.current = time;
          playFlap();
        }
        birdVelRef.current += GRAVITY;
        p1YRef.current += birdVelRef.current;
        p1YRef.current = Math.max(BIRD_SIZE, Math.min(GAME_HEIGHT - BIRD_SIZE, p1YRef.current));
      }

      // Spawn pipes
      if (time - lastPipeTimeRef.current > PIPE_INTERVAL) {
        const gapY = 80 + Math.random() * (GAME_HEIGHT - 160 - PIPE_GAP);
        pipesRef.current.push({ x: GAME_WIDTH, gapY, passed: false });
        lastPipeTimeRef.current = time;
      }

      pipesRef.current.forEach((p) => (p.x -= PIPE_SPEED));
      pipesRef.current = pipesRef.current.filter((p) => p.x > -PIPE_WIDTH);

      // Hitboxes & Scores
      for (const p of pipesRef.current) {
        if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
          p.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          playScore();
        }
        
        const inPipeX = BIRD_X + BIRD_SIZE / 2 > p.x && BIRD_X - BIRD_SIZE / 2 < p.x + PIPE_WIDTH;
        
        // P1 Hitbox
        const inGapY1 = p1YRef.current - BIRD_SIZE / 2 > p.gapY && p1YRef.current + BIRD_SIZE / 2 < p.gapY + PIPE_GAP;
        if (inPipeX && !inGapY1) { triggerCollision(); break; }

        // P2 Hitbox (Versus)
        if (isVersus) {
          const inGapY2 = p2YRef.current - BIRD_SIZE / 2 > p.gapY && p2YRef.current + BIRD_SIZE / 2 < p.gapY + PIPE_GAP;
          if (inPipeX && !inGapY2) { triggerCollision(); break; }
        }
      }

      // Render
      ctx2d.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      const grad = ctx2d.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      grad.addColorStop(0, "#CFEEFB");
      grad.addColorStop(1, "#D3F5E3");
      ctx2d.fillStyle = grad;
      ctx2d.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx2d.fillStyle = "#FFE39A";
      pipesRef.current.forEach((p) => {
        drawRoundRect(ctx2d, p.x, 0, PIPE_WIDTH, p.gapY, 14);
        drawRoundRect(ctx2d, p.x, p.gapY + PIPE_GAP, PIPE_WIDTH, GAME_HEIGHT - p.gapY - PIPE_GAP, 14);
      });

      // Render Burung P1
      ctx2d.font = `${BIRD_SIZE}px sans-serif`;
      ctx2d.textAlign = "center";
      ctx2d.textBaseline = "middle";
      ctx2d.fillText("🐤", BIRD_X, p1YRef.current);
      
      // Render Burung P2
      if (isVersus) {
        ctx2d.fillText("🕊️", BIRD_X, p2YRef.current);
      }

      if (running) animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [phase, controlMode, usingFallback, isVersus, shakeControls]);

  const startGame = () => {
    unlockAudio();
    playStart();
    setPhase("playing");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative">
      <motion.button
        onClick={() => router.push("/")}
        whileHover={{ y: -3, scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        className="fixed top-6 left-6 z-30 w-12 h-12 rounded-full clay-surface flex items-center justify-center text-xl shadow-[var(--shadow-clay-sm)]"
      >
        ←
      </motion.button>

      <h1 className="text-4xl md:text-5xl font-extrabold text-clay-ink mb-2 text-center">
        🐤 Nose Bird
      </h1>
      <p className="text-clay-ink/60 mb-6 text-center">
        {controlMode === "mic"
          ? "Teriak buat terbang, diem buat jatuh!"
          : controlMode === "nose"
          ? (isVersus ? "2 Player: Naik turunin kepala barengan biar ga nabrak!" : "Naik turunin kepala lo buat gerakin burungnya!")
          : "Pilih mode favorit lo dulu"}
      </p>

      <motion.div animate={shakeControls} className="relative rounded-[var(--radius-clay-lg)] p-4 shadow-[var(--shadow-clay-lg)]" style={{ backgroundColor: "var(--color-clay-glass)" }}>
        <div
          className="relative rounded-[var(--radius-clay)] overflow-hidden shadow-[var(--shadow-clay-pressed)]"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT, maxWidth: "90vw" }}
        >
          {/* ---------- UI Pilih Kontrol ---------- */}
          {phase === "choose-control" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-clay-ink/90 gap-5 px-6">
              <p className="text-white font-bold text-lg text-center mb-2">Mau kontrol pake apa?</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={() => chooseControl("nose", false)}
                  whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-6 py-5 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-sky-soft)] text-clay-ink font-bold flex flex-col items-center gap-2 w-40"
                >
                  <span className="text-3xl">👃</span>Solo
                </motion.button>
                <motion.button
                  onClick={() => chooseControl("nose", true)}
                  whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-6 py-5 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-butter)] text-clay-ink font-bold flex flex-col items-center gap-2 w-40"
                >
                  <span className="text-3xl">👃👃</span>Versus
                </motion.button>
                <motion.button
                  onClick={() => chooseControl("mic", false)}
                  whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-6 py-5 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-pink-soft)] text-clay-ink font-bold flex flex-col items-center gap-2 w-40"
                >
                  <span className="text-3xl">🎤</span>Teriak
                </motion.button>
              </div>
            </div>
          )}

          {/* ---------- Loading ---------- */}
          {["loading-model", "requesting-permission", "calibrating"].includes(phase) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-clay-ink/80">
              <p className="text-white font-semibold text-center px-4">
                {phase === "loading-model" && "Nyiapin AI... 🤖"}
                {phase === "requesting-permission" && controlMode === "nose" && "Minta izin kamera... 📸"}
                {phase === "requesting-permission" && controlMode === "mic" && "Minta izin mic... 🎙️"}
                {phase === "calibrating" && "Kalibrasi... hadap lurus ke kamera ya! 🎯"}
              </p>
            </div>
          )}

          {/* ---------- Ready screen ---------- */}
          {phase === "ready" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-clay-ink/85 gap-4 px-6 text-center">
              <p className="text-white font-semibold">
                {usingFallback
                  ? controlMode === "mic" ? "Tahan tombol Spasi buat terbang ya" : "Pake tombol ↑ ↓ buat kontrol ya"
                  : controlMode === "mic" ? "Siap! Coba teriak dikit liat meter-nya" : "Siap! Gerakin kepala buat naik turun"}
              </p>
              {errorMsg && <p className="text-white/70 text-sm">{errorMsg}</p>}

              {controlMode === "mic" && !usingFallback && (
                <div className="w-48 h-3 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-[var(--color-clay-mint)] transition-all duration-75" style={{ width: `${micLevel * 100}%` }} />
                </div>
              )}

              <div className="flex gap-3">
                <motion.button
                  onClick={startGame}
                  whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-8 py-3 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-mint)] text-clay-ink font-bold"
                >
                  Mulai Main
                </motion.button>
                <motion.button
                  onClick={backToChoose}
                  whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-5 py-3 rounded-[var(--radius-clay-lg)] bg-white/20 text-white text-sm font-semibold"
                >
                  Ganti Kontrol
                </motion.button>
              </div>
            </div>
          )}

          {/* ---------- Game over ---------- */}
          {phase === "gameover" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-clay-ink/85 gap-3 text-center px-6">
              <p className="text-white text-2xl font-extrabold">Game Over!</p>
              <p className="text-white/80">Score lo: {score}</p>
              <div className="flex gap-3 mt-2">
                <motion.button
                  onClick={startGame}
                  whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-8 py-3 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-butter)] text-clay-ink font-bold"
                >
                  🔄 Main Lagi
                </motion.button>
                <motion.button
                  onClick={backToChoose}
                  whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-5 py-3 rounded-[var(--radius-clay-lg)] bg-white/20 text-white text-sm font-semibold"
                >
                  Ganti Mode
                </motion.button>
              </div>
            </div>
          )}

          <canvas ref={gameCanvasRef} className="w-full h-full" />
          <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        </div>

        {phase === "playing" && (
          <div className="absolute top-6 left-6 clay-surface px-4 py-2 rounded-[var(--radius-clay)] z-10">
            <span className="font-bold text-clay-ink">Score: {score}</span>
          </div>
        )}

        {phase === "playing" && !usingFallback && !sensorOk && controlMode === "nose" && (
          <div className="absolute top-6 right-6 bg-red-100 text-red-600 px-3 py-1.5 rounded-[var(--radius-clay)] text-xs font-semibold z-10">
            Wajah gak kedetect, hadep kamera ya!
          </div>
        )}
      </motion.div>
    </main>
  );
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}