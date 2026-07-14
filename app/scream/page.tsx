"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function ScreamMeterPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"start" | "ready" | "screaming" | "result">("start");
  const [maxVolume, setMaxVolume] = useState(0);
  const [currentVol, setCurrentVol] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafId = useRef<number | null>(null);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      setPhase("ready");
    } catch (err) {
      alert("Mic lu error broskie, cek permission ya!");
    }
  };

  const startScreaming = () => {
    setPhase("screaming");
    setMaxVolume(0);
    setTimeLeft(5);

    const trackVolume = () => {
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const norm = (dataArrayRef.current[i] - 128) / 128;
          sum += norm * norm;
        }
        const rms = Math.sqrt(sum / dataArrayRef.current.length);
        const volume = Math.min(100, Math.floor((rms / 0.5) * 100)); // Konversi ke %
        
        setCurrentVol(volume);
        setMaxVolume((prev) => Math.max(prev, volume));
      }
      rafId.current = requestAnimationFrame(trackVolume);
    };
    trackVolume();

    // Timer mundur 5 detik
    let timer = 5;
    const interval = setInterval(() => {
      timer -= 1;
      setTimeLeft(timer);
      if (timer <= 0) {
        clearInterval(interval);
        if (rafId.current) cancelAnimationFrame(rafId.current);
        setPhase("result");
        localStorage.setItem("stamp_scream", "true");
      }
    }, 1000);
  };

  const getRank = (vol: number) => {
    if (vol > 90) return { title: "SEPUH SERVER 👑", desc: "Teriakan lu ngerusak database sekolah!" };
    if (vol > 70) return { title: "SENIOR DEVOPS 🚀", desc: "Lumayan bikin bug pada kabur." };
    if (vol > 40) return { title: "JUNIOR CODER 💻", desc: "Masih malu-malu, kurang stress nih keknya." };
    return { title: "ANAK MAGANG 👶", desc: "Suara lu kelelep sama suara kipas laptop." };
  };

  const stopMic = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-clay-ink bg-[var(--color-clay-base)]">
      <motion.button onClick={() => { stopMic(); router.push("/"); }} className="fixed top-6 left-6 w-12 h-12 rounded-full clay-surface flex items-center justify-center shadow-[var(--shadow-clay-sm)]">←</motion.button>
      
      <div className="w-full max-w-lg clay-surface p-10 rounded-[var(--radius-clay-lg)] text-center flex flex-col items-center gap-6">
        <h1 className="text-4xl font-extrabold">🤬 Rage Meter</h1>
        
        {phase === "start" && (
          <>
            <p className="opacity-70">Stress ngerjain project? Teriak sekencengnya di sini dan liat seberapa gede power lu!</p>
            <button onClick={startMic} className="clay-button bg-[var(--color-clay-pink)] px-8 py-3 text-lg font-bold">Nyalain Mic 🎙️</button>
          </>
        )}

        {phase === "ready" && (
          <>
            <p className="opacity-70">Tarik napas panjang... siapin pita suara lu!</p>
            <button onClick={startScreaming} className="clay-button bg-[var(--color-clay-butter)] px-8 py-3 text-lg font-bold">MULAI TERIAK!</button>
          </>
        )}

        {phase === "screaming" && (
          <div className="w-full flex flex-col items-center gap-4">
            <h2 className="text-6xl font-black text-red-500 animate-pulse">{timeLeft}s</h2>
            <div className="w-full h-12 bg-white/50 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-[var(--color-clay-pink)] transition-all duration-75" style={{ width: `${currentVol}%` }} />
            </div>
            <p className="font-bold text-2xl">Power: {currentVol}%</p>
          </div>
        )}

        {phase === "result" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col gap-4 items-center">
            <p className="text-xl font-bold">Max Power: {maxVolume}%</p>
            <div className="bg-[var(--color-clay-glass)] p-6 rounded-[var(--radius-clay)] shadow-[var(--shadow-clay-pressed)] w-full">
              <h2 className="text-3xl font-black mb-2 text-[var(--color-clay-mint-dark)]">{getRank(maxVolume).title}</h2>
              <p className="opacity-80">{getRank(maxVolume).desc}</p>
            </div>
            <button onClick={() => setPhase("ready")} className="mt-4 clay-button bg-[var(--color-clay-sky)] px-6 py-2 font-bold">Ulangi 🔄</button>
          </motion.div>
        )}
      </div>
    </main>
  );
}