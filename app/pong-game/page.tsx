"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

// --- KONSTANTA FISIKA & UKURAN ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 12;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 6;
const MAX_SCORE = 7; // Main sampe skor 7

type GameState = "start" | "playing" | "gameover";

export default function CyberPongPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<"P1" | "P2" | null>(null);

  // --- REFS BUAT LOGIC GAME (Biar gak re-render terus) ---
  const p1Y = useRef(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const p2Y = useRef(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const ball = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    dx: INITIAL_BALL_SPEED,
    dy: INITIAL_BALL_SPEED * 0.5,
  });

  // Track tombol yang lagi dipencet (Bisa gerak barengan)
  const keys = useRef<{ [key: string]: boolean }>({
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false,
  });

  const requestRef = useRef<number>();

  // --- KEYBOARD LISTENERS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (keys.current.hasOwnProperty(e.key)) keys.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (keys.current.hasOwnProperty(e.key)) keys.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- ENGINE GAME LOOP ---
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset posisi pas mulai
    p1Y.current = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    p2Y.current = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    ball.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dx: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED,
      dy: (Math.random() - 0.5) * INITIAL_BALL_SPEED,
    };

    let p1Score = 0;
    let p2Score = 0;

    const update = () => {
      // 1. Gerakin Paddle P1 (W / S)
      if (keys.current["w"] && p1Y.current > 0) {
        p1Y.current -= PADDLE_SPEED;
      }
      if (keys.current["s"] && p1Y.current < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        p1Y.current += PADDLE_SPEED;
      }

      // 2. Gerakin Paddle P2 (Up / Down)
      if (keys.current["ArrowUp"] && p2Y.current > 0) {
        p2Y.current -= PADDLE_SPEED;
      }
      if (keys.current["ArrowDown"] && p2Y.current < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        p2Y.current += PADDLE_SPEED;
      }

      // 3. Gerakin Bola
      ball.current.x += ball.current.dx;
      ball.current.y += ball.current.dy;

      // 4. Pantulan Tembok Atas/Bawah
      if (ball.current.y - BALL_SIZE < 0 || ball.current.y + BALL_SIZE > CANVAS_HEIGHT) {
        ball.current.dy *= -1; // Balikin arah Y
      }

      // 5. Pantulan Paddle P1 (Kiri)
      if (
        ball.current.x - BALL_SIZE < 30 + PADDLE_WIDTH &&
        ball.current.y > p1Y.current &&
        ball.current.y < p1Y.current + PADDLE_HEIGHT
      ) {
        ball.current.dx = Math.abs(ball.current.dx) + 0.5; // Nambah cepet dikit
        let hitPoint = ball.current.y - (p1Y.current + PADDLE_HEIGHT / 2);
        ball.current.dy = hitPoint * 0.15; // Kasih efek "spin"
      }

      // 6. Pantulan Paddle P2 (Kanan)
      if (
        ball.current.x + BALL_SIZE > CANVAS_WIDTH - 30 - PADDLE_WIDTH &&
        ball.current.y > p2Y.current &&
        ball.current.y < p2Y.current + PADDLE_HEIGHT
      ) {
        ball.current.dx = -Math.abs(ball.current.dx) - 0.5; // Nambah cepet dikit
        let hitPoint = ball.current.y - (p2Y.current + PADDLE_HEIGHT / 2);
        ball.current.dy = hitPoint * 0.15;
      }

      // 7. Cek Gol (Bola kelewat batas layar)
      if (ball.current.x < 0) {
        p2Score++;
        setScore({ p1: p1Score, p2: p2Score });
        resetBall(1);
      } else if (ball.current.x > CANVAS_WIDTH) {
        p1Score++;
        setScore({ p1: p1Score, p2: p2Score });
        resetBall(-1);
      }

      // 8. Cek Menang
      if (p1Score >= MAX_SCORE || p2Score >= MAX_SCORE) {
        setWinner(p1Score >= MAX_SCORE ? "P1" : "P2");
        setGameState("gameover");
        return; // Stop loop
      }

      draw(ctx);
      requestRef.current = requestAnimationFrame(update);
    };

    const resetBall = (direction: number) => {
      ball.current.x = CANVAS_WIDTH / 2;
      ball.current.y = CANVAS_HEIGHT / 2;
      ball.current.dx = INITIAL_BALL_SPEED * direction;
      ball.current.dy = (Math.random() - 0.5) * INITIAL_BALL_SPEED;
    };

    // Mulai Loop
    requestRef.current = requestAnimationFrame(update);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // --- RENDER VISUAL (CANVAS) ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    // Background Gelap
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Garis Tengah Putus-putus
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // --- PADDLE 1 (Neon Cyan) ---
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00f3ff";
    ctx.fillStyle = "#00f3ff";
    ctx.fillRect(30, p1Y.current, PADDLE_WIDTH, PADDLE_HEIGHT);

    // --- PADDLE 2 (Neon Magenta) ---
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff00ff";
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(CANVAS_WIDTH - 30 - PADDLE_WIDTH, p2Y.current, PADDLE_WIDTH, PADDLE_HEIGHT);

    // --- BOLA (Neon Kuning) ---
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#eaff00";
    ctx.fillStyle = "#eaff00";
    ctx.beginPath();
    ctx.arc(ball.current.x, ball.current.y, BALL_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow biar ga bocor ke render selanjutnya
    ctx.shadowBlur = 0;
  };

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative font-mono selection:bg-cyan-500/30">
      <motion.button
        onClick={() => router.push("/")}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed top-6 left-6 z-30 w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-xl text-white backdrop-blur-md hover:bg-white/20 transition-colors"
      >
        ←
      </motion.button>

      {/* HEADER SCORE */}
      <div className="absolute top-8 w-full max-w-[800px] flex justify-between px-10 text-4xl md:text-6xl font-black italic tracking-widest z-10 pointer-events-none">
        <span className="text-[#00f3ff] drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]">{score.p1}</span>
        <span className="text-white/20 text-2xl md:text-4xl mt-2">VS</span>
        <span className="text-[#ff00ff] drop-shadow-[0_0_15px_rgba(255,0,255,0.8)]">{score.p2}</span>
      </div>

      <div className="relative rounded-xl overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black">
        
        {/* OVERLAY LAYAR AWAL */}
        {gameState === "start" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <h1 className="text-5xl font-black text-white mb-2 tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">CYBER PONG</h1>
            <p className="text-white/60 mb-8 uppercase tracking-widest text-sm">First to {MAX_SCORE} Wins</p>
            
            <div className="flex gap-12 mb-10">
              <div className="text-center">
                <p className="text-[#00f3ff] font-bold mb-2 uppercase">Player 1</p>
                <div className="flex gap-2">
                  <kbd className="bg-white/10 px-3 py-1 rounded text-white border border-white/20">W</kbd>
                  <kbd className="bg-white/10 px-3 py-1 rounded text-white border border-white/20">S</kbd>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[#ff00ff] font-bold mb-2 uppercase">Player 2</p>
                <div className="flex gap-2">
                  <kbd className="bg-white/10 px-3 py-1 rounded text-white border border-white/20">↑</kbd>
                  <kbd className="bg-white/10 px-3 py-1 rounded text-white border border-white/20">↓</kbd>
                </div>
              </div>
            </div>

            <motion.button
              onClick={() => setGameState("playing")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-sm hover:bg-[#eaff00] transition-colors"
            >
              INSERT COIN (PLAY)
            </motion.button>
          </div>
        )}

        {/* OVERLAY GAME OVER */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <h2 className={`text-6xl font-black mb-4 uppercase italic tracking-widest drop-shadow-[0_0_20px_currentColor] ${winner === "P1" ? "text-[#00f3ff]" : "text-[#ff00ff]"}`}>
              {winner} WINS!
            </h2>
            <p className="text-white mb-8 text-xl">
              Final Score: {score.p1} - {score.p2}
            </p>
            <motion.button
              onClick={() => {
                setScore({ p1: 0, p2: 0 });
                setGameState("playing");
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-sm hover:bg-[#eaff00] transition-colors"
            >
              REMATCH
            </motion.button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full max-w-[100vw] h-auto aspect-[8/5] block bg-[#0a0a0a]"
        />
      </div>
      
      <p className="text-white/30 text-xs mt-6 text-center max-w-md">
        Disclaimer: Game ini didesain buat dimainin 2 orang pake 1 Keyboard fisik. Gak rekomen buat touchscreen HP ya wak!
      </p>
    </main>
  );
}