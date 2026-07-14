"use client";

import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";

export type ConfettiHandle = { burst: (x: number, y: number) => void };

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  rotation: number;
  vr: number;
};

const COLORS = ["#FFB4C6", "#A8E6C9", "#A0D8F1", "#FFE39A", "#D4C1F9"];

const ConfettiLayer = forwardRef<ConfettiHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.vy += 0.25; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.life -= 1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(p.life / 60, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    burst(x: number, y: number) {
      const count = 28;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 3 + Math.random() * 5;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          size: 6 + Math.random() * 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 50 + Math.random() * 20,
          rotation: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
        });
      }
    },
  }));

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
});

ConfettiLayer.displayName = "ConfettiLayer";
export default ConfettiLayer;