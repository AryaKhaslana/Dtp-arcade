'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ---------- Config ----------
type LaneKey = 'D' | 'F' | 'J' | 'K';

const LANES: { key: LaneKey; name: string; bg: string; ring: string; text: string }[] = [
  { key: 'D', name: 'ungu', bg: '#DCD3F7', ring: '#8B6FE0', text: '#4B3B8F' },
  { key: 'F', name: 'pink', bg: '#FBD6E2', ring: '#F17FA6', text: '#9C3B5C' },
  { key: 'J', name: 'mint', bg: '#CDEFDA', ring: '#4FBE82', text: '#276B49' },
  { key: 'K', name: 'kuning', bg: '#FBEAB4', ring: '#E8B93A', text: '#8A6A16' },
];

const TRACK_HEIGHT = 520; // px, spawn(0) -> hitline(TRACK_HEIGHT)
const FALL_DURATION = 1500; // ms for a tile to travel the whole track
const PERFECT_WINDOW = 70; // ms
const GOOD_WINDOW = 150; // ms
const MISS_WINDOW = 230; // ms, beyond this tile is auto-missed
const GAME_DURATION = 60; // seconds
const MIN_SPAWN_MS = 340;
const MAX_SPAWN_MS = 720;

type Tile = {
  id: number;
  lane: LaneKey;
  spawnTime: number; // performance.now() at spawn
  judged: boolean;
  result?: 'perfect' | 'good' | 'miss';
};

type Popup = {
  id: number;
  lane: LaneKey;
  label: string;
  color: string;
  createdAt: number;
};

type Phase = 'idle' | 'playing' | 'ended';

let tileIdSeq = 0;
let popupIdSeq = 0;

