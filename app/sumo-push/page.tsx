'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ---------- Types ----------
type Phase = 'idle' | 'countdown' | 'fight' | 'roundend' | 'matchend';

// ---------- Constants ----------
const RING = 150; // half-width of the arena in "position units"
const BOOST = 5.2; // power added per mash
const DECAY = 0.93; // per-frame decay of accumulated power
const PUSH_FACTOR = 0.22; // how much power difference moves the clash point
const ROUND_TIME = 15; // seconds before sudden-death tiebreak by position
const WINS_NEEDED = 2; // best of 3

export default function SumoPushPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [roundNum, setRoundNum] = useState(1);
  const [countdownText, setCountdownText] = useState('3');
  const [roundMsg, setRoundMsg] = useState('');
  const [matchWinner, setMatchWinner] = useState<1 | 2 | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const phaseRef = useRef<Phase>('idle');

  const positionRef = useRef(0); // -RING..+RING, negative = p1 side losing, positive = p2 side losing
  const p1PowerRef = useRef(0);
  const p2PowerRef = useRef(0);
  const roundStartRef = useRef(0);
  const decidedRef = useRef(false);

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

  const beep = useCallback((freq: number, dur = 0.06, type: OscillatorType = 'square', gain = 0.05) => {
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

  // ---------- Round flow ----------
  const beginCountdown = useCallback(() => {
    positionRef.current = 0;
    p1PowerRef.current = 0;
    p2PowerRef.current = 0;
    decidedRef.current = true; // locked until countdown finishes
    setPhase('countdown');
    const seq = ['3', '2', '1', 'DORONG!'];
    seq.forEach((txt, i) => {
      window.setTimeout(() => {
        setCountdownText(txt);
        beep(txt === 'DORONG!' ? 700 : 380, 0.12, 'square', 0.06);
        if (txt === 'DORONG!') {
          window.setTimeout(() => {
            decidedRef.current = false;
            roundStartRef.current = performance.now();
            setTimeLeft(ROUND_TIME);
            setPhase('fight');
          }, 450);
        }
      }, i * 550);
    });
  }, [beep]);

  const finishRound = useCallback(
    (winner: 1 | 2) => {
      if (decidedRef.current) return;
      decidedRef.current = true;
      beep(winner === 1 ? 500 : 500, 0.2, 'sawtooth', 0.08);
      let newP1 = 0;
      let newP2 = 0;
      if (winner === 1) {
        setP1Wins((w) => {
          newP1 = w + 1;
          return newP1;
        });
        setP2Wins((w) => {
          newP2 = w;
          return w;
        });
        setRoundMsg('PLAYER 1 MENANG RONDE!');
      } else {
        setP2Wins((w) => {
          newP2 = w + 1;
          return newP2;
        });
        setP1Wins((w) => {
          newP1 = w;
          return w;
        });
        setRoundMsg('PLAYER 2 MENANG RONDE!');
      }
      setPhase('roundend');
      window.setTimeout(() => {
        if (newP1 >= WINS_NEEDED || newP2 >= WINS_NEEDED) {
          setMatchWinner(newP1 >= WINS_NEEDED ? 1 : 2);
          setPhase('matchend');
        } else {
          setRoundNum((r) => r + 1);
          beginCountdown();
        }
      }, 1600);
    },
    [beep, beginCountdown]
  );

  // ---------- Main loop (physics + render) ----------
  useEffect(() => {
    const loop = () => {
      const ph = phaseRef.current;

      if (ph === 'fight' && !decidedRef.current) {
        p1PowerRef.current *= DECAY;
        p2PowerRef.current *= DECAY;
        positionRef.current += (p1PowerRef.current - p2PowerRef.current) * PUSH_FACTOR;
        positionRef.current = Math.max(-RING - 20, Math.min(RING + 20, positionRef.current));

        const elapsed = (performance.now() - roundStartRef.current) / 1000;
        const left = Math.max(0, ROUND_TIME - elapsed);
        setTimeLeft(Math.ceil(left));

        if (positionRef.current >= RING) {
          finishRound(1);
        } else if (positionRef.current <= -RING) {
          finishRound(2);
        } else if (left <= 0) {
          if (positionRef.current > 4) finishRound(1);
          else if (positionRef.current < -4) finishRound(2);
          else {
            // dead tie at time-out: nudge to whichever mashed more recently, else replay
            decidedRef.current = true;
            setRoundMsg('SERI! ULANG RONDE');
            setPhase('roundend');
            window.setTimeout(() => beginCountdown(), 1300);
          }
        }
      }

      // ---------- Draw ----------
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const W = 700;
        const H = 320;
        ctx.clearRect(0, 0, W, H);

        // floor
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#F3E9D2');
        grad.addColorStop(1, '#E6D6AE');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // dohyo ring (circle)
        const cx = W / 2;
        const cy = H / 2 + 10;
        const ringR = RING + 60;
        ctx.strokeStyle = '#B5895A';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.ellipse(cx, cy, ringR, ringR * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#8A5A32';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, ringR - 8, (ringR - 8) * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();

        // center line
        ctx.strokeStyle = 'rgba(90,60,30,0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(cx, cy - ringR * 0.35);
        ctx.lineTo(cx, cy + ringR * 0.35);
        ctx.stroke();
        ctx.setLineDash([]);

        // clash point + wrestlers
        const pos = positionRef.current;
        const clashX = cx + pos;
        const p1X = clashX - 34;
        const p2X = clashX + 34;
        const wY = cy;

        const danger1 = pos <= -RING * 0.7;
        const danger2 = pos >= RING * 0.7;

        // player 1 (orange, left)
        ctx.fillStyle = danger1 ? '#E85D5D' : '#F5A05D';
        ctx.beginPath();
        ctx.ellipse(p1X, wY, 34, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2E2A3F';
        ctx.beginPath();
        ctx.arc(p1X + 8, wY - 4, 2.2, 0, Math.PI * 2);
        ctx.arc(p1X + 8, wY + 4, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // player 2 (blue, right)
        ctx.fillStyle = danger2 ? '#E85D5D' : '#5D9DF5';
        ctx.beginPath();
        ctx.ellipse(p2X, wY, 34, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2E2A3F';
        ctx.beginPath();
        ctx.arc(p2X - 8, wY - 4, 2.2, 0, Math.PI * 2);
        ctx.arc(p2X - 8, wY + 4, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // power meters
        const p1p = Math.min(1, p1PowerRef.current / 30);
        const p2p = Math.min(1, p2PowerRef.current / 30);
        ctx.fillStyle = '#F5A05D';
        ctx.fillRect(20, H - 22, 120 * p1p, 10);
        ctx.strokeStyle = '#2E2A3F33';
        ctx.strokeRect(20, H - 22, 120, 10);
        ctx.fillStyle = '#5D9DF5';
        ctx.fillRect(W - 140, H - 22, 120 * p2p, 10);
        ctx.strokeRect(W - 140, H - 22, 120, 10);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [finishRound]);

  // ---------- Input ----------
  const mash = useCallback((player: 1 | 2) => {
    if (phaseRef.current !== 'fight' || decidedRef.current) return;
    if (player === 1) p1PowerRef.current += BOOST;
    else p2PowerRef.current += BOOST;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return; // require actual repeated key-presses, not held-key auto-repeat
      const k = e.key.toUpperCase();
      if (k === 'A') mash(1);
      if (k === 'L') mash(2);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mash]);

  // ---------- Start / restart ----------
  const startMatch = () => {
    ensureAudio();
    setP1Wins(0);
    setP2Wins(0);
    setRoundNum(1);
    setMatchWinner(null);
    beginCountdown();
  };

  return (
    <div className="min-h-screen bg-[#2A2338] flex flex-col items-center px-4 py-6 font-sans">
      <div className="w-full max-w-3xl flex items-center justify-between mb-4">
        <Link
          href="/"
          className="text-sm font-semibold text-[#D9D2F0] bg-white/10 rounded-full px-4 py-2 hover:bg-white/20 transition"
        >
          ← Balik ke Arcade
        </Link>
        {(phase === 'countdown' || phase === 'fight' || phase === 'roundend') && (
          <div className="flex gap-3 text-sm font-bold text-white">
            <span className="bg-white/10 rounded-full px-3 py-1.5">Ronde {roundNum}</span>
            <span className="bg-[#F5A05D]/20 text-[#F5A05D] rounded-full px-3 py-1.5">P1: {p1Wins}</span>
            <span className="bg-[#5D9DF5]/20 text-[#5D9DF5] rounded-full px-3 py-1.5">P2: {p2Wins}</span>
            {phase === 'fight' && <span className="bg-white/10 rounded-full px-3 py-1.5">⏱ {timeLeft}s</span>}
          </div>
        )}
      </div>

      <h1 className="text-3xl font-black text-white tracking-tight mb-1">🤼 Sumo Push</h1>
      <p className="text-[#B7AFDA] text-sm mb-5 text-center">
        Mash tombol lo secepat mungkin buat dorong lawan keluar dohyo!
      </p>

      {phase === 'idle' && (
        <div className="w-full max-w-2xl bg-[#372E52] rounded-[28px] shadow-2xl p-8 text-center">
          <div className="text-5xl mb-4">🤼‍♂️</div>
          <p className="text-[#D9D2F0] text-sm leading-relaxed mb-6">
            2 pemain, 1 keyboard. <b className="text-[#F5A05D]">Player 1 mash tombol A</b>,{' '}
            <b className="text-[#5D9DF5]">Player 2 mash tombol L</b> — atau tap tombol gede di layar kalau main di
            HP/tablet. Best of 3 ronde, siapa yang dorong lawan sampe keluar dohyo duluan menang rondenya!
          </p>
          <button
            onClick={startMatch}
            className="bg-[#E85D5D] text-white font-bold rounded-full px-8 py-3 shadow-lg hover:scale-105 active:scale-95 transition"
          >
            Mulai Pertarungan ⚔️
          </button>
        </div>
      )}

      {(phase === 'countdown' || phase === 'fight' || phase === 'roundend') && (
        <div className="w-full max-w-3xl">
          <div className="relative bg-[#372E52] rounded-[28px] overflow-hidden shadow-2xl">
            <canvas ref={canvasRef} width={700} height={320} className="w-full h-auto select-none" />

            {phase === 'countdown' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-6xl font-black text-white drop-shadow-lg">{countdownText}</span>
              </div>
            )}
            {phase === 'roundend' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-2xl md:text-3xl font-black text-[#F5D576] drop-shadow-lg text-center px-4">
                  {roundMsg}
                </span>
              </div>
            )}
          </div>

          {/* mash buttons */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onPointerDown={() => mash(1)}
              className="rounded-2xl h-24 font-black text-xl bg-[#F5A05D] text-[#2E2A3F] shadow-lg active:scale-95 transition select-none"
            >
              P1 — MASH 🅰️
            </button>
            <button
              onPointerDown={() => mash(2)}
              className="rounded-2xl h-24 font-black text-xl bg-[#5D9DF5] text-white shadow-lg active:scale-95 transition select-none"
            >
              P2 — MASH 🅻
            </button>
          </div>
        </div>
      )}

      {phase === 'matchend' && (
        <div className="w-full max-w-2xl bg-[#372E52] rounded-[28px] shadow-2xl p-8 text-center">
          <div className="text-6xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-white mb-1">
            {matchWinner === 1 ? 'PLAYER 1 MENANG!' : 'PLAYER 2 MENANG!'}
          </h2>
          <p className="text-[#B7AFDA] text-sm mb-6">
            Skor akhir: <span className="text-[#F5A05D] font-bold">P1 {p1Wins}</span> —{' '}
            <span className="text-[#5D9DF5] font-bold">P2 {p2Wins}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={startMatch}
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