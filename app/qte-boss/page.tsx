'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ---------- Types ----------
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Phase = 'idle' | 'p1' | 'p2' | 'p3' | 'won' | 'lost';

const DIR_ARROW: Record<Dir, string> = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };
const DIR_KEY: Record<string, Dir> = {
  ARROWUP: 'UP',
  ARROWDOWN: 'DOWN',
  ARROWLEFT: 'LEFT',
  ARROWRIGHT: 'RIGHT',
  W: 'UP',
  S: 'DOWN',
  A: 'LEFT',
  D: 'RIGHT',
};
const ALL_DIRS: Dir[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

const PLAYER_MAX_HP = 3;
const BOSS_MAX_HP = 100;

// Phase thresholds (boss hp)
const P1_END_HP = 65;
const P2_END_HP = 30;

function randDir(): Dir {
  return ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)];
}

function randSequence(len: number): Dir[] {
  return Array.from({ length: len }, randDir);
}

// ---------- Component ----------
export default function QteBossRushPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [bossHp, setBossHp] = useState(BOSS_MAX_HP);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [shake, setShake] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // scroll-QTE state (phase 1 & 2)
  const [sequence, setSequence] = useState<Dir[]>([]);
  const [seqIndex, setSeqIndex] = useState(0);
  const [seqProgress, setSeqProgress] = useState(0); // 0..1 position of active marker

  // flash-QTE state (phase 3)
  const [flashPrompt, setFlashPrompt] = useState<Dir | null>(null);
  const [flashDeadline, setFlashDeadline] = useState(0);
  const [flashNow, setFlashNow] = useState(0);

  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const seqStartRef = useRef(0);
  const seqDurationRef = useRef(2200);
  const busyRef = useRef(false); // true while waiting between prompts / showing banner
  const phaseRef = useRef<Phase>('idle');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ---------- Audio ----------
  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }, []);

  const beep = useCallback((freq: number, dur = 0.08, type: OscillatorType = 'sine', gain = 0.08) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }, []);

  const doShake = useCallback(() => {
    setShake(true);
    window.setTimeout(() => setShake(false), 220);
  }, []);

  const doFlashRed = useCallback(() => {
    setFlashRed(true);
    window.setTimeout(() => setFlashRed(false), 150);
  }, []);

  const showBanner = useCallback((text: string, ms: number) => {
    setBanner(text);
    window.setTimeout(() => setBanner(null), ms);
  }, []);

  // ---------- Damage helpers ----------
  const damageBoss = useCallback((amount: number) => {
    setBossHp((hp) => Math.max(0, hp - amount));
  }, []);

  const damagePlayer = useCallback(() => {
    setCombo(0);
    doShake();
    doFlashRed();
    beep(120, 0.15, 'sawtooth', 0.12);
    setPlayerHp((hp) => Math.max(0, hp - 1));
  }, [beep, doShake, doFlashRed]);

  const registerHit = useCallback(
    (dmg: number) => {
      setCombo((c) => {
        const nc = c + 1;
        setMaxCombo((mc) => Math.max(mc, nc));
        return nc;
      });
      beep(500 + Math.random() * 200, 0.07, 'sine', 0.09);
      damageBoss(dmg);
    },
    [beep, damageBoss]
  );

  // ---------- Sequence (Phase 1 & 2) ----------
  const startNewSequence = useCallback((len: number, durationMs: number) => {
    setSequence(randSequence(len));
    setSeqIndex(0);
    setSeqProgress(0);
    seqStartRef.current = performance.now();
    seqDurationRef.current = durationMs;
    busyRef.current = false;
  }, []);

  // ---------- Flash QTE (Phase 3) ----------
  const startFlashPrompt = useCallback(() => {
    const dir = randDir();
    const now = performance.now();
    const windowMs = 520;
    setFlashPrompt(dir);
    setFlashDeadline(now + windowMs);
    setFlashNow(now);
    beep(300, 0.05, 'square', 0.05);
    busyRef.current = false;
  }, [beep]);

  // ---------- Main game loop ----------
  useEffect(() => {
    if (phase !== 'p1' && phase !== 'p2' && phase !== 'p3') return;

    const loop = (t: number) => {
      if (phase === 'p1' || phase === 'p2') {
        const elapsed = t - seqStartRef.current;
        const progress = Math.min(1, elapsed / seqDurationRef.current);
        setSeqProgress(progress);
        if (progress >= 1 && !busyRef.current && sequence.length > 0 && seqIndex < sequence.length) {
          // timed out on current arrow -> miss whole sequence
          busyRef.current = true;
          damagePlayer();
          showBanner('KELEWATAN!', 500);
          window.setTimeout(() => {
            if (phaseRef.current === 'p1' || phaseRef.current === 'p2') {
              const len = phaseRef.current === 'p1' ? 3 : 5;
              const dur = phaseRef.current === 'p1' ? 2200 : 1500;
              startNewSequence(len, dur);
            }
          }, 500);
        }
      } else if (phase === 'p3') {
        setFlashNow(t);
        if (flashPrompt && t >= flashDeadline && !busyRef.current) {
          busyRef.current = true;
          damagePlayer();
          showBanner('KELEWATAN!', 400);
          setFlashPrompt(null);
          window.setTimeout(() => {
            if (phaseRef.current === 'p3') startFlashPrompt();
          }, 350);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, sequence, seqIndex, flashPrompt, flashDeadline, damagePlayer, showBanner, startNewSequence, startFlashPrompt]);

  // ---------- Phase transitions based on boss HP ----------
  useEffect(() => {
    if (phase === 'p1' && bossHp <= P1_END_HP) {
      busyRef.current = true;
      showBanner('COMBO RUSH!', 900);
      window.setTimeout(() => {
        setPhase('p2');
        startNewSequence(5, 1500);
      }, 900);
    } else if (phase === 'p2' && bossHp <= P2_END_HP) {
      busyRef.current = true;
      showBanner('BOSS NGAMUK!!', 900);
      window.setTimeout(() => {
        setPhase('p3');
        startFlashPrompt();
      }, 900);
    } else if ((phase === 'p1' || phase === 'p2' || phase === 'p3') && bossHp <= 0) {
      setPhase('won');
    }
  }, [bossHp, phase, showBanner, startNewSequence, startFlashPrompt]);

  useEffect(() => {
    if (playerHp <= 0 && (phase === 'p1' || phase === 'p2' || phase === 'p3')) {
      setPhase('lost');
    }
  }, [playerHp, phase]);

  // ---------- Input handling ----------
  const handleDir = useCallback(
    (dir: Dir) => {
      const ph = phaseRef.current;
      if (ph === 'p1' || ph === 'p2') {
        if (busyRef.current || sequence.length === 0) return;
        const expected = sequence[seqIndex];
        if (dir !== expected) {
          busyRef.current = true;
          damagePlayer();
          showBanner('SALAH!', 400);
          window.setTimeout(() => {
            if (phaseRef.current === 'p1' || phaseRef.current === 'p2') {
              const len = phaseRef.current === 'p1' ? 3 : 5;
              const dur = phaseRef.current === 'p1' ? 2200 : 1500;
              startNewSequence(len, dur);
            }
          }, 400);
          return;
        }
        // correct
        const nextIndex = seqIndex + 1;
        const dmg = ph === 'p1' ? 4 : 3;
        registerHit(dmg);
        if (nextIndex >= sequence.length) {
          busyRef.current = true;
          showBanner('COMBO!', 300);
          window.setTimeout(() => {
            if (phaseRef.current === 'p1' || phaseRef.current === 'p2') {
              const len = phaseRef.current === 'p1' ? 3 : 5;
              const dur = phaseRef.current === 'p1' ? 2200 : 1500;
              startNewSequence(len, dur);
            }
          }, 300);
        } else {
          setSeqIndex(nextIndex);
          seqStartRef.current = performance.now();
        }
      } else if (ph === 'p3') {
        if (busyRef.current || !flashPrompt) return;
        busyRef.current = true;
        if (dir === flashPrompt) {
          registerHit(6);
          showBanner('HIT!', 200);
        } else {
          damagePlayer();
          showBanner('SALAH!', 300);
        }
        setFlashPrompt(null);
        window.setTimeout(() => {
          if (phaseRef.current === 'p3') startFlashPrompt();
        }, 280);
      }
    },
    [sequence, seqIndex, flashPrompt, damagePlayer, registerHit, showBanner, startNewSequence, startFlashPrompt]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      const dir = DIR_KEY[k];
      if (dir) {
        e.preventDefault();
        handleDir(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDir]);

  // ---------- Start / Restart ----------
  const startGame = () => {
    ensureAudio();
    setBossHp(BOSS_MAX_HP);
    setPlayerHp(PLAYER_MAX_HP);
    setCombo(0);
    setMaxCombo(0);
    setFlashPrompt(null);
    busyRef.current = false;
    setPhase('p1');
    startNewSequence(3, 2200);
  };

  const phaseLabel =
    phase === 'p1' ? 'FASE 1 · JAB' : phase === 'p2' ? 'FASE 2 · COMBO RUSH' : phase === 'p3' ? 'FASE 3 · NGAMUK' : '';

  const bossFace = phase === 'p3' ? '👹' : phase === 'p2' ? '😤' : '😈';

  return (
    <div
      className={`min-h-screen flex flex-col items-center px-4 py-6 font-sans transition-colors ${
        flashRed ? 'bg-[#4a1414]' : 'bg-[#1B1730]'
      }`}
      style={{
        transform: shake ? `translate(${Math.random() * 8 - 4}px, ${Math.random() * 8 - 4}px)` : 'none',
      }}
    >
      <div className="w-full max-w-xl flex items-center justify-between mb-4">
        <Link
          href="/"
          className="text-sm font-semibold text-[#C9C2E8] bg-white/10 rounded-full px-4 py-2 hover:bg-white/20 transition"
        >
          ← Balik ke Arcade
        </Link>
        {(phase === 'p1' || phase === 'p2' || phase === 'p3') && (
          <span className="text-xs font-black tracking-widest text-[#F5D576] bg-white/10 rounded-full px-3 py-1.5">
            {phaseLabel}
          </span>
        )}
      </div>

      <h1 className="text-3xl font-black text-white tracking-tight mb-1">⚔️ QTE Boss Rush</h1>
      <p className="text-[#9C93C4] text-sm mb-5 text-center">
        Pencet arah yang bener buat nyerang boss sebelum HP lo abis!
      </p>

      {phase === 'idle' && (
        <div className="w-full max-w-xl bg-[#26213F] rounded-[28px] shadow-2xl p-8 text-center">
          <div className="text-6xl mb-4">😈</div>
          <p className="text-[#C9C2E8] text-sm leading-relaxed mb-6">
            Pake keyboard <b className="text-white">panah / W A S D</b> atau tap tombol di layar.
            <br />
            <b className="text-white">Fase 1–2:</b> panah scroll dari kiri, pencet pas nyampe garis, ikutin urutan combo-nya.
            <br />
            <b className="text-white">Fase 3:</b> boss ngamuk — prompt muncul dadakan, refleks doang, gak ada waktu mikir.
            <br />
            Nyawa lo cuma <b className="text-white">{PLAYER_MAX_HP}</b>, salah/telat = kena damage. Kalahin boss sebelum nyawa abis!
          </p>
          <button
            onClick={startGame}
            className="bg-[#E85D5D] text-white font-bold rounded-full px-8 py-3 shadow-lg hover:scale-105 active:scale-95 transition"
          >
            Mulai Bertarung ⚔️
          </button>
        </div>
      )}

      {(phase === 'p1' || phase === 'p2' || phase === 'p3') && (
        <div className="w-full max-w-xl">
          {/* HP bars */}
          <div className="mb-3">
            <div className="flex justify-between text-xs font-bold text-[#C9C2E8] mb-1">
              <span>BOSS</span>
              <span>{bossHp}/{BOSS_MAX_HP}</span>
            </div>
            <div className="w-full h-4 bg-[#2E2A4A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E85D5D] to-[#F5A05D] transition-all duration-300"
                style={{ width: `${(bossHp / BOSS_MAX_HP) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-[#26213F] rounded-[28px] shadow-2xl p-6 relative overflow-hidden" style={{ minHeight: 280 }}>
            <div className="text-7xl text-center mb-2 select-none">{bossFace}</div>

            {/* banner */}
            {banner && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-[#F5D576] drop-shadow-lg animate-pulse">{banner}</span>
              </div>
            )}

            {/* Phase 1 & 2: scroll lane */}
            {(phase === 'p1' || phase === 'p2') && sequence.length > 0 && (
              <div className="mt-4">
                <div className="flex gap-2 justify-center mb-3">
                  {sequence.map((d, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black transition ${
                        i < seqIndex
                          ? 'bg-[#4FBE82] text-white'
                          : i === seqIndex
                          ? 'bg-[#F5D576] text-[#2E2A3F] scale-110'
                          : 'bg-white/10 text-[#9C93C4]'
                      }`}
                    >
                      {DIR_ARROW[d]}
                    </div>
                  ))}
                </div>
                <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 h-3 bg-[#F5D576] rounded-full"
                    style={{ width: `${seqProgress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Phase 3: flash prompt */}
            {phase === 'p3' && (
              <div className="mt-4 flex flex-col items-center">
                {flashPrompt ? (
                  <div
                    className="w-24 h-24 rounded-2xl bg-[#E85D5D] flex items-center justify-center text-5xl font-black text-white shadow-lg animate-bounce"
                    key={flashDeadline}
                  >
                    {DIR_ARROW[flashPrompt]}
                  </div>
                ) : (
                  <div className="w-24 h-24" />
                )}
                <div className="w-40 h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-[#E85D5D]"
                    style={{
                      width: flashPrompt
                        ? `${Math.max(0, ((flashDeadline - flashNow) / 520) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* direction buttons */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {ALL_DIRS.map((d) => (
              <button
                key={d}
                onPointerDown={() => handleDir(d)}
                className="rounded-2xl h-16 font-black text-2xl bg-white/10 text-white shadow-md hover:bg-white/20 active:scale-90 transition"
              >
                {DIR_ARROW[d]}
              </button>
            ))}
          </div>

          {/* player status */}
          <div className="flex items-center justify-between mt-4 text-sm font-bold text-[#C9C2E8]">
            <div className="flex gap-1">
              {Array.from({ length: PLAYER_MAX_HP }).map((_, i) => (
                <span key={i} className={i < playerHp ? 'text-[#E85D5D]' : 'text-white/15'}>
                  ❤
                </span>
              ))}
            </div>
            <span>🔥 combo {combo}</span>
          </div>
        </div>
      )}

      {(phase === 'won' || phase === 'lost') && (
        <div className="w-full max-w-xl bg-[#26213F] rounded-[28px] shadow-2xl p-8 text-center">
          <div className="text-6xl mb-2">{phase === 'won' ? '🏆' : '💀'}</div>
          <h2 className="text-2xl font-black text-white mb-1">
            {phase === 'won' ? 'BOSS KALAH!' : 'LO KALAH...'}
          </h2>
          <p className="text-[#9C93C4] text-sm mb-6">
            {phase === 'won' ? 'Mantap, boss-nya lo hajar sampai tumbang!' : 'Nyawa lo abis duluan. Coba lagi, gas!'}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="text-xs text-[#9C93C4] font-semibold">MAX COMBO</div>
              <div className="text-2xl font-black text-white">{maxCombo}x</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="text-xs text-[#9C93C4] font-semibold">SISA HP BOSS</div>
              <div className="text-2xl font-black text-white">{bossHp}/{BOSS_MAX_HP}</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={startGame}
              className="bg-[#E85D5D] text-white font-bold rounded-full px-6 py-3 shadow-lg hover:scale-105 active:scale-95 transition"
            >
              Main Lagi ↻
            </button>
            <Link
              href="/"
              className="bg-white/10 text-white font-bold rounded-full px-6 py-3 hover:bg-white/20 transition"
            >
              Balik ke Arcade
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}