export default function RhythmTapPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState({ perfect: 0, good: 0, miss: 0 });
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [now, setNow] = useState(0);
  const [pressed, setPressed] = useState<Record<LaneKey, boolean>>({
    D: false,
    F: false,
    J: false,
    K: false,
  });

  const tilesRef = useRef<Tile[]>([]);
  const popupsRef = useRef<Popup[]>([]);
  const nowRef = useRef(0);
  const startTimeRef = useRef(0);
  const nextSpawnAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const hitsRef = useRef({ perfect: 0, good: 0, miss: 0 });

  // ---------- Audio ----------
  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback(
    (freq: number, duration = 0.09, type: OscillatorType = 'sine', gain = 0.08) => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    },
    []
  );

  const laneFreq: Record<LaneKey, number> = { D: 392, F: 440, J: 523.25, K: 659.25 };

  // ---------- Spawning ----------
  const spawnTile = useCallback((now: number) => {
    const lane = LANES[Math.floor(Math.random() * LANES.length)].key;
    tilesRef.current.push({
      id: tileIdSeq++,
      lane,
      spawnTime: now,
      judged: false,
    });
  }, []);

  // ---------- Judging ----------
  const judgeLane = useCallback(
    (lane: LaneKey) => {
      if (phase !== 'playing') return;
      const now = nowRef.current;
      const targetTime = (t: Tile) => t.spawnTime + FALL_DURATION;

      let best: Tile | null = null;
      let bestDiff = Infinity;
      for (const t of tilesRef.current) {
        if (t.judged || t.lane !== lane) continue;
        const diff = Math.abs(now - targetTime(t));
        if (diff < bestDiff) {
          bestDiff = diff;
          best = t;
        }
      }

      if (best && bestDiff <= MISS_WINDOW) {
        best.judged = true;
        let result: 'perfect' | 'good' | 'miss';
        if (bestDiff <= PERFECT_WINDOW) result = 'perfect';
        else if (bestDiff <= GOOD_WINDOW) result = 'good';
        else result = 'miss';
        best.result = result;

        if (result === 'miss') {
          comboRef.current = 0;
          hitsRef.current = { ...hitsRef.current, miss: hitsRef.current.miss + 1 };
        } else {
          comboRef.current += 1;
          maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
          const multiplier = 1 + Math.floor(comboRef.current / 10) * 0.5;
          const base = result === 'perfect' ? 100 : 50;
          scoreRef.current += Math.round(base * multiplier);
          hitsRef.current = {
            ...hitsRef.current,
            [result]: hitsRef.current[result] + 1,
          };
          playTone(laneFreq[lane], result === 'perfect' ? 0.1 : 0.08, 'sine', result === 'perfect' ? 0.1 : 0.07);
        }

        const laneCfg = LANES.find((l) => l.key === lane)!;
        popupsRef.current.push({
          id: popupIdSeq++,
          lane,
          label: result === 'perfect' ? 'MANTAP!' : result === 'good' ? 'OKE' : 'MELESET',
          color: result === 'miss' ? '#D9534F' : laneCfg.ring,
          createdAt: now,
        });
      }

      setPressed((p) => ({ ...p, [lane]: true }));
      window.setTimeout(() => setPressed((p) => ({ ...p, [lane]: false })), 100);
    },
    [phase, playTone]
  );

  // ---------- Keyboard ----------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if (k === 'D' || k === 'F' || k === 'J' || k === 'K') {
        judgeLane(k as LaneKey);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [judgeLane]);

  // ---------- Main loop ----------
  useEffect(() => {
    if (phase !== 'playing') return;

    const loop = (t: number) => {
      nowRef.current = t;
      const elapsed = (t - startTimeRef.current) / 1000;
      const left = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(Math.ceil(left));

      // spawn
      if (t >= nextSpawnAtRef.current) {
        spawnTile(t);
        const progress = Math.min(1, elapsed / GAME_DURATION);
        const interval = MAX_SPAWN_MS - (MAX_SPAWN_MS - MIN_SPAWN_MS) * progress;
        nextSpawnAtRef.current = t + interval;
      }

      // auto-miss tiles that fell past the window
      for (const tile of tilesRef.current) {
        if (!tile.judged && t - (tile.spawnTime + FALL_DURATION) > MISS_WINDOW) {
          tile.judged = true;
          tile.result = 'miss';
          comboRef.current = 0;
          hitsRef.current = { ...hitsRef.current, miss: hitsRef.current.miss + 1 };
        }
      }

      // cleanup old tiles/popups
      tilesRef.current = tilesRef.current.filter(
        (tl) => t - tl.spawnTime < FALL_DURATION + 400
      );
      popupsRef.current = popupsRef.current.filter((p) => t - p.createdAt < 500);

      setScore(scoreRef.current);
      setCombo(comboRef.current);
      setMaxCombo(maxComboRef.current);
      setHits(hitsRef.current);
      setTiles([...tilesRef.current]);
      setPopups([...popupsRef.current]);
      setNow(t);

      if (left <= 0) {
        setPhase('ended');
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, spawnTile]);

  // ---------- Controls ----------
  const startGame = () => {
    ensureAudio();
    tilesRef.current = [];
    popupsRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    hitsRef.current = { perfect: 0, good: 0, miss: 0 };
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHits({ perfect: 0, good: 0, miss: 0 });
    setTimeLeft(GAME_DURATION);
    startTimeRef.current = performance.now();
    nextSpawnAtRef.current = startTimeRef.current + 400;
    setPhase('playing');
  };

  const totalJudged = hits.perfect + hits.good + hits.miss;
  const accuracy = totalJudged > 0 ? Math.round(((hits.perfect + hits.good) / totalJudged) * 100) : 0;
  const grade = accuracy >= 95 ? 'S' : accuracy >= 85 ? 'A' : accuracy >= 70 ? 'B' : accuracy >= 50 ? 'C' : 'D';

  return (
    <div className="min-h-screen bg-[#EFEDF5] flex flex-col items-center px-4 py-6 font-sans">
      <div className="w-full max-w-xl flex items-center justify-between mb-4">
        <Link
          href="/"
          className="text-sm font-semibold text-[#5B5470] bg-white/70 rounded-full px-4 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:bg-white transition"
        >
          ← Balik ke Arcade
        </Link>
        {phase === 'playing' && (
          <div className="flex gap-3 text-sm font-bold text-[#3D3653]">
            <span className="bg-white/80 rounded-full px-3 py-1.5 shadow-sm">⏱ {timeLeft}s</span>
            <span className="bg-white/80 rounded-full px-3 py-1.5 shadow-sm">✨ {score}</span>
            <span className="bg-white/80 rounded-full px-3 py-1.5 shadow-sm">🔥 {combo}x</span>
          </div>
        )}
      </div>

      <div className="w-full max-w-xl text-center mb-4">
        <h1 className="text-3xl font-black text-[#2E2A3F] tracking-tight">🎹 Rhythm Tap</h1>
        <p className="text-[#6B6480] text-sm mt-1">Pencet tombol pas kotaknya nyampe garis. Jangan meleset!</p>
      </div>

      {phase === 'idle' && (
        <div className="w-full max-w-xl bg-white rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-8 text-center">
          <div className="flex justify-center gap-3 mb-6">
            {LANES.map((l) => (
              <div
                key={l.key}
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner"
                style={{ background: l.bg, color: l.text }}
              >
                {l.key}
              </div>
            ))}
          </div>
          <p className="text-[#4B4560] text-sm leading-relaxed mb-6">
            Pake keyboard <b>D F J K</b> atau tap langsung kotak warnanya di layar (buat layar sentuh).
            Kotak jatuh dari atas — pencet pas dia nyentuh garis putih di bawah. Combo makin panjang,
            skor makin gede. Durasi <b>{GAME_DURATION} detik</b>, gas cari skor setinggi mungkin!
          </p>
          <button
            onClick={startGame}
            className="bg-[#2E2A3F] text-white font-bold rounded-full px-8 py-3 shadow-[0_6px_20px_rgba(46,42,63,0.35)] hover:scale-105 active:scale-95 transition"
          >
            Mulai ▶
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="w-full max-w-xl">
          <div
            className="relative w-full bg-white/60 rounded-[28px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            style={{ height: TRACK_HEIGHT + 40 }}
          >
            {/* lane dividers */}
            <div className="absolute inset-0 grid grid-cols-4">
              {LANES.map((l) => (
                <div key={l.key} className="border-r border-white/70 last:border-r-0" />
              ))}
            </div>

            {/* hit line */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-[#2E2A3F]/40"
              style={{ top: TRACK_HEIGHT }}
            />

            {/* tiles */}
            {tiles.map((tl) => {
              const laneIdx = LANES.findIndex((l) => l.key === tl.lane);
              const laneCfg = LANES[laneIdx];
              const progress = (now - tl.spawnTime) / FALL_DURATION;
              const top = Math.min(progress, 1.2) * TRACK_HEIGHT - 40;
              const opacity = tl.judged ? 0 : 1;
              return (
                <div
                  key={tl.id}
                  className="absolute h-10 rounded-xl shadow-md transition-opacity duration-150"
                  style={{
                    top,
                    left: `${laneIdx * 25}%`,
                    width: '25%',
                    padding: '0 6px',
                    opacity,
                  }}
                >
                  <div
                    className="w-full h-full rounded-xl"
                    style={{ background: laneCfg.bg, border: `2px solid ${laneCfg.ring}` }}
                  />
                </div>
              );
            })}

            {/* popups */}
            {popups.map((p) => {
              const laneIdx = LANES.findIndex((l) => l.key === p.lane);
              const age = now - p.createdAt;
              return (
                <div
                  key={p.id}
                  className="absolute text-xs font-black"
                  style={{
                    top: TRACK_HEIGHT - 30 - age / 8,
                    left: `${laneIdx * 25}%`,
                    width: '25%',
                    textAlign: 'center',
                    color: p.color,
                    opacity: Math.max(0, 1 - age / 500),
                  }}
                >
                  {p.label}
                </div>
              );
            })}
          </div>

          {/* lane buttons */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {LANES.map((l) => (
              <button
                key={l.key}
                onPointerDown={() => judgeLane(l.key)}
                className="rounded-2xl h-16 font-black text-lg shadow-[0_4px_14px_rgba(0,0,0,0.1)] transition"
                style={{
                  background: l.bg,
                  color: l.text,
                  border: `2px solid ${l.ring}`,
                  transform: pressed[l.key] ? 'scale(0.92)' : 'scale(1)',
                }}
              >
                {l.key}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'ended' && (
        <div className="w-full max-w-xl bg-white rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-8 text-center">
          <div className="text-6xl font-black text-[#2E2A3F] mb-1">{grade}</div>
          <p className="text-[#6B6480] text-sm mb-6">Grade lo pas maenin Rhythm Tap</p>

          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            <div className="bg-[#F3F1FA] rounded-2xl p-4">
              <div className="text-xs text-[#8B84A0] font-semibold">SKOR</div>
              <div className="text-2xl font-black text-[#2E2A3F]">{score}</div>
            </div>
            <div className="bg-[#F3F1FA] rounded-2xl p-4">
              <div className="text-xs text-[#8B84A0] font-semibold">MAX COMBO</div>
              <div className="text-2xl font-black text-[#2E2A3F]">{maxCombo}x</div>
            </div>
            <div className="bg-[#F3F1FA] rounded-2xl p-4">
              <div className="text-xs text-[#8B84A0] font-semibold">AKURASI</div>
              <div className="text-2xl font-black text-[#2E2A3F]">{accuracy}%</div>
            </div>
            <div className="bg-[#F3F1FA] rounded-2xl p-4">
              <div className="text-xs text-[#8B84A0] font-semibold">MANTAP / OKE / MELESET</div>
              <div className="text-lg font-black text-[#2E2A3F]">
                {hits.perfect} / {hits.good} / {hits.miss}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={startGame}
              className="bg-[#2E2A3F] text-white font-bold rounded-full px-6 py-3 shadow-[0_6px_20px_rgba(46,42,63,0.35)] hover:scale-105 active:scale-95 transition"
            >
              Main Lagi ↻
            </button>
            <Link
              href="/"
              className="bg-[#F3F1FA] text-[#2E2A3F] font-bold rounded-full px-6 py-3 hover:bg-[#E6E2F5] transition"
            >
              Balik ke Arcade
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}