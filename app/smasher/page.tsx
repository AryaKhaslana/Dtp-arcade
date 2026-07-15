"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function BugSmasher() {
  const router = useRouter();
  const [phase, setPhase] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [activeHoles, setActiveHoles] = useState<number[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setPhase("playing");

    // Timer mundur
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Logic munculin bug tiap 600ms
    gameIntervalRef.current = setInterval(() => {
      // Random 1 atau 2 bug muncul berbarengan
      const numBugs = Math.random() > 0.7 ? 2 : 1; 
      const newHoles: number[] = [];
      for(let i=0; i < numBugs; i++) {
        newHoles.push(Math.floor(Math.random() * 9));
      }
      setActiveHoles(newHoles);
    }, 600);
  };

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    setActiveHoles([]);
    setPhase("gameover");
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  const smashBug = (index: number) => {
    if (!activeHoles.includes(index)) return;
    
    // Hapus bug yang diklik dari array
    setActiveHoles((prev) => prev.filter((h) => h !== index));
    setScore((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-mono text-slate-100 overflow-hidden">
      
      {/* Background Grid Pattern biar ala Hacker/Arcade */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(slate-700 1px, transparent 1px), linear-gradient(90deg, slate-700 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <button onClick={() => router.push("/")} className="fixed top-6 left-6 text-2xl z-50 p-2 hover:bg-slate-800 rounded-lg">
        ⬅️
      </button>

      <div className="z-10 w-full max-w-md flex flex-col items-center gap-8">
        
        {/* Header Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-[0_4px_0_rgba(200,100,0,1)]">
            BUG SMASHER
          </h1>
          <p className="mt-2 text-slate-400 font-bold">Bantai bug sebelum rilis ke Production!</p>
        </div>

        {/* Info Board (3D Style) */}
        <div className="flex gap-4 w-full justify-between">
          <div className="relative group w-1/2">
            <div className="absolute inset-0 bg-blue-900 rounded-xl translate-y-1.5" />
            <div className="relative bg-slate-800 border-2 border-blue-500 p-3 rounded-xl flex flex-col items-center">
              <span className="text-xs text-blue-400 font-bold">TIME LEFT</span>
              <span className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
            </div>
          </div>
          <div className="relative group w-1/2">
            <div className="absolute inset-0 bg-green-900 rounded-xl translate-y-1.5" />
            <div className="relative bg-slate-800 border-2 border-green-500 p-3 rounded-xl flex flex-col items-center">
              <span className="text-xs text-green-400 font-bold">BUGS FIXED</span>
              <span className="text-3xl font-black text-white">{score}</span>
            </div>
          </div>
        </div>

        {/* Game Area (Grid 3x3) */}
        <div className="grid grid-cols-3 gap-4 w-full aspect-square bg-slate-800 p-4 rounded-2xl border-4 border-slate-950 shadow-[0_10px_0_#020617]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="relative w-full h-full">
              {/* Lubang Kosong (Inset 3D) */}
              <div className="absolute inset-2 bg-slate-950 rounded-full shadow-inner border-t-4 border-slate-700" />
              
              {/* Bugnya Muncul */}
              <AnimatePresence>
                {activeHoles.includes(i) && (
                  <motion.button
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    onMouseDown={() => smashBug(i)}
                    className="absolute inset-0 flex items-center justify-center cursor-crosshair focus:outline-none"
                  >
                    {/* INI CONTOH TOMBOL 3D TACTILE IG TREND */}
                    <div className="relative group active:scale-95 transition-transform">
                      {/* Layer Bawah (Bayangan/Depth) */}
                      <div className="absolute inset-0 bg-red-900 rounded-full translate-y-2" />
                      {/* Layer Atas (Main Body) yang bakal turun pas ditekan */}
                      <div className="relative bg-gradient-to-b from-red-400 to-red-600 border-2 border-red-900 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-4xl shadow-[inset_0_3px_5px_rgba(255,255,255,0.4)] group-active:translate-y-2 transition-transform duration-75">
                        🐛
                      </div>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Overlay Menu */}
        {phase !== "playing" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
            <div className="flex flex-col items-center text-center">
              {phase === "gameover" && (
                <div className="mb-8">
                  <h2 className="text-5xl font-black text-white mb-2">TIME'S UP!</h2>
                  <p className="text-xl text-slate-300">Lu berhasil ngebantai <span className="text-green-400 font-bold text-2xl">{score}</span> Bug!</p>
                </div>
              )}
              
              {/* TOMBOL START 3D TACTILE */}
              <button onClick={startGame} className="relative group w-64 focus:outline-none">
                <div className="absolute inset-0 bg-emerald-900 rounded-xl translate-y-2 group-active:translate-y-0 transition-transform duration-100" />
                <div className="relative bg-gradient-to-b from-emerald-400 to-emerald-600 border-2 border-emerald-950 p-5 rounded-xl flex justify-center text-xl font-black text-emerald-950 uppercase tracking-widest shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)] group-active:translate-y-2 transition-transform duration-100">
                  {phase === "start" ? "MULAI BANTAI" : "MAIN LAGI"}
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}