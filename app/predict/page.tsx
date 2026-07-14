"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const questions = [
  {
    key: "weapon",
    question: "Senjata andalan lo?",
    choices: ["⌨️ Keyboard mekanik", "🖱️ Mouse gaming", "☕ Kopi sachet", "📱 HP buat stackoverflow"],
  },
  {
    key: "hangout",
    question: "Tempat nongkrong?",
    choices: ["🏫 Lab komputer", "🍜 Warmindo deket sekolah", "🛋️ Kamar sendiri", "📚 Perpus"],
  },
  {
    key: "bug",
    question: "Kalo ketemu bug, lo ngapain?",
    choices: ["🔄 Restart aja dulu", "📋 Copy paste ke Google", "😤 Ngamuk sebentar", "🧘 Tarik napas, baca error-nya pelan-pelan"],
  },
];

type Result = {
  title: string;
  class: string;
  stats: { power: number; wisdom: number; chaos: number; vibes: number };
  special_skill: string;
  roast: string;
};

export default function PredictPage() {
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const allAnswered = name.trim() && answers.every((a) => a);

  const selectAnswer = (qIndex: number, choice: string) => {
    const next = [...answers];
    next[qIndex] = choice;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal generate");
      setResult(data);
      localStorage.setItem("stamp_predict", "true");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ada yang salah nih");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setName("");
    setAnswers(["", "", ""]);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <AnimatePresence mode="wait">
        {result ? (
          <ResultCard key="result" result={result} name={name} onReset={reset} />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold text-clay-ink mb-2">
                🔮 AI Prediksi Lo
              </h1>
              <p className="text-clay-ink/60">
                Jawab jujur, biar hasilnya makin nyeleneh
              </p>
            </div>

            <div className="clay-surface p-6 mb-6">
              <label className="block text-sm font-semibold text-clay-ink/70 mb-2">
                Nama lo siapa?
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tulis nama lo di sini..."
                className="w-full px-5 py-3 rounded-clay bg-white/70 shadow-clay-pressed text-clay-ink placeholder:text-clay-ink/40 outline-none focus:ring-2 focus:ring-clay-lavender"
              />
            </div>

            {questions.map((q, qIndex) => (
              <div key={q.key} className="clay-surface p-6 mb-6">
                <p className="font-semibold text-clay-ink mb-4">{q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.choices.map((choice) => {
                    const isSelected = answers[qIndex] === choice;
                    return (
                      <motion.button
                        key={choice}
                        onClick={() => selectAnswer(qIndex, choice)}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.96 }}
                        className={`px-4 py-3 rounded-clay text-sm font-medium text-clay-ink transition-all ${
                          isSelected
                            ? "shadow-clay-pressed bg-clay-lavender/50"
                            : "shadow-clay-sm bg-white/60"
                        }`}
                      >
                        {choice}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-center text-red-500 text-sm mb-4">{error}</p>
            )}

            <div className="flex justify-center">
              <motion.button
                onClick={handleSubmit}
                disabled={!allAnswered || loading}
                whileHover={allAnswered ? { y: -4, scale: 1.03 } : {}}
                whileTap={allAnswered ? { scale: 0.95 } : {}}
                className={`clay-button px-10 py-4 text-lg font-bold rounded-clay-lg ${
                  allAnswered
                    ? "bg-clay-pink text-clay-ink cursor-pointer"
                    : "bg-clay-base text-clay-ink/40 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    AI lagi mikir... 🧠
                  </motion.span>
                ) : (
                  "✨ Generate Karakter Gw"
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ResultCard({
  result,
  name,
  onReset,
}: {
  result: Result;
  name: string;
  onReset: () => void;
}) {
  const stats = [
    { label: "Power", value: result.stats.power, emoji: "💪" },
    { label: "Wisdom", value: result.stats.wisdom, emoji: "🧠" },
    { label: "Chaos", value: result.stats.chaos, emoji: "🔥" },
    { label: "Vibes", value: result.stats.vibes, emoji: "✨" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className="w-full max-w-md clay-surface p-8 rounded-clay-lg"
      style={{ backgroundColor: "#FFF3C9" }}
    >
      <div className="text-center mb-6">
        <p className="text-xs font-bold tracking-widest text-clay-ink/50 uppercase mb-1">
          Character Sheet
        </p>
        <h2 className="text-2xl font-extrabold text-clay-ink">{name}</h2>
        <p className="text-clay-ink/70 font-medium">{result.class}</p>
        <div className="mt-3 inline-block px-4 py-1.5 rounded-clay bg-white/50 shadow-clay-sm text-sm font-semibold text-clay-ink">
          {result.title}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="bg-white/50 rounded-clay p-3 shadow-clay-sm"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-clay-ink/70">
                {s.emoji} {s.label}
              </span>
              <span className="text-xs font-bold text-clay-ink">{s.value}</span>
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.value}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                className="h-full bg-clay-ink/70 rounded-full"
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white/50 rounded-clay p-4 mb-4 shadow-clay-sm">
        <p className="text-xs font-bold text-clay-ink/50 uppercase mb-1">
          Special Skill
        </p>
        <p className="text-sm font-semibold text-clay-ink">
          ⚔️ {result.special_skill}
        </p>
      </div>

      <div className="bg-white/50 rounded-clay p-4 mb-6 shadow-clay-sm">
        <p className="text-xs font-bold text-clay-ink/50 uppercase mb-1">
          Roast
        </p>
        <p className="text-sm text-clay-ink/80 italic">"{result.roast}"</p>
      </div>

      <motion.button
        onClick={onReset}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.95 }}
        className="w-full clay-button py-3 rounded-clay bg-white/60 text-sm font-semibold text-clay-ink"
      >
        🔄 Coba Lagi
      </motion.button>
    </motion.div>
  );
}