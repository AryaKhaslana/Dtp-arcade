"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import ConfettiLayer, { ConfettiHandle } from "@/components/ConfettiLayer";
import { unlockAudio, playHover } from "@/lib/sound";

const cardVariants = {
  rest: { y: 0, rotate: 0 },
  hover: { y: -12, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 15 } },
  tap: { y: 4, scale: 0.96, rotate: 0, transition: { type: "spring", stiffness: 400, damping: 20 } },
};

const floatingDeco = (duration: number, delay: number) => ({
  animate: {
    y: [0, -20, 0], 
    x: [0, 10, 0], 
    rotate: [0, 10, -10, 0],
    // FIX-NYA DI SINI: Tambahin 'as const' di ujung ease
    transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
  },
});

type Experience = {
  title: string;
  desc: string;
  emoji: string;
  color: string;
  href: string;
  external?: boolean;
  badge?: string;
  credit?: string;
  rotate?: number;
};

const experiences: Experience[] = [
  {
    title: "Live Face Filter",
    desc: "Liat muka lo berubah lucu pake AR, real-time!",
    emoji: "🎭",
    color: "var(--color-clay-sky-soft)",
    href: "/filter",
    rotate: -1.5,
  },
  {
    title: "AI Prediksi Lo",
    desc: "Biar AI tebak siapa diri lo sebenernya & stats RPG lo!",
    emoji: "🔮",
    color: "var(--color-clay-pink-soft)",
    href: "/predict",
    badge: "BARU!",
    rotate: 1.5,
  },
  {
    title: "Nose Bird",
    desc: "Naik turunin kepala lo buat gerakin burungnya!",
    emoji: "🐤",
    color: "var(--color-clay-mint-soft)",
    href: "/nose-game",
    badge: "BARU!",
    rotate: -1,
  },
  {
    title: "Scream Game",
    desc: "Teriak sekuat tenaga dan liat seberapa gede power lu!",
    emoji: "🤬",
    color: "var(--color-clay-butter-soft)",
    href: "/scream",
    rotate: 1,
  },
  {
    title: "Typing Game with theme zombie",
    desc: "Typing game, versi anak DTP. Dibikin sama Fatih!",
    emoji: "⌨️",
    color: "var(--color-clay-butter-soft)",
    href: "https://zombie-typing.vercel.app/",
    external: true,
    credit: "🔗 Dibuka di tab baru",
    rotate: 1,
  },
  {
    title: "Smasher Bug",
    desc: "Tes refleks lo! Klik bug sebelum dia kabur.",
    emoji: " 🐛",
    color: "var(--color-clay-sky)",
    href: "/smasher",
    rotate: -1.5,
  },
  {
    title: "Memory Leak",
    desc: "Tes ingatan lo! Ikutin urutan tombol yang nyala tanpa salah pencet.",
    emoji: "🧠",
    color: "var(--color-clay-sky)",
    href: "/memory",
    rotate: -1.5,
  },
];

