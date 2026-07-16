"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { useRouter } from "next/navigation";

// --- DATA BOSS & LEVEL ---
const BOSS_LEVELS = [
  { name: "Tikus Kabel Lab", maxHp: 150000, color: "text-green-400", hue: 90 }, // Hijau
  { name: "Router Mikrotik Ngambek", maxHp: 350000, color: "text-yellow-400", hue: 45 }, // Kuning/Oren
  { name: "Raja Bug (Project Akhir)", maxHp: 600000, color: "text-orange-500", hue: 15 }, // Oren kemerahan
  { name: "Demon Lord Skomda", maxHp: 999999, color: "text-red-600", hue: 0 }, // Merah asli
];

type GameState = "start" | "playing" | "result" | "level_clear" | "game_cleared";

export default function CriticalStrikePage() {
  const router = useRouter();
  const shakeControls = useAnimation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [gameState, setGameState] = useState<GameState>("start");
  const [resultMsg, setResultMsg] = useState("");
  const [damage, setDamage] = useState(0);
  
  // State Boss & Level
  const [level, setLevel] = useState(0);
  const [bossHp, setBossHp] = useState(BOSS_LEVELS[0].maxHp);
  
  // State Settings
  const [showSettings, setShowSettings] = useState(false);
  const [difficulty, setDifficulty] = useState<"Normal" | "Hard">("Normal");

  // Engine Refs
  const reqRef = useRef<number>();
  const markerX = useRef(0);
  const speed = useRef(15);
  const direction = useRef(1);
  const slashAnim = useRef(0);
  const isPerfect = useRef(false);

  // --- ENGINE LOOP ---
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "result") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    if (gameState === "playing") {
      markerX.current = 0;
      slashAnim.current = 0;
      isPerfect.current = false;
      speed.current = difficulty === "Hard" ? 25 : 15;
    }

    let running = true;

    const render = () => {
      if (!running) return;
      const w = canvas.width;
      const h = canvas.height;

      // Hapus frame lama (Biar transparan)
      if (isPerfect.current && slashAnim.current > 0) {
        ctx.fillStyle = "#ffffff"; 
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      const barWidth = Math.min(600, w * 0.8);
      const barX = (w - barWidth) / 2;
      const barY = h / 2 + 100; // Posisi QTE Bar

      // 1. ANIMASI BAR QTE
      if (gameState === "playing") {
        markerX.current += speed.current * direction.current;
        if (markerX.current > barWidth) {
          markerX.current = barWidth;
          direction.current = -1;
        } else if (markerX.current < 0) {
          markerX.current = 0;
          direction.current = 1;
        }

        // Gambar Base Bar 
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, 30, 15);
        ctx.fill();
        ctx.stroke();

        // Zona Perfect (Tengah)
        const perfectZoneWidth = difficulty === "Hard" ? 20 : 45;
        const perfectX = barX + barWidth / 2 - perfectZoneWidth / 2;
        ctx.fillStyle = "#ff0044";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ff0044";
        ctx.fillRect(perfectX, barY, perfectZoneWidth, 30);
        ctx.shadowBlur = 0;

        // Jarum Penunjuk
        ctx.fillStyle = "#00f3ff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00f3ff";
        ctx.fillRect(barX + markerX.current - 4, barY - 10, 8, 50);
        ctx.shadowBlur = 0;

        // Teks Note di bawah QTE Bar
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.textAlign = "center";
        ctx.fillText("[ TAP LAYAR ATAU TEKAN SPASI TEPAT DI AREA MERAH ]", barX + barWidth / 2, barY + 55);
      }

      // 2. ANIMASI TEBASAN CANVAS
      if (gameState === "result" && slashAnim.current > 0) {
        slashAnim.current -= 0.05;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = `rgba(0, 0, 0, ${slashAnim.current})`; 
        if (!isPerfect.current) ctx.fillStyle = `rgba(255, 0, 68, ${slashAnim.current})`; 
        ctx.fillRect(-w, -5 + (1 - slashAnim.current) * 10, w * 2, 10 + slashAnim.current * 20);
        ctx.restore();
      }

      reqRef.current = requestAnimationFrame(render);
    };

    reqRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [gameState, difficulty]);

  // --- LOGIC DAMAGE & LEVELING ---
  const handleStrike = () => {
    if (gameState !== "playing") return;

    const w = window.innerWidth;
    const barWidth = Math.min(600, w * 0.8);
    const center = barWidth / 2;
    const diff = Math.abs(markerX.current - center);
    
    const tolerance = difficulty === "Hard" ? 15 : 25; 

    slashAnim.current = 1;
    let hitDamage = 0;

    if (diff < tolerance) {
      isPerfect.current = true;
      hitDamage = 99999;
      setResultMsg("CRITICAL STRIKE!!");
      shakeControls.start({ x: [0, -20, 20, -15, 15, -5, 5, 0], y: [0, 15, -15, 10, -10, 5, -5, 0], transition: { duration: 0.5 } });
    } else if (diff < 80) {
      isPerfect.current = false;
      hitDamage = Math.floor(8000 + Math.random() * 4000);
      setResultMsg("SOLID HIT!");
      shakeControls.start({ x: [0, -5, 5, 0], transition: { duration: 0.2 } });
    } else {
      isPerfect.current = false;
      hitDamage = Math.floor(100 + Math.random() * 50);
      setResultMsg("WEAK AF...");
    }

    setDamage(hitDamage);
    const newHp = Math.max(0, bossHp - hitDamage);
    setBossHp(newHp);

    if (newHp === 0) {
      setTimeout(() => {
        if (level + 1 >= BOSS_LEVELS.length) {
          setGameState("game_cleared");
        } else {
          setGameState("level_clear");
        }
      }, 1500); 
      setGameState("result");
    } else {
      setGameState("result");
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); handleStrike(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const nextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setBossHp(BOSS_LEVELS[nextLvl].maxHp);
    setGameState("playing");
  };

  return (
    <motion.main 
      animate={shakeControls}
      onClick={() => { if (gameState === "playing") handleStrike(); }}
      className="min-h-screen bg-[#050508] flex flex-col items-center justify-center relative font-mono overflow-hidden touch-none select-none"
    >
      <motion.button
        onClick={(e) => { e.stopPropagation(); router.push("/"); }}
        whileHover={{ scale: 1.1 }}
        className="fixed top-6 left-6 z-40 w-12 h-12 rounded-full border border-white/20 bg-black/50 flex items-center justify-center text-xl text-white backdrop-blur-md cursor-pointer"
      >
        ←
      </motion.button>

      {gameState === "start" && (
        <motion.button
          onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
          whileHover={{ scale: 1.1 }}
          className="fixed top-6 right-6 z-40 w-12 h-12 rounded-full border border-white/20 bg-black/50 flex items-center justify-center text-2xl text-white backdrop-blur-md cursor-pointer"
        >
          ⚙️
        </motion.button>
      )}

      {/* LAYER 0: Background Isekai */}
      <div className="absolute inset-0 z-0 bg-[url('/assets/background.jpeg')] bg-cover bg-center opacity-40 blur-[2px]" />

      {/* LAYER 5: BOSS MUSUH DI TENGAH (Pake efek ganti warna per level) */}
      {gameState !== "start" && gameState !== "game_cleared" && (
        <div className="absolute z-0 top-[12%] md:top-[10%] flex justify-center w-full pointer-events-none transition-all duration-300">
          <img
            src="/assets/boss.png" 
            alt="Boss"
            className={`h-[35vh] md:h-[45vh] object-contain transition-all duration-500 ${bossHp <= 0 ? 'opacity-0 scale-125 blur-sm' : 'opacity-100 scale-100 drop-shadow-[0_0_50px_rgba(255,0,0,0.8)]'}`}
            style={{ filter: `hue-rotate(${BOSS_LEVELS[level].hue}deg)` }}
          />
        </div>
      )}

      {/* LAYER 10: KARAKTER HERO (Ukurannya dikecilin & digeser ke kiri biar proporsional) */}
      <div className="absolute z-10 bottom-0 left-[-10%] md:left-10 flex justify-start w-full pointer-events-none">
        <img
          src="/assets/feixiao.png" 
          alt="Hero"
          className="h-[45vh] md:h-[55vh] max-w-[90vw] object-contain object-bottom drop-shadow-[0_0_40px_rgba(0,255,150,0.4)]"
        />
      </div>

      {/* LAYER 20: CANVAS */}
      <canvas ref={canvasRef} className="absolute inset-0 z-20 pointer-events-none" />

      {/* LAYER 30: UI BOSS HP (Diatas Layar) */}
      {(gameState === "playing" || gameState === "result") && (
        <div className="absolute top-8 w-full px-8 max-w-2xl z-30 pointer-events-none flex flex-col items-center">
          <p className={`font-black text-xl md:text-2xl mb-2 drop-shadow-md uppercase tracking-wider ${BOSS_LEVELS[level].color}`}>
            Lv.{level + 1} - {BOSS_LEVELS[level].name}
          </p>
          <div className="w-full h-6 bg-zinc-900/80 rounded-full border border-white/20 overflow-hidden relative backdrop-blur-sm shadow-[0_0_20px_rgba(255,0,0,0.3)]">
            <div 
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${(bossHp / BOSS_LEVELS[level].maxHp) * 100}%` }}
            />
            <p className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold drop-shadow-md">
              {bossHp.toLocaleString()} / {BOSS_LEVELS[level].maxHp.toLocaleString()} HP
            </p>
          </div>
        </div>
      )}

      {/* LAYER 40: UI KONTROL / MENU */}
      <div className="z-40 flex flex-col items-center justify-center text-center w-full px-4 h-full pointer-events-none">
        
        {gameState === "start" && (
          <div className="bg-black/70 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,255,150,0.2)]">
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00f3ff] mb-2 italic drop-shadow-[0_0_15px_rgba(255,0,68,0.8)]">
              BOSS RUSH
            </h1>
            <p className="text-white/80 mb-8 uppercase tracking-widest text-sm md:text-base">
              Kalahkan {BOSS_LEVELS.length} Boss. Tap layar pas di area merah!
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setGameState("playing"); }}
              className="px-10 py-4 pointer-events-auto bg-[#ff0044] text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(255,0,68,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              START BATTLE
            </button>
          </div>
        )}

        {gameState === "result" && (
          <div className="absolute top-32 flex flex-col items-center z-50">
            <motion.h2 
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`text-5xl md:text-7xl font-black italic tracking-tighter uppercase ${
                resultMsg === "CRITICAL STRIKE!!" ? "text-white drop-shadow-[0_0_20px_rgba(255,0,0,1)]" : "text-white drop-shadow-[0_0_15px_rgba(255,0,68,0.8)]"
              }`}
            >
              {resultMsg}
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className={`text-3xl font-black mt-2 tracking-widest ${
                resultMsg === "CRITICAL STRIKE!!" ? "text-[#eaff00] drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]" : "text-white/80"
              }`}
            >
              - {damage.toLocaleString()} DMG
            </motion.p>
            
            {bossHp > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setGameState("playing"); }}
                className="mt-8 px-10 py-3 pointer-events-auto font-black uppercase tracking-widest rounded-full bg-black text-white hover:bg-zinc-800 border border-white/20 transition-all cursor-pointer"
              >
                NEXT STRIKE
              </button>
            )}
          </div>
        )}

        {gameState === "level_clear" && (
          <div className="bg-black/80 backdrop-blur-md p-8 rounded-2xl border border-[#00f3ff]/50 absolute top-1/3">
            <h2 className="text-4xl md:text-5xl font-black text-[#00f3ff] mb-6 drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]">
              BOSS DEFEATED!
            </h2>
            <button
              onClick={(e) => { e.stopPropagation(); nextLevel(); }}
              className="px-10 py-4 pointer-events-auto bg-[#00f3ff] text-black font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(0,243,255,0.6)] hover:bg-white transition-all cursor-pointer"
            >
              NEXT BOSS
            </button>
          </div>
        )}

        {gameState === "game_cleared" && (
          <div className="bg-black/90 backdrop-blur-xl p-8 rounded-2xl border border-[#eaff00]/50 absolute top-1/4 z-50">
            <h2 className="text-5xl font-black text-[#eaff00] mb-2 drop-shadow-[0_0_20px_rgba(255,255,0,0.8)]">
              S-RANK CLEAR!
            </h2>
            <p className="text-white/80 mb-6">Lu berhasil numpas semua Boss Skomda!</p>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                setLevel(0); 
                setBossHp(BOSS_LEVELS[0].maxHp); 
                setGameState("start"); 
              }}
              className="px-10 py-4 pointer-events-auto bg-white text-black font-black uppercase tracking-widest rounded-full cursor-pointer"
            >
              MAIN LAGI
            </button>
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-white/20 p-6 rounded-2xl max-w-sm w-full relative pointer-events-auto">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white font-bold"
            >
              ✕
            </button>
            <h3 className="text-2xl font-black text-white mb-6 text-center border-b border-white/10 pb-4">
              SETTINGS
            </h3>
            
            <div className="mb-6">
              <p className="text-white/70 mb-2 font-bold text-sm">Kesulitan Bar QTE:</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setDifficulty("Normal")}
                  className={`flex-1 py-2 rounded font-bold transition-all ${difficulty === "Normal" ? "bg-[#00f3ff] text-black" : "bg-white/10 text-white"}`}
                >
                  NORMAL
                </button>
                <button 
                  onClick={() => setDifficulty("Hard")}
                  className={`flex-1 py-2 rounded font-bold transition-all ${difficulty === "Hard" ? "bg-red-600 text-white" : "bg-white/10 text-white"}`}
                >
                  HARDCORE
                </button>
              </div>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-white/10 text-center">
              <p className="text-[#eaff00] font-black text-sm mb-1 uppercase">Pesan Buat Adik Kelas:</p>
              <p className="text-white/80 text-xs italic">
                "Bangga jadi anak Skomda! Main game boleh jago, tapi praktek lab & coding harus lebih dewa. Semangat push rank di jurusan!"
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.main>
  );
}