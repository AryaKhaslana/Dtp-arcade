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

type ControlMode = "mic" | "manual" | null;
type Phase =
  | "choose-control"
  | "requesting-permission"
  | "ready"
  | "playing"
  | "gameover";

type Pipe = { x: number; gapY: number; passed: boolean };

export default function ScreamBirdPage() {
  const router = useRouter();
  const shakeControls = useAnimation();

  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const [controlMode, setControlMode] = useState<ControlMode>(null);
  const [phase, setPhase] = useState<Phase>("choose-control");
  const [errorMsg, setErrorMsg] = useState("");
  const [score, setScore] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  // Player Refs
  const p1YRef = useRef(GAME_HEIGHT / 2);
  const birdVelRef = useRef(0);
  
  // Controls Refs
  const micVolumeRef = useRef(0);
  const lastFlapTimeRef = useRef(0);
  const manualFlapRef = useRef(false);

  const pipesRef = useRef<Pipe[]>([]);
  const lastPipeTimeRef = useRef<number>(0);
  const scoreRef = useRef(0);

  // ---------- Stop mic sensor ----------
  const stopAllSensors = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => stopAllSensors, [stopAllSensors]);

  // ---------- Pilih kontrol ----------
  const chooseControl = (mode: ControlMode) => {
    unlockAudio();
    setControlMode(mode);
    setErrorMsg("");
    if (mode === "mic") setPhase("requesting-permission");
    if (mode === "manual") setPhase("ready");
  };

  const backToChoose = () => {
    stopAllSensors();
    setControlMode(null);
    setPhase("choose-control");
  };

  // ---------- Minta izin mic ----------
  useEffect(() => {
    if (phase !== "requesting-permission" || controlMode !== "mic") return;
    let cancelled = false;

    (async () => {
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
        setErrorMsg("Mic gak bisa diakses, kita ganti ke mode Spasi ya!");
        setControlMode("manual");
        setPhase("ready");
      }
    })();

    return () => { cancelled = true; };
  }, [phase, controlMode]);

  // ---------- MIC: baca volume ----------
  useEffect(() => {
    if (controlMode !== "mic") return;
    if (phase !== "ready" && phase !== "playing") return;
    const analyser = analyserRef.current;
    const data = analyserDataRef.current;
    if (!analyser || !data) return;
    let raf: number;

    const read = () => {
      // @ts-ignore
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
  }, [controlMode, phase]);

  // ---------- Kontrol manual (Spasi / Click) ----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        manualFlapRef.current = true;
      }
    };
    const handleClick = () => {
      if (phase === "playing") manualFlapRef.current = true;
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("touchstart", handleClick, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("touchstart", handleClick);
    };
  }, [phase]);

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
      localStorage.setItem("stamp_screambird", "true");
    };

    const loop = (time: number) => {
      if (!running) return;

      let shouldFlap = false;

      // Cek Spasi/Tap manual
      if (manualFlapRef.current) {
        shouldFlap = true;
        manualFlapRef.current = false;
      }
      
      // Cek Mic
      if (controlMode === "mic" && micVolumeRef.current > MIC_THRESHOLD && time - lastFlapTimeRef.current > FLAP_COOLDOWN) {
        shouldFlap = true;
      }

      if (shouldFlap) {
        birdVelRef.current = FLAP_STRENGTH;
        lastFlapTimeRef.current = time;
        playFlap();
      }

      birdVelRef.current += GRAVITY;
      p1YRef.current += birdVelRef.current;
      p1YRef.current = Math.max(BIRD_SIZE, Math.min(GAME_HEIGHT - BIRD_SIZE, p1YRef.current));

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
        const inGapY = p1YRef.current - BIRD_SIZE / 2 > p.gapY && p1YRef.current + BIRD_SIZE / 2 < p.gapY + PIPE_GAP;
        
        if (inPipeX && !inGapY) { 
          triggerCollision(); 
          break; 
        }
      }

      // Render
      ctx2d.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      const grad = ctx2d.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      grad.addColorStop(0, "#ff7e5f");
      grad.addColorStop(1, "#feb47b");
      ctx2d.fillStyle = grad;
      ctx2d.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx2d.fillStyle = "#4a0e4e";
      pipesRef.current.forEach((p) => {
        drawRoundRect(ctx2d, p.x, 0, PIPE_WIDTH, p.gapY, 14);
        drawRoundRect(ctx2d, p.x, p.gapY + PIPE_GAP, PIPE_WIDTH, GAME_HEIGHT - p.gapY - PIPE_GAP, 14);
      });

      // Render Burung P1
      ctx2d.font = `${BIRD_SIZE}px sans-serif`;
      ctx2d.textAlign = "center";
      ctx2d.textBaseline = "middle";
      ctx2d.fillText("🐔", BIRD_X, p1YRef.current);

      if (running) animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [phase, controlMode, shakeControls]);

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
        🐔 Scream Bird
      </h1>
      <p className="text-clay-ink/60 mb-6 text-center">
        {controlMode === "mic"
          ? "Teriak kenceng buat terbang, diam buat jatuh!"
          : controlMode === "manual"
          ? "Pencet Spasi atau Tap layar buat terbang!"
          : "Pilih mode main lu sekarang"}
      </p>

      <motion.div animate={shakeControls} className="relative rounded-[var(--radius-clay-lg)] p-4 shadow-[var(--shadow-clay-lg)]" style={{ backgroundColor: "var(--color-clay-glass)" }}>
        <div
          className="relative rounded-[var(--radius-clay)] overflow-hidden shadow-[var(--shadow-clay-pressed)]"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT, maxWidth: "90vw" }}
        >
          {/* ---------- UI Pilih Kontrol ---------- */}
          {phase === "choose-control" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-clay-ink/90 gap-5 px-6">
              <p className="text-white font-bold text-lg text-center mb-2">Pilih Senjata Lu:</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={() => chooseControl("mic")}
                  whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-6 py-5 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-pink-soft)] text-clay-ink font-bold flex flex-col items-center gap-2 w-48"
                >
                  <span className="text-3xl">🎤</span> Mode Teriak
                </motion.button>
                <motion.button
                  onClick={() => chooseControl("manual")}
                  whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  className="clay-button px-6 py-5 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-sky-soft)] text-clay-ink font-bold flex flex-col items-center gap-2 w-48"
                >
                  <span className="text-3xl">⌨️</span> Mode Spasi
                </motion.button>
              </div>
            </div>
          )}

          {/* ---------- Loading ---------- */}
          {phase === "requesting-permission" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-clay-ink/80">
              <p className="text-white font-semibold text-center px-4">
                Minta izin mic... 🎙️
              </p>
            </div>
          )}

          {/* ---------- Ready screen ---------- */}
          {phase === "ready" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-clay-ink/85 gap-4 px-6 text-center">
              <p className="text-white font-semibold">
                {controlMode === "mic" 
                  ? "Siap! Coba cek sound, barnya gerak gak tuh?" 
                  : "Siap! Tarik nafas, pencet Spasi buat nge-flap."}
              </p>
              {errorMsg && <p className="text-white/70 text-sm">{errorMsg}</p>}

              {controlMode === "mic" && (
                <div className="w-48 h-3 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-[var(--color-clay-pink)] transition-all duration-75" style={{ width: `${micLevel * 100}%` }} />
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
                  Ganti Mode
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
        </div>

        {phase === "playing" && (
          <div className="absolute top-6 left-6 clay-surface px-4 py-2 rounded-[var(--radius-clay)] z-10">
            <span className="font-bold text-clay-ink">Score: {score}</span>
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