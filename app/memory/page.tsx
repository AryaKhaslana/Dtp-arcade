"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type Color = "cyan" | "magenta" | "yellow" | "emerald";

const BUTTONS: { id: Color; colorClass: string; activeClass: string; shadowClass: string; emoji: string }[] = [
  { id: "cyan", colorClass: "from-cyan-400 to-cyan-600 border-cyan-950", activeClass: "from-cyan-300 to-cyan-500", shadowClass: "bg-cyan-900", emoji: "🩵" },
  { id: "magenta", colorClass: "from-pink-400 to-pink-600 border-pink-950", activeClass: "from-pink-300 to-pink-500", shadowClass: "bg-pink-900", emoji: "🩷" },
  { id: "yellow", colorClass: "from-yellow-400 to-yellow-600 border-yellow-950", activeClass: "from-yellow-300 to-yellow-500", shadowClass: "bg-yellow-900", emoji: "💛" },
  { id: "emerald", colorClass: "from-emerald-400 to-emerald-600 border-emerald-950", activeClass: "from-emerald-300 to-emerald-500", shadowClass: "bg-emerald-900", emoji: "💚" },
];

export default function MemoryLeakGame() {
  const router = useRouter();
  const [phase, setPhase] = useState<"start" | "bot" | "player" | "gameover">("start");
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerSequence, setPlayerSequence] = useState<Color[]>([]);
  const [activeBtn, setActiveBtn] = useState<Color | null>(null);
  const [score, setScore] = useState(0);

  const isProcessingRef = useRef(false);

  const startGame = () => {
    setScore(0);
    const firstColor = BUTTONS[Math.floor(Math.random() * 4)].id;
    setSequence([firstColor]);
    setPlayerSequence([]);
    setPhase("bot");
  };

  useEffect(() => {
    if (phase !== "bot" || sequence.length === 0 || isProcessingRef.current) return;

    isProcessingRef.current = true;
    let i = 0;

    const playNext = () => {
      if (i < sequence.length) {
        setActiveBtn(sequence[i]);
        setTimeout(() => {
          setActiveBtn(null);
          i++;
          setTimeout(playNext, 300);
        }, 600);
      } else {
        isProcessingRef.current = false;
        setPlayerSequence([]);
        setPhase("player");
      }
    };

    setTimeout(playNext, 500);
  }, [phase, sequence]);

  const handleBtnPress = (color: Color) => {
    if (phase !== "player" || isProcessingRef.current) return;

    setActiveBtn(color);
    setTimeout(() => setActiveBtn(null), 150);

    const nextPlayerSeq = [...playerSequence, color];
    setPlayerSequence(nextPlayerSeq);

    const currentCheckIndex = nextPlayerSeq.length - 1;
    if (color !== sequence[currentCheckIndex]) {
      // Bocor! Game Over
      localStorage.setItem("stamp_memory", "true"); // Kasih stempel passport bonus!
      setPhase("gameover");
      return;
    }

    if (nextPlayerSeq.length === sequence.length) {
      setScore(sequence.length);
      // Lanjut level berikutnya
      const nextColor = BUTTONS[Math.floor(Math.random() * 4)].id;
      setTimeout(() => {
        setSequence((prev) => [...prev, nextColor]);
        setPhase("bot");
      }, 800);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-mono text-slate-100 relative">
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(slate-700 1px, transparent 1px), linear-gradient(90deg, slate-700 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <button onClick={() => router.push("/")} className="fixed top-6 left-6 text-2xl z-50 p-2 hover:bg-slate-900 rounded-lg">⬅️</button>

      <div className="z-10 w-full max-w-md flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 drop-shadow-[0_4px_0_rgba(0,100,200,1)]">
            MEMORY LEAK
          </h1>
          <p className="mt-2 text-slate-400 font-bold">Ikutin polanya, jangan biarkan RAM lu bocor!</p>
        </div>

        {/* Score Board 3D */}
        <div className="relative w-full">
          <div className="absolute inset-0 bg-indigo-950 rounded-xl translate-y-1.5" />
          <div className="relative bg-slate-900 border-2 border-indigo-500 p-4 rounded-xl flex justify-between items-center px-6">
            <span className="text-sm text-indigo-400 font-bold">STATUS: {phase === "bot" ? "🤖 AI MEMUTAR..." : "🫵 GILIARAN LU!"}</span>
            <span className="text-xl font-black text-white">SCORE: {score}</span>
          </div>
        </div>

        {/* 2x2 Grid Pad Tactile */}
        <div className="grid grid-cols-2 gap-6 w-full aspect-square bg-slate-900 p-6 rounded-2xl border-4 border-slate-950 shadow-[0_10px_0_#020617]">
          {BUTTONS.map((btn) => {
            const isLit = activeBtn === btn.id;
            return (
              <button
                key={btn.id}
                disabled={phase !== "player"}
                onMouseDown={() => handleBtnPress(btn.id)}
                className="relative w-full h-full focus:outline-none group active:scale-95 transition-transform"
              >
                {/* Shadow Layer */}
                <div className={`absolute inset-0 rounded-2xl translate-y-3 ${btn.shadowClass}`} />
                {/* Main Button Layer */}
                <div className={`relative h-full w-full bg-gradient-to-b border-4 rounded-2xl flex items-center justify-center text-4xl shadow-[inset_0_4px_4px_rgba(255,255,255,0.3)] transition-all duration-75 ${
                  isLit ? `${btn.activeClass} translate-y-3 shadow-none` : `${btn.colorClass} group-active:translate-y-3`
                }`}>
                  <span className={isLit ? "scale-125 animate-ping opacity-70" : ""}>{btn.emoji}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Start / Gameover Overlays */}
        {phase !== "bot" && phase !== "player" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
            <div className="flex flex-col items-center text-center">
              {phase === "gameover" && (
                <div className="mb-8 animate-bounce">
                  <h2 className="text-5xl font-black text-red-500 drop-shadow-[0_3px_0_#500]">RAM LEAKED!</h2>
                  <p className="text-lg text-slate-300 mt-2">Lu bertahan sampai urutan ke- <span className="text-cyan-400 font-bold text-2xl">{score}</span></p>
                </div>
              )}
              <button onClick={startGame} className="relative group w-64 focus:outline-none">
                <div className="absolute inset-0 bg-cyan-900 rounded-xl translate-y-2 group-active:translate-y-0 transition-transform duration-100" />
                <div className="relative bg-gradient-to-b from-cyan-400 to-cyan-600 border-2 border-cyan-950 p-5 rounded-xl flex justify-center text-xl font-black text-cyan-950 uppercase tracking-widest shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)] group-active:translate-y-2 transition-transform duration-100">
                  {phase === "start" ? "INITIALIZE SYSTEM" : "REBOOT SYSTEM"}
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}