'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ---------- Types ----------
type Phase = 'idle' | 'play' | 'result' | 'gameover';
type Subphase = 'draw' | 'settle' | 'aim' | 'flight';

type Pt = { x: number; y: number; px: number; py: number; pinned: boolean };
type Body = { x: number; y: number; px: number; py: number; r: number };
type Vec2 = { x: number; y: number };

// ---------- Constants ----------
const CW = 800;
const CH = 420;
const GROUND_Y = 320;
const LEFT_ANCHOR_X = 250;
const LANDING_LEN = 180;
const GAPS = [120, 150, 180, 210, 250];
const TOTAL_ROUNDS = GAPS.length;

const GRAVITY = 0.55;
const DAMPING = 0.992;
const CONSTRAINT_ITER = 4;
const RAGDOLL_R_HEAD = 9;
const RAGDOLL_R_BODY = 13;
const RAGDOLL_REST = 22;
const MAX_PULL = 110;
const POWER = 0.2;
const SETTLE_FRAMES = 55;
const FAIL_Y = GROUND_Y + 110;

function dist(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ---------- Component ----------
export default function SlingshotBridgePage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [subphase, setSubphase] = useState<Subphase>('draw');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [roundLabel, setRoundLabel] = useState('');
  const [roundPts, setRoundPts] = useState(0);
  const [hint, setHint] = useState('');
  const [canConfirm, setCanConfirm] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const phaseRef = useRef<Phase>('idle');
  const subphaseRef = useRef<Subphase>('draw');
  const roundRef = useRef(0);

  const bridgeRef = useRef<{ points: Pt[]; restLens: number[] } | null>(null);
  const drawingRef = useRef<Vec2[]>([]);
  const isDrawingRef = useRef(false);

  const ragdollRef = useRef<{ head: Body; body: Body }>({
    head: { x: 0, y: 0, px: 0, py: 0, r: RAGDOLL_R_HEAD },
    body: { x: 0, y: 0, px: 0, py: 0, r: RAGDOLL_R_BODY },
  });
  const pivotRef = useRef<Vec2>({ x: 0, y: 0 });
  const pullingRef = useRef(false);
  const pullPosRef = useRef<Vec2>({ x: 0, y: 0 });
  const settleTimerRef = useRef(0);
  const restTimerRef = useRef(0);
  const outcomeHandledRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    subphaseRef.current = subphase;
  }, [subphase]);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  // ---------- Audio ----------
  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }, []);

  const beep = useCallback((freq: number, dur = 0.09, type: OscillatorType = 'sine', gain = 0.07) => {
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

  // ---------- Layout helpers ----------
  const rightAnchorX = useCallback((r: number) => LEFT_ANCHOR_X + GAPS[r], []);
  const startPad = useCallback(
    () => ({ x: LEFT_ANCHOR_X - 45, y: GROUND_Y - RAGDOLL_R_BODY }),
    []
  );

  // ---------- Setup a fresh round ----------
  const setupRound = useCallback(
    (r: number) => {
      bridgeRef.current = null;
      drawingRef.current = [];
      isDrawingRef.current = false;
      const pad = startPad();
      ragdollRef.current = {
        head: { x: pad.x, y: pad.y - 20, px: pad.x, py: pad.y - 20, r: RAGDOLL_R_HEAD },
        body: { x: pad.x, y: pad.y, px: pad.x, py: pad.y, r: RAGDOLL_R_BODY },
      };
      pivotRef.current = { x: pad.x, y: pad.y };
      pullingRef.current = false;
      settleTimerRef.current = 0;
      restTimerRef.current = 0;
      outcomeHandledRef.current = false;
      setSubphase('draw');
      setCanConfirm(false);
      setHint(`Gambar jembatan dari ujung kiri ke ujung kanan jurang (lebar ${GAPS[r]}px)`);
    },
    [startPad]
  );

  // ---------- Physics: bridge ----------
  const updateBridge = useCallback(() => {
    const b = bridgeRef.current;
    if (!b) return;
    const pts = b.points;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.pinned) continue;
      const vx = (p.x - p.px) * DAMPING;
      const vy = (p.y - p.py) * DAMPING;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + GRAVITY * 0.4;
    }
    for (let iter = 0; iter < CONSTRAINT_ITER; iter++) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const c = pts[i + 1];
        const rest = b.restLens[i];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - rest) / d;
        const ax = a.pinned ? 0 : 0.5;
        const cx = c.pinned ? 0 : 0.5;
        const total = ax + cx || 1;
        if (!a.pinned) {
          a.x += dx * diff * (ax / total);
          a.y += dy * diff * (ax / total);
        }
        if (!c.pinned) {
          c.x -= dx * diff * (cx / total);
          c.y -= dy * diff * (cx / total);
        }
      }
    }
  }, []);

  // ---------- Physics: ragdoll ----------
  const updateRagdoll = useCallback(() => {
    const rd = ragdollRef.current;
    const bodies: Body[] = [rd.head, rd.body];
    for (const bd of bodies) {
      const vx = (bd.x - bd.px) * 0.994;
      const vy = (bd.y - bd.py) * 0.994;
      bd.px = bd.x;
      bd.py = bd.y;
      bd.x += vx;
      bd.y += vy + GRAVITY;
    }
    // keep head-body distance
    {
      const dx = rd.body.x - rd.head.x;
      const dy = rd.body.y - rd.head.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const diff = (d - RAGDOLL_REST) / d;
      rd.head.x += dx * diff * 0.5;
      rd.head.y += dy * diff * 0.5;
      rd.body.x -= dx * diff * 0.5;
      rd.body.y -= dy * diff * 0.5;
    }

    const r = roundRef.current;
    const rAnchor = rightAnchorX(r);

    for (const bd of bodies) {
      // ground platforms (left + landing platform), gap has no floor
      const onLeftPlatform = bd.x - bd.r < LEFT_ANCHOR_X;
      const onLandingPlatform = bd.x + bd.r > rAnchor;
      if ((onLeftPlatform || onLandingPlatform) && bd.y + bd.r > GROUND_Y) {
        bd.y = GROUND_Y - bd.r;
        bd.py = bd.y + (bd.y - bd.py) * -0.25;
      }

      // bridge collision
      const b = bridgeRef.current;
      if (b) {
        for (let i = 0; i < b.points.length - 1; i++) {
          const a = b.points[i];
          const c = b.points[i + 1];
          const abx = c.x - a.x;
          const aby = c.y - a.y;
          const len2 = abx * abx + aby * aby || 0.0001;
          let t = ((bd.x - a.x) * abx + (bd.y - a.y) * aby) / len2;
          t = Math.max(0, Math.min(1, t));
          const cx = a.x + abx * t;
          const cy = a.y + aby * t;
          const dx = bd.x - cx;
          const dy = bd.y - cy;
          const d = Math.hypot(dx, dy);
          const minD = bd.r + 4;
          if (d < minD && d > 0.0001) {
            const nx = dx / d;
            const ny = dy / d;
            const push = minD - d;
            bd.x += nx * push;
            bd.y += ny * push;
            bd.py = bd.y + (bd.y - bd.py) * -0.35;
            bd.px = bd.x + (bd.x - bd.px) * -0.35;
            // transfer a little momentum into the bridge for a bounce effect
            if (!a.pinned) a.y += 1.1;
            if (!c.pinned) c.y += 1.1;
          }
        }
      }
    }
  }, [rightAnchorX]);

  // ---------- Round outcome ----------
  const finishRound = useCallback(
    (label: string, pts: number) => {
      if (outcomeHandledRef.current) return;
      outcomeHandledRef.current = true;
      setRoundLabel(label);
      setRoundPts(pts);
      setScore((s) => s + pts);
      beep(pts > 0 ? 620 : 140, pts > 0 ? 0.15 : 0.2, pts > 0 ? 'sine' : 'sawtooth', 0.1);
      setPhase('result');
      window.setTimeout(() => {
        const nextR = roundRef.current + 1;
        if (nextR >= TOTAL_ROUNDS) {
          setPhase('gameover');
        } else {
          setRound(nextR);
          setupRound(nextR);
          setPhase('play');
        }
      }, 1700);
    },
    [beep, setupRound]
  );

  const evaluateLanding = useCallback(() => {
    const rd = ragdollRef.current;
    const r = roundRef.current;
    const rAnchor = rightAnchorX(r);
    const landingCenter = rAnchor + LANDING_LEN / 2;
    const x = (rd.head.x + rd.body.x) / 2;

    if (x <= rAnchor) {
      finishRound('AMAN DI JEMBATAN, TAPI GAK NYAMPE', 15);
      return;
    }
    const offset = Math.abs(x - landingCenter);
    if (offset <= 15) finishRound('PERFECT LANDING!', 150);
    else if (offset <= 35) finishRound('MANTAP!', 100);
    else if (offset <= 65) finishRound('LUMAYAN', 60);
    else finishRound('MELESET DIKIT', 25);
  }, [finishRound, rightAnchorX]);

  // ---------- Main loop ----------
  useEffect(() => {
    const loop = () => {
      const ctx = canvasRef.current?.getContext('2d');
      const sp = subphaseRef.current;
      const ph = phaseRef.current;
      const r = roundRef.current;
      const rAnchor = rightAnchorX(r);

      if (ph === 'play') {
        if (sp === 'settle') {
          updateBridge();
          settleTimerRef.current++;
          if (settleTimerRef.current > SETTLE_FRAMES) {
            setSubphase('aim');
          }
        } else if (sp === 'aim') {
          updateBridge();
          const rd = ragdollRef.current;
          if (pullingRef.current) {
            const pivot = pivotRef.current;
            let dx = pullPosRef.current.x - pivot.x;
            let dy = pullPosRef.current.y - pivot.y;
            const d = Math.hypot(dx, dy);
            if (d > MAX_PULL) {
              dx = (dx / d) * MAX_PULL;
              dy = (dy / d) * MAX_PULL;
            }
            const bx = pivot.x + dx;
            const by = pivot.y + dy;
            rd.body.x = bx;
            rd.body.y = by;
            rd.body.px = bx;
            rd.body.py = by;
            rd.head.x = bx;
            rd.head.y = by - 20;
            rd.head.px = bx;
            rd.head.py = by - 20;
          }
        } else if (sp === 'flight') {
          updateBridge();
          updateRagdoll();
          const rd = ragdollRef.current;
          const avgY = (rd.head.y + rd.body.y) / 2;

          if (avgY > FAIL_Y) {
            finishRound('JATUH KE JURANG!', 0);
          } else {
            const speed =
              Math.hypot(rd.head.x - rd.head.px, rd.head.y - rd.head.py) +
              Math.hypot(rd.body.x - rd.body.px, rd.body.y - rd.body.py);
            const resting = rd.body.y + rd.body.r >= GROUND_Y - 1 && speed < 0.35;
            if (resting) {
              restTimerRef.current++;
              if (restTimerRef.current > 20) {
                evaluateLanding();
              }
            } else {
              restTimerRef.current = 0;
            }
          }
        }
      }

      // ---------- Draw ----------
      if (ctx) {
        ctx.clearRect(0, 0, CW, CH);

        // sky
        const sky = ctx.createLinearGradient(0, 0, 0, CH);
        sky.addColorStop(0, '#BFE3F5');
        sky.addColorStop(1, '#E8F6ED');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, CW, CH);

        // void / pit
        ctx.fillStyle = '#2B2440';
        ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);

        // left platform
        ctx.fillStyle = '#9BD98C';
        ctx.fillRect(0, GROUND_Y, LEFT_ANCHOR_X, 14);
        ctx.fillStyle = '#7CB86C';
        ctx.fillRect(0, GROUND_Y + 14, LEFT_ANCHOR_X, CH - GROUND_Y - 14);

        // landing platform + target zones
        ctx.fillStyle = '#9BD98C';
        ctx.fillRect(rAnchor, GROUND_Y, LANDING_LEN, 14);
        ctx.fillStyle = '#7CB86C';
        ctx.fillRect(rAnchor, GROUND_Y + 14, LANDING_LEN, CH - GROUND_Y - 14);

        const landingCenter = rAnchor + LANDING_LEN / 2;
        const zoneDraw = [
          [65, '#FDE68A'],
          [35, '#FCA5A5'],
          [15, '#F87171'],
        ] as const;
        for (const [w, color] of zoneDraw) {
          ctx.fillStyle = color;
          ctx.fillRect(landingCenter - w, GROUND_Y - 6, w * 2, 6);
        }

        // bridge
        const b = bridgeRef.current;
        if (b && b.points.length > 1) {
          ctx.strokeStyle = '#8A5A32';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(b.points[0].x, b.points[0].y);
          for (let i = 1; i < b.points.length; i++) ctx.lineTo(b.points[i].x, b.points[i].y);
          ctx.stroke();
          ctx.strokeStyle = '#C48A55';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // anchors
        ctx.fillStyle = '#5B4632';
        ctx.beginPath();
        ctx.arc(LEFT_ANCHOR_X, GROUND_Y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rAnchor, GROUND_Y, 6, 0, Math.PI * 2);
        ctx.fill();

        // in-progress drawing path
        if (sp === 'draw' && drawingRef.current.length > 1) {
          ctx.strokeStyle = '#5B4632';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          const path = drawingRef.current;
          ctx.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
          ctx.stroke();
        }

        // slingshot band
        if (sp === 'aim') {
          ctx.strokeStyle = '#5B4632';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(pivotRef.current.x - 12, pivotRef.current.y - 25);
          ctx.lineTo(ragdollRef.current.body.x, ragdollRef.current.body.y);
          ctx.moveTo(pivotRef.current.x + 12, pivotRef.current.y - 25);
          ctx.lineTo(ragdollRef.current.body.x, ragdollRef.current.body.y);
          ctx.stroke();
          ctx.fillStyle = '#8A5A32';
          ctx.fillRect(pivotRef.current.x - 14, pivotRef.current.y - 40, 4, 40);
          ctx.fillRect(pivotRef.current.x + 10, pivotRef.current.y - 40, 4, 40);
        }

        // ragdoll
        const rd = ragdollRef.current;
        ctx.strokeStyle = '#2E2A3F';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(rd.head.x, rd.head.y);
        ctx.lineTo(rd.body.x, rd.body.y);
        ctx.stroke();
        ctx.fillStyle = '#F5A05D';
        ctx.beginPath();
        ctx.arc(rd.body.x, rd.body.y, RAGDOLL_R_BODY, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD9A0';
        ctx.beginPath();
        ctx.arc(rd.head.x, rd.head.y, RAGDOLL_R_HEAD, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2E2A3F';
        ctx.beginPath();
        ctx.arc(rd.head.x - 3, rd.head.y - 1, 1.4, 0, Math.PI * 2);
        ctx.arc(rd.head.x + 3, rd.head.y - 1, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [evaluateLanding, finishRound, rightAnchorX, updateBridge, updateRagdoll]);

  // ---------- Pointer handling ----------
  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phaseRef.current !== 'play') return;
      const pos = getPos(e);
      if (subphaseRef.current === 'draw') {
        isDrawingRef.current = true;
        drawingRef.current = [pos];
      } else if (subphaseRef.current === 'aim') {
        pullingRef.current = true;
        pullPosRef.current = pos;
      }
    },
    [getPos]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pos = getPos(e);
      if (subphaseRef.current === 'draw' && isDrawingRef.current) {
        const path = drawingRef.current;
        const last = path[path.length - 1];
        if (!last || dist(last, pos) > 6) path.push(pos);
      } else if (subphaseRef.current === 'aim' && pullingRef.current) {
        pullPosRef.current = pos;
      }
    },
    [getPos]
  );

  const onPointerUp = useCallback(() => {
    if (subphaseRef.current === 'draw' && isDrawingRef.current) {
      isDrawingRef.current = false;
      const path = drawingRef.current;
      const r = roundRef.current;
      const anchorA = { x: LEFT_ANCHOR_X, y: GROUND_Y };
      const anchorB = { x: rightAnchorX(r), y: GROUND_Y };
      const ok =
        path.length > 2 &&
        dist(path[0], anchorA) < 60 &&
        dist(path[path.length - 1], anchorB) < 60;
      setCanConfirm(ok);
      setHint(
        ok
          ? 'Jembatan siap! Klik "Selesai Gambar" buat lanjut.'
          : 'Jembatan harus mulai & berakhir persis di ujung jurang. Gambar ulang ya!'
      );
    } else if (subphaseRef.current === 'aim' && pullingRef.current) {
      pullingRef.current = false;
      const pivot = pivotRef.current;
      const rd = ragdollRef.current;
      let dx = pivot.x - rd.body.x;
      let dy = pivot.y - rd.body.y;
      const pullDist = Math.hypot(dx, dy);
      if (pullDist < 8) return; // too small a pull, ignore
      const vx = dx * POWER;
      const vy = dy * POWER;
      rd.body.px = rd.body.x - vx;
      rd.body.py = rd.body.y - vy;
      rd.head.px = rd.head.x - vx;
      rd.head.py = rd.head.y - vy;
      beep(220, 0.12, 'triangle', 0.09);
      restTimerRef.current = 0;
      setSubphase('flight');
    }
  }, [beep, rightAnchorX]);

  // ---------- Confirm bridge button ----------
  const confirmBridge = useCallback(() => {
    const path = drawingRef.current;
    const r = roundRef.current;
    const anchorA = { x: LEFT_ANCHOR_X, y: GROUND_Y };
    const anchorB = { x: rightAnchorX(r), y: GROUND_Y };
    const snapped = path.slice();
    snapped[0] = { ...anchorA };
    snapped[snapped.length - 1] = { ...anchorB };

    const points: Pt[] = snapped.map((p, i) => ({
      x: p.x,
      y: p.y,
      px: p.x,
      py: p.y,
      pinned: i === 0 || i === snapped.length - 1,
    }));
    const restLens: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      restLens.push(dist(points[i], points[i + 1]));
    }
    bridgeRef.current = { points, restLens };
    settleTimerRef.current = 0;
    setSubphase('settle');
    setHint('Jembatannya lagi turun karena gravitasi... siap-siap narik ketapel!');
  }, [rightAnchorX]);

  const clearDrawing = useCallback(() => {
    drawingRef.current = [];
    isDrawingRef.current = false;
    setCanConfirm(false);
    setHint(`Gambar jembatan dari ujung kiri ke ujung kanan jurang (lebar ${GAPS[roundRef.current]}px)`);
  }, []);

  // ---------- Start / restart ----------
  const startGame = () => {
    ensureAudio();
    setScore(0);
    setRound(0);
    setupRound(0);
    setPhase('play');
  };

  return (
    <div className="min-h-screen bg-[#EFEDF5] flex flex-col items-center px-4 py-6 font-sans">
      <div className="w-full max-w-3xl flex items-center justify-between mb-4">
        <Link
          href="/"
          className="text-sm font-semibold text-[#5B5470] bg-white/70 rounded-full px-4 py-2 shadow-sm hover:bg-white transition"
        >
          ← Balik ke Arcade
        </Link>
        {(phase === 'play' || phase === 'result') && (
          <div className="flex gap-3 text-sm font-bold text-[#3D3653]">
            <span className="bg-white/80 rounded-full px-3 py-1.5 shadow-sm">
              Ronde {round + 1}/{TOTAL_ROUNDS}
            </span>
            <span className="bg-white/80 rounded-full px-3 py-1.5 shadow-sm">✨ {score}</span>
          </div>
        )}
      </div>

      <h1 className="text-3xl font-black text-[#2E2A3F] tracking-tight mb-1">🌉 Slingshot Bridge</h1>
      <p className="text-[#6B6480] text-sm mb-4 text-center">
        Gambar jembatan, ketapel-in ragdoll-nya, dan usahain mendarat di tengah target!
      </p>

      {phase === 'idle' && (
        <div className="w-full max-w-3xl bg-white rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-8 text-center">
          <div className="text-5xl mb-4">🌉🪂</div>
          <p className="text-[#4B4560] text-sm leading-relaxed mb-6">
            1. <b>Gambar</b> jembatan dari ujung kiri ke ujung kanan jurang (drag mouse/jari).
            <br />
            2. Jembatannya bakal <b>turun karena gravitasi</b> — makin panjang garisnya, makin melorot.
            <br />
            3. <b>Tarik</b> ragdoll-nya kayak ketapel, lepas buat nembakin dia ke target di seberang.
            <br />
            4. Jurang makin lebar tiap ronde ({TOTAL_ROUNDS} ronde total). Target di tengah = skor paling gede!
          </p>
          <button
            onClick={startGame}
            className="bg-[#2E2A3F] text-white font-bold rounded-full px-8 py-3 shadow-[0_6px_20px_rgba(46,42,63,0.35)] hover:scale-105 active:scale-95 transition"
          >
            Mulai ▶
          </button>
        </div>
      )}

      {(phase === 'play' || phase === 'result') && (
        <div className="w-full max-w-3xl">
          <div className="relative bg-white/60 rounded-[28px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              className="w-full h-auto touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            {phase === 'result' && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="bg-white rounded-3xl px-8 py-6 text-center shadow-xl">
                  <div className="text-xl font-black text-[#2E2A3F]">{roundLabel}</div>
                  <div className="text-3xl font-black text-[#4FBE82] mt-1">+{roundPts}</div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 text-center text-sm font-semibold text-[#5B5470] min-h-[20px]">
            {phase === 'play' && subphase === 'draw' && hint}
            {phase === 'play' && subphase === 'settle' && hint}
            {phase === 'play' && subphase === 'aim' && 'Tarik ragdoll-nya ke belakang, terus lepas!'}
            {phase === 'play' && subphase === 'flight' && 'Ngeluncuuur...'}
          </div>

          {phase === 'play' && subphase === 'draw' && (
            <div className="flex gap-3 justify-center mt-3">
              <button
                onClick={confirmBridge}
                disabled={!canConfirm}
                className="bg-[#2E2A3F] disabled:bg-[#B7B2C9] disabled:cursor-not-allowed text-white font-bold rounded-full px-6 py-2.5 shadow-md hover:scale-105 active:scale-95 transition"
              >
                Selesai Gambar ✓
              </button>
              <button
                onClick={clearDrawing}
                className="bg-white text-[#2E2A3F] font-bold rounded-full px-6 py-2.5 shadow-md hover:bg-[#F3F1FA] transition"
              >
                Ulang Gambar ↻
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'gameover' && (
        <div className="w-full max-w-3xl bg-white rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-8 text-center">
          <div className="text-6xl mb-2">🏁</div>
          <h2 className="text-2xl font-black text-[#2E2A3F] mb-1">Semua Ronde Kelar!</h2>
          <p className="text-[#6B6480] text-sm mb-6">Total skor lo dari {TOTAL_ROUNDS} ronde:</p>
          <div className="text-5xl font-black text-[#2E2A3F] mb-6">{score}</div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={startGame}
              className="bg-[#2E2A3F] text-white font-bold rounded-full px-6 py-3 shadow-md hover:scale-105 active:scale-95 transition"
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