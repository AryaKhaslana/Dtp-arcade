"use client";

import { motion } from "framer-motion";

const cardVariants = {
  rest: { y: 0, rotate: 0 },
  hover: {
    y: -12,
    rotate: -1,
    transition: { type: "spring", stiffness: 300, damping: 15 },
  },
  tap: {
    y: 4,
    scale: 0.96,
    rotate: 0,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
};

const floatVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
      {/* Floating title */}
      <motion.div
        variants={floatVariants}
        animate="animate"
        className="text-center mb-16"
      >
        <div className="inline-block clay-surface px-8 py-4 rounded-clay-lg mb-4">
          <span className="text-sm font-medium tracking-widest text-clay-ink/60 uppercase">
            DTP Programmer Presents
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-clay-ink drop-shadow-sm">
          Welcome to{" "}
          <span className="relative inline-block">
            The Arcade
            <span className="absolute -top-2 -right-8 text-3xl rotate-12">✨</span>
          </span>
        </h1>
        <p className="mt-4 text-clay-ink/60 text-lg">
          Pilih pengalaman, terus rasain sendiri serunya
        </p>
      </motion.div>

      {/* Cards */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-10 w-full max-w-4xl justify-center items-stretch">
        {/* Card A - Live Face Filter */}
        <motion.button
          variants={cardVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          className="group relative flex-1 rounded-clay-lg p-10 flex flex-col items-center justify-center gap-4 min-h-[280px] cursor-pointer select-none active:shadow-clay-pressed"
          style={{ backgroundColor: "#CFEEFB" }}
        >
          <motion.div
            className="text-7xl"
            variants={{
              rest: { scale: 1, rotate: 0 },
              hover: { scale: 1.15, rotate: [0, -8, 8, 0] },
            }}
            transition={{ duration: 0.6 }}
          >
            🎭
          </motion.div>
          <h2 className="text-2xl font-bold text-clay-ink text-center">
            Live Face Filter
          </h2>
          <p className="text-clay-ink/60 text-center text-sm">
            Liat muka lo berubah lucu, real-time!
          </p>
          <span className="mt-2 clay-button inline-block px-6 py-2 text-sm font-semibold text-clay-ink bg-white/60 rounded-clay">
            Coba Sekarang →
          </span>
        </motion.button>

        {/* Card B - AI Prediksi Lo */}
        <motion.button
          variants={cardVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          className="group relative flex-1 rounded-clay-lg p-10 flex flex-col items-center justify-center gap-4 min-h-[280px] cursor-pointer select-none active:shadow-clay-pressed"
          style={{ backgroundColor: "#FFD6E0" }}
        >
          <motion.div
            className="text-7xl"
            variants={{
              rest: { scale: 1, rotate: 0 },
              hover: { scale: 1.15, rotate: [0, -8, 8, 0] },
            }}
            transition={{ duration: 0.6 }}
          >
            🔮
          </motion.div>
          <h2 className="text-2xl font-bold text-clay-ink text-center">
            AI Prediksi Lo
          </h2>
          <p className="text-clay-ink/60 text-center text-sm">
            Biar AI tebak siapa diri lo sebenernya
          </p>
          <span className="mt-2 clay-button inline-block px-6 py-2 text-sm font-semibold text-clay-ink bg-white/60 rounded-clay">
            Ramal Sekarang →
          </span>
        </motion.button>
      </div>

      {/* Ambient decorative blobs */}
      <div className="fixed -z-10 top-20 left-10 w-40 h-40 rounded-full bg-clay-mint-soft/50 blur-3xl" />
      <div className="fixed -z-10 bottom-20 right-10 w-52 h-52 rounded-full bg-clay-pink-soft/50 blur-3xl" />
    </main>
  );
}