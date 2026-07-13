"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const cardVariants = {
  rest: { y: 0, rotate: 0 },
  hover: { y: -12, rotate: -1, transition: { type: "spring", stiffness: 300, damping: 15 } },
  tap: { y: 4, scale: 0.96, rotate: 0, transition: { type: "spring", stiffness: 400, damping: 20 } },
};

const floatingDeco = (duration: number, delay: number) => ({
  animate: {
    y: [0, -20, 0], x: [0, 10, 0], rotate: [0, 10, -10, 0],
    transition: { duration, delay, repeat: Infinity, ease: "easeInOut" },
  },
});

export default function Home() {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    setTimeout(() => router.push(path), 300);
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-x-hidden text-clay-ink">
      
      {/* --- BACKGROUND DECORATIONS --- */}
      <motion.div variants={floatingDeco(5, 0)} animate="animate" className="absolute top-24 left-10 md:left-32 text-6xl opacity-40 blur-[2px] select-none -z-10">🎮</motion.div>
      <motion.div variants={floatingDeco(6, 1)} animate="animate" className="absolute top-40 right-10 md:right-32 text-5xl opacity-30 blur-[1px] select-none -z-10">👾</motion.div>
      <motion.div variants={floatingDeco(7, 2)} animate="animate" className="absolute bottom-[20%] left-12 md:left-40 text-7xl opacity-30 blur-[3px] select-none -z-10">🚀</motion.div>
      <motion.div variants={floatingDeco(4, 0.5)} animate="animate" className="absolute bottom-[10%] right-16 md:right-48 text-6xl opacity-40 blur-[2px] select-none -z-10">💻</motion.div>

      {/* Ambient blobs */}
      <div className="fixed -z-20 top-20 left-10 w-40 h-40 rounded-full bg-[var(--color-clay-mint-soft)]/50 blur-3xl" />
      <div className="fixed -z-20 bottom-20 right-10 w-52 h-52 rounded-full bg-[var(--color-clay-pink-soft)]/50 blur-3xl" />

      {/* ================= SECTION 1: HERO / THE ARCADE ================= */}
      <section className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16 relative z-10"
        >
          <div className="inline-block clay-surface px-8 py-4 rounded-[var(--radius-clay-lg)] mb-4 shadow-[var(--shadow-clay-sm)]">
            <span className="text-sm font-bold tracking-widest text-clay-ink/70 uppercase">
              DTP Programmer Presents
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold drop-shadow-sm mt-4">
            Welcome to{" "}
            <span className="relative inline-block">
              The Arcade
              <span className="absolute -top-2 -right-8 text-3xl rotate-12">✨</span>
            </span>
          </h1>
          <p className="mt-6 text-clay-ink/70 text-lg md:text-xl max-w-lg mx-auto font-medium">
            Project seru-seruan anak IT! Pilih pengalaman lo di bawah.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-10 w-full max-w-4xl justify-center items-stretch relative z-10">
          <motion.button
            onClick={() => handleNavigate('/filter')}
            variants={cardVariants} initial="rest" whileHover="hover" whileTap="tap"
            className="group relative flex-1 p-10 flex flex-col items-center justify-center gap-4 min-h-[280px] cursor-pointer select-none rounded-[var(--radius-clay-lg)] shadow-[var(--shadow-clay)] active:shadow-[var(--shadow-clay-pressed)]"
            style={{ backgroundColor: "var(--color-clay-sky-soft)" }}
          >
            <motion.div className="text-7xl" variants={{ rest: { scale: 1 }, hover: { scale: 1.15, rotate: [0, -8, 8, 0] } }}>🎭</motion.div>
            <h2 className="text-2xl font-bold">Live Face Filter</h2>
            <p className="opacity-70 text-center text-sm">Liat muka lo berubah lucu pake AR, real-time!</p>
            <span className="mt-2 inline-block px-6 py-3 text-sm font-bold bg-white/70 rounded-[var(--radius-clay)] shadow-[var(--shadow-clay-btn)]">Coba Sekarang →</span>
          </motion.button>

          <motion.button
            onClick={() => handleNavigate('/predict')}
            variants={cardVariants} initial="rest" whileHover="hover" whileTap="tap"
            className="group relative flex-1 p-10 flex flex-col items-center justify-center gap-4 min-h-[280px] cursor-pointer select-none rounded-[var(--radius-clay-lg)] shadow-[var(--shadow-clay)] active:shadow-[var(--shadow-clay-pressed)]"
            style={{ backgroundColor: "var(--color-clay-pink-soft)" }}
          >
            <motion.div className="text-7xl" variants={{ rest: { scale: 1 }, hover: { scale: 1.15, rotate: [0, -8, 8, 0] } }}>🔮</motion.div>
            <h2 className="text-2xl font-bold">AI Prediksi Lo</h2>
            <p className="opacity-70 text-center text-sm">Biar AI tebak siapa diri lo sebenernya & stats RPG lo!</p>
            <span className="mt-2 inline-block px-6 py-3 text-sm font-bold bg-white/70 rounded-[var(--radius-clay)] shadow-[var(--shadow-clay-btn)]">Ramal Sekarang →</span>
          </motion.button>
        </div>
        
        {/* Scroll down indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="mt-20 opacity-50 text-2xl"
        >
          👇
        </motion.div>
      </section>

      {/* ================= SECTION 2: ABOUT ================= */}
      <section className="min-h-[60vh] w-full max-w-5xl px-6 py-20 flex flex-col md:flex-row items-center gap-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }}
          className="flex-1 w-full rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-glass)] p-10 shadow-[var(--shadow-clay-lg)]"
        >
          <h2 className="text-4xl font-extrabold mb-6">Apaan Sih Ini? 🤔</h2>
          <p className="text-lg opacity-80 leading-relaxed mb-4">
            Ini adalah *showcase* project DTP dari tim Programmer. Kita gabungin teknologi <strong>Artificial Intelligence (LLM)</strong> sama <strong>Augmented Reality (AR)</strong> langsung di browser lo!
          </p>
          <p className="text-lg opacity-80 leading-relaxed">
            Gak perlu install apa-apa. Tinggal klik, nyalain kamera, atau jawab pertanyaan kuisnya. Semuanya di-*handle* pake framework modern biar cepet dan mulus.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }}
          className="flex-1 w-full flex justify-center"
        >
          <div className="w-64 h-64 rounded-full bg-[var(--color-clay-butter)] shadow-[var(--shadow-clay-lg)] flex items-center justify-center text-8xl">
            👨‍💻
          </div>
        </motion.div>
      </section>

      {/* ================= SECTION 3: HALL OF FAME ================= */}
      <section className="min-h-[70vh] w-full px-6 py-20 flex flex-col items-center relative z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-4xl font-extrabold mb-12 text-center"
        >
          🏆 Hall of Fame
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {/* Card Juara 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="p-8 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-mint-soft)] shadow-[var(--shadow-clay)] flex flex-col items-center text-center"
          >
            <div className="text-5xl mb-4">🥇</div>
            <h3 className="text-xl font-bold mb-2">Lord of The Bug</h3>
            <p className="opacity-70 text-sm">"Tiap ngetik, error nambah."</p>
            <div className="mt-4 px-4 py-1 bg-white/50 rounded-full text-xs font-bold shadow-[var(--shadow-clay-sm)]">Chaos: 99</div>
          </motion.div>

          {/* Card Juara 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="p-8 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-lavender)] shadow-[var(--shadow-clay)] flex flex-col items-center text-center"
          >
            <div className="text-5xl mb-4">🥈</div>
            <h3 className="text-xl font-bold mb-2">Master Copas</h3>
            <p className="opacity-70 text-sm">"StackOverflow adalah jalan ninjaku."</p>
            <div className="mt-4 px-4 py-1 bg-white/50 rounded-full text-xs font-bold shadow-[var(--shadow-clay-sm)]">Wisdom: 85</div>
          </motion.div>

          {/* Card Juara 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="p-8 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-butter-soft)] shadow-[var(--shadow-clay)] flex flex-col items-center text-center"
          >
            <div className="text-5xl mb-4">🥉</div>
            <h3 className="text-xl font-bold mb-2">Si Paling Ngopi</h3>
            <p className="opacity-70 text-sm">"Coding 5 menit, ngopi 2 jam."</p>
            <div className="mt-4 px-4 py-1 bg-white/50 rounded-full text-xs font-bold shadow-[var(--shadow-clay-sm)]">Vibes: 100</div>
          </motion.div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="w-full py-10 mt-auto text-center opacity-60 text-sm font-medium">
        <p>Built with ☕ and 🐛 by DTP Programmer</p>
        <p className="mt-1">Powered by Next.js & Framer Motion</p>
      </footer>

    </main>
  );
}