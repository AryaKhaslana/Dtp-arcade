"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Gw langsung bikin lowercase semua di sini biar gampang dicocokin
const KONAMI_SEQUENCE = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

export default function KonamiCode() {
  const [isHacked, setIsHacked] = useState(false);
  
  // Pake useRef biar ngelacak ketikannya INSTAN, ngetik secepet kilat pun tetep kebaca!
  const seqIndex = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Kalo udah kena hack, abaikan pencetan lain (kecuali Esc buat nutup)
      if (isHacked) {
        if (e.key === "Escape") setIsHacked(false);
        return;
      }

      const key = e.key.toLowerCase();
      const expectedKey = KONAMI_SEQUENCE[seqIndex.current];

      if (key === expectedKey) {
        seqIndex.current += 1; // Lanjut ke urutan berikutnya
        
        // Kalo udah nyampe ujung kode (10 pencetan)
        if (seqIndex.current === KONAMI_SEQUENCE.length) {
          setIsHacked(true); // TRIGGER HACKER MODE!
          seqIndex.current = 0; // Reset buat next time
        }
      } else {
        // Kalo salah pencet, reset dari nol
        seqIndex.current = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHacked]); // Cuma nge-rebind kalo status hack berubah

  return (
    <AnimatePresence>
      {isHacked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1 } }}
          className="fixed inset-0 z-[9999] bg-black text-green-500 font-mono flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Efek Garis Scan CRT (Makin kerasa jadulnya) */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none" />
          
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="text-center z-10"
          >
            <h1 className="text-6xl md:text-8xl font-black mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]">
              SYSTEM OVERRIDE
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Welcome back, Sepuh Backend. Security bypassed.
            </p>
            
            <div className="text-left bg-green-900/20 p-6 rounded border border-green-500/50 inline-block max-w-lg">
              <p>➜ ROOT ACCESS GRANTED</p>
              <p>➜ INITIALIZING DTP PROTOCOL...</p>
              <p>➜ ALL GAMES UNLOCKED</p>
              <p className="mt-4 text-green-400/70 text-sm">
                (Tekan ESC buat balik ke mode aman)
              </p>
            </div>
          </motion.div>
          
          {/* Animasi tulisan ngacak di background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-wrap gap-2 p-4 overflow-hidden break-words text-xs">
            {Array.from({ length: 500 }).map((_, i) => (
              <span key={i}>{Math.random() > 0.5 ? "1" : "0"}</span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}