function MarqueeLights() {
  const colors = [
    "var(--color-clay-pink)",
    "var(--color-clay-butter)",
    "var(--color-clay-mint)",
    "var(--color-clay-sky)",
    "var(--color-clay-lavender)",
  ];
  return (
    <div className="flex gap-3 justify-center mb-4">
      {colors.map((c, i) => (
        <motion.span
          key={i}
          className="w-3 h-3 rounded-full shadow-[var(--shadow-clay-sm)]"
          style={{ backgroundColor: c }}
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function ArcadeTicker() {
  const items = [
    "🕹️ THE ARCADE",
    "🎮 4 GAMES TERSEDIA",
    "🎟️ GRATIS BUAT DICOBA",
    "🏆 BIKIN DTP PROGRAMMER",
    "✨ TANPA INSTALL APA-APA",
  ];
  const looped = [...items, ...items, ...items];
  return (
    <div className="w-full overflow-hidden rounded-[var(--radius-clay)] shadow-[var(--shadow-clay-pressed)] bg-clay-ink py-3 mb-14">
      <div className="flex whitespace-nowrap animate-marquee w-max">
        {looped.map((item, i) => (
          <span key={i} className="mx-6 text-sm font-bold tracking-widest text-white/90 uppercase">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Sticker({ text, rotate = 8 }: { text: string; rotate?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: 0 }}
      animate={{ scale: 1, rotate }}
      transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.4 }}
      className="absolute -top-3 -right-3 z-20 px-3 py-1.5 rounded-full text-xs font-extrabold text-white shadow-[var(--shadow-clay-sm)]"
      style={{ backgroundColor: "var(--color-clay-pink)" }}
    >
      {text}
    </motion.div>
  );
}

export default function Home() {
  const router = useRouter();
  const confettiRef = useRef<ConfettiHandle>(null);

  useEffect(() => {
  const unlock = () => {
    unlockAudio();
    window.removeEventListener("pointerdown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  return () => window.removeEventListener("pointerdown", unlock);
}, []);

  const handleNavigate = (exp: Experience, e: React.MouseEvent) => {
  confettiRef.current?.burst(e.clientX, e.clientY);
  if (exp.external) {
    setTimeout(() => window.open(exp.href, "_blank", "noopener,noreferrer"), 150);
    return;
  }
  setTimeout(() => router.push(exp.href), 300);
};

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-x-hidden text-clay-ink">
       <ConfettiLayer ref={confettiRef} />
       
      {/* --- BACKGROUND DECORATIONS --- */}
      <motion.div variants={floatingDeco(5, 0)} animate="animate" className="absolute top-24 left-10 md:left-32 text-6xl opacity-40 blur-[2px] select-none -z-10">🎮</motion.div>
      <motion.div variants={floatingDeco(6, 1)} animate="animate" className="absolute top-40 right-10 md:right-32 text-5xl opacity-30 blur-[1px] select-none -z-10">👾</motion.div>
      <motion.div variants={floatingDeco(7, 2)} animate="animate" className="absolute bottom-[20%] left-12 md:left-40 text-7xl opacity-30 blur-[3px] select-none -z-10">🚀</motion.div>
      <motion.div variants={floatingDeco(4, 0.5)} animate="animate" className="absolute bottom-[10%] right-16 md:right-48 text-6xl opacity-40 blur-[2px] select-none -z-10">💻</motion.div>
      <motion.div variants={floatingDeco(5.5, 1.5)} animate="animate" className="absolute top-[15%] right-[15%] text-4xl opacity-30 select-none -z-10">🕹️</motion.div>
      <motion.div variants={floatingDeco(6.5, 0.8)} animate="animate" className="absolute top-[55%] left-[8%] text-4xl opacity-30 select-none -z-10">🎯</motion.div>
      <motion.div variants={floatingDeco(4.5, 2.2)} animate="animate" className="absolute bottom-[35%] right-[8%] text-5xl opacity-25 select-none -z-10">⭐</motion.div>

      {/* Ambient blobs */}
      <div className="fixed -z-20 top-20 left-10 w-40 h-40 rounded-full bg-[var(--color-clay-mint-soft)]/50 blur-3xl" />
      <div className="fixed -z-20 bottom-20 right-10 w-52 h-52 rounded-full bg-[var(--color-clay-pink-soft)]/50 blur-3xl" />
      <div className="fixed -z-20 top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[var(--color-clay-sky-soft)]/30 blur-3xl" />

      {/* ================= SECTION 1: HERO / THE ARCADE ================= */}
      <section className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-10 relative z-10"
        >
          <MarqueeLights />
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

        <div className="w-full max-w-3xl relative z-10">
          <ArcadeTicker />
        </div>

        {/* Cards - data driven grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-5xl relative z-10">
          {experiences.map((exp) => (
            <motion.button
              key={exp.title}
              onClick={(e) => handleNavigate(exp, e)}
              onHoverStart={() => playHover()}
              variants={cardVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              style={{ backgroundColor: exp.color, rotate: exp.rotate }}
              className="group relative p-8 md:p-10 flex flex-col items-center justify-center gap-3 min-h-[260px] cursor-pointer select-none rounded-[var(--radius-clay-lg)] shadow-[var(--shadow-clay)] active:shadow-[var(--shadow-clay-pressed)]"
            >
              {exp.badge && <Sticker text={exp.badge} />}
              <motion.div
                className="text-6xl md:text-7xl"
                variants={{ rest: { scale: 1 }, hover: { scale: 1.15, rotate: [0, -8, 8, 0] } }}
              >
                {exp.emoji}
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold text-center">{exp.title}</h2>
              <p className="opacity-70 text-center text-sm">{exp.desc}</p>
              {exp.credit && <p className="opacity-50 text-xs italic">{exp.credit}</p>}
              <span className="mt-2 inline-block px-6 py-3 text-sm font-bold bg-white/70 rounded-[var(--radius-clay)] shadow-[var(--shadow-clay-btn)]">
                {exp.external ? "Mainkan →" : "Coba Sekarang →"}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Scroll down indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mt-16 opacity-50 text-2xl"
        >
          👇
        </motion.div>
      </section>

      {/* ================= SECTION 2: STATS STRIP ================= */}
      <section className="w-full max-w-4xl px-6 pb-10 relative z-10">
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { label: "Games Tersedia", value: "4", emoji: "🎮" },
            { label: "Programmer", value: "9", emoji: "👨‍💻" },
            { label: "Hari Ngoding", value: "3", emoji: "⏱️" },
            { label: "Cup Kopi", value: "∞", emoji: "☕" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 px-5 py-3 rounded-[var(--radius-clay)] bg-[var(--color-clay-glass)] shadow-[var(--shadow-clay-sm)]"
            >
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="font-extrabold leading-none">{s.value}</p>
                <p className="text-xs opacity-60 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION 3: ABOUT ================= */}
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

      {/* ================= SECTION 4: HALL OF FAME ================= */}
      <section className="min-h-[70vh] w-full px-6 py-20 flex flex-col items-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-4xl font-extrabold mb-12 text-center"
        >
          🏆 Hall of Fame
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="p-8 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-mint-soft)] shadow-[var(--shadow-clay)] flex flex-col items-center text-center"
          >
            <div className="text-5xl mb-4">🥇</div>
            <h3 className="text-xl font-bold mb-2">Lord of The Bug</h3>
            <p className="opacity-70 text-sm">"Tiap ngetik, error nambah."</p>
            <div className="mt-4 px-4 py-1 bg-white/50 rounded-full text-xs font-bold shadow-[var(--shadow-clay-sm)]">Chaos: 99</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="p-8 rounded-[var(--radius-clay-lg)] bg-[var(--color-clay-lavender)] shadow-[var(--shadow-clay)] flex flex-col items-center text-center"
          >
            <div className="text-5xl mb-4">🥈</div>
            <h3 className="text-xl font-bold mb-2">Master Copas</h3>
            <p className="opacity-70 text-sm">"StackOverflow adalah jalan ninjaku."</p>
            <div className="mt-4 px-4 py-1 bg-white/50 rounded-full text-xs font-bold shadow-[var(--shadow-clay-sm)]">Wisdom: 85</div>
          </motion.div>

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
      <footer className="w-full py-10 mt-auto flex flex-col items-center gap-4 relative z-10">
        <div className="flex flex-wrap justify-center gap-2">
          {["Next.js", "Tailwind", "Framer Motion", "Gemini AI", "face-api.js"].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/60 shadow-[var(--shadow-clay-sm)] opacity-70"
            >
              {tech}
            </span>
          ))}
        </div>
        <div className="text-center opacity-60 text-sm font-medium">
          <p>Built with ☕ and 🐛 by DTP Programmer</p>
        </div>
      </footer>

    </main>
  );
}