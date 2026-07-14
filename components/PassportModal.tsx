"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PassportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [stamps, setStamps] = useState({
    filter: false,
    predict: false,
    nosebird: false,
    scream: false,
  });

  // Efek ini jalan otomatis tiap kali modal dibuka buat ngecek stempel di browser
  useEffect(() => {
    if (isOpen) {
      setStamps({
        filter: localStorage.getItem("stamp_filter") === "true",
        predict: localStorage.getItem("stamp_predict") === "true",
        nosebird: localStorage.getItem("stamp_nosebird") === "true",
        scream: localStorage.getItem("stamp_scream") === "true",
      });
    }
  }, [isOpen]);

  const totalStamps = Object.values(stamps).filter(Boolean).length;
  const isComplete = totalStamps === 4;

  return (
    <>
      {/* Tombol Floating di pojok kanan atas */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ y: -3, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-6 right-6 z-40 clay-surface px-4 py-3 rounded-[var(--radius-clay)] shadow-[var(--shadow-clay-sm)] flex items-center gap-2 font-bold text-clay-ink"
      >
        <span className="text-xl">🎫</span>
        <span className="hidden md:inline">My Passport</span>
        {totalStamps > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-bounce">
            {totalStamps}/4
          </span>
        )}
      </motion.button>

      {/* Modal Popup */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-clay-ink/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="relative w-full max-w-md bg-[var(--color-clay-glass)] p-8 rounded-[var(--radius-clay-lg)] shadow-[var(--shadow-clay-lg)] flex flex-col items-center text-center"
            >
              {/* Tombol Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/50 rounded-full font-bold text-clay-ink shadow-sm hover:bg-white"
              >
                ✕
              </button>

              <h2 className="text-3xl font-extrabold text-clay-ink mb-2">
                DTP Passport 📖
              </h2>
              <p className="text-clay-ink/70 mb-6 text-sm font-medium">
                Mainin semua gamenya buat ngumpulin stempel rahasia!
              </p>

              {/* Grid Stempel */}
              <div className="grid grid-cols-2 gap-4 w-full mb-6">
                <StampSlot name="Face Filter" icon="🎭" isActive={stamps.filter} />
                <StampSlot name="AI Prediksi" icon="🔮" isActive={stamps.predict} />
                <StampSlot name="Nose Bird" icon="🐤" isActive={stamps.nosebird} />
                <StampSlot name="Scream Meter" icon="🤬" isActive={stamps.scream} />
              </div>

              {/* Pesan Hadiah (Kalo Penuh) */}
              {isComplete ? (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-full bg-[var(--color-clay-butter)] p-4 rounded-[var(--radius-clay)] shadow-[var(--shadow-clay-btn)]"
                >
                  <p className="font-extrabold text-lg text-clay-ink mb-1">🎉 MISI SELESAI! 🎉</p>
                  <p className="text-sm font-medium opacity-80">
                    Tunjukin layar ini ke panitia buat ambil hadiah lo sekarang!
                  </p>
                </motion.div>
              ) : (
                <div className="w-full bg-[var(--color-clay-base)] p-4 rounded-[var(--radius-clay)] shadow-inner">
                  <p className="font-bold text-clay-ink/50">
                    Kurang {4 - totalStamps} stempel lagi nih broskie!
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Sub-komponen buat kotak stempelnya
function StampSlot({ name, icon, isActive }: { name: string; icon: string; isActive: boolean }) {
  return (
    <div
      className={`relative h-28 rounded-[var(--radius-clay)] border-4 flex flex-col items-center justify-center p-2 transition-all ${
        isActive
          ? "border-[var(--color-clay-mint)] bg-white/70 shadow-[var(--shadow-clay-sm)]"
          : "border-white/40 bg-white/20 border-dashed"
      }`}
    >
      <span className={`text-3xl mb-1 ${!isActive && "opacity-30 grayscale"}`}>{icon}</span>
      <span className={`text-xs font-bold text-center ${!isActive ? "text-clay-ink/40" : "text-clay-ink"}`}>
        {name}
      </span>
      
      {/* Animasi Cap Stempel kalo udah aktif */}
      {isActive && (
        <motion.div
          initial={{ scale: 3, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: -10 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="text-6xl drop-shadow-md">✅</span>
        </motion.div>
      )}
    </div>
  );
}