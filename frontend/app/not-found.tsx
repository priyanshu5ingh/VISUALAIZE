'use client';

import React, { useEffect, useRef } from 'react';
import { motion, type Variants, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';

// ─── Minimal Particle Canvas ─────────────────────────────────────────────────
function ParticleField({ reduceMotion }: { reduceMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 55;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.5 + 0.1,
      da: (Math.random() > 0.5 ? 1 : -1) * 0.003,
    }));

    /** Draw a single static frame (grid + fixed dots) — no RAF loop. */
    const drawStatic = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(59,130,246,0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.a.toFixed(2)})`;
        ctx.fill();
      }
    };

    /** Animated frame loop — runs only when motion is allowed. */
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(59,130,246,0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.a += p.da;
        if (p.a > 0.65 || p.a < 0.08) p.da *= -1;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.a.toFixed(2)})`;
        ctx.fill();
      }
      rafId = requestAnimationFrame(tick);
    };

    if (reduceMotion) {
      drawStatic();
    } else {
      tick();
    }

    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', resize); };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

// ─── Staggered digit animation ───────────────────────────────────────────────
/** Full animation variant — used when motion is allowed. */
const digitVariants: Variants = {
  hidden: { opacity: 0, y: 50, filter: 'blur(16px)' },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.85, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

/** Reduced-motion variant — instant opacity fade, no movement or blur. */
const digitVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function NotFound() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion() ?? false;
  return (
    <main
      className="relative w-full min-h-screen bg-slate-950 text-white font-sans overflow-hidden flex items-center justify-center"
      role="main"
    >
      {/* Background layer */}
      <ParticleField reduceMotion={shouldReduceMotion} />

      {/* Glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/12 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/3 w-[320px] h-[220px] bg-purple-600/8 blur-[100px] rounded-full" />
      </div>

      {/* Content — padded, centered, never overflows */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.15 : 0.6 }}
        className="relative z-10 flex flex-col items-center text-center px-6 py-16 w-full max-w-2xl mx-auto"
      >
        {/* Status chip */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.55, delay: shouldReduceMotion ? 0 : 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-10 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md"
          aria-label="404 — Page not found"
        >
          <motion.span
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [1, 0.25, 1] }}
            transition={shouldReduceMotion ? {} : { duration: 1.6, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            aria-hidden="true"
          />
          <span className="text-blue-300 text-xs font-bold tracking-widest uppercase">
            Node Not Found
          </span>
        </motion.div>

        {/* 404 */}
        <h1
          className="text-[clamp(6rem,20vw,14rem)] font-black tracking-tighter leading-none mb-8 select-none"
          aria-label="404 — Page not found"
        >
          {'404'.split('').map((char, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={shouldReduceMotion ? digitVariantsReduced : digitVariants}
              initial="hidden"
              animate="visible"
              className="relative inline-block"
            >
              {/* soft glow duplicate */}
              <span
                aria-hidden="true"
                className="absolute inset-0 text-blue-400 blur-2xl opacity-50 pointer-events-none"
              >
                {char}
              </span>
              <span className="relative bg-clip-text text-transparent bg-gradient-to-b from-white via-blue-100 to-indigo-400">
                {char}
              </span>
            </motion.span>
          ))}
        </h1>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.7, delay: shouldReduceMotion ? 0 : 0.65 }}
          className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 leading-snug"
        >
          You drifted beyond{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            the mapped nodes.
          </span>
        </motion.h2>

        {/* Supporting description */}
        <motion.p
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.7, delay: shouldReduceMotion ? 0 : 0.8 }}
          className="text-slate-400 text-base md:text-lg leading-relaxed font-light max-w-md mb-12"
        >
          The neural pathways couldn&apos;t trace this route. Re-initialize your
          session from the origin node.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.65, delay: shouldReduceMotion ? 0 : 0.95 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <motion.button
            onClick={() => router.push('/')}
            aria-label="Return to VisualAIze home"
            whileHover={{ scale: 1.06, boxShadow: '0 0 32px rgba(79,70,229,0.5)' }}
            whileTap={{ scale: 0.96 }}
            className="group relative flex items-center gap-2.5 px-8 py-3.5 bg-white text-slate-950 font-bold rounded-full text-sm shadow-[0_0_30px_-8px_rgba(255,255,255,0.3)] hover:bg-slate-100 transition-colors overflow-hidden"
          >
            <Home size={16} className="group-hover:scale-110 transition-transform" aria-hidden="true" />
            <span>Return Home</span>
            {/* shimmer */}
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            />
          </motion.button>

          <motion.button
            onClick={() => router.push('/about')}
            aria-label="Learn more about VisualAIze"
            whileHover={{ scale: 1.04, borderColor: 'rgba(255,255,255,0.4)' }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-8 py-3.5 bg-transparent border border-white/20 text-slate-300 font-medium rounded-full text-sm hover:text-white transition-colors backdrop-blur-sm"
          >
            Learn More
          </motion.button>
        </motion.div>

        {/* Footer wordmark */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 1 }}
          className="mt-16 font-mono text-[10px] text-slate-700 tracking-widest uppercase"
          aria-label="VisualAIze branding"
        >
          VISUAL<span className="text-blue-700">AI</span>ZE &nbsp;·&nbsp; ERR 404 &nbsp;·&nbsp; GEMINI 2.5
        </motion.p>
      </motion.div>
    </main>
  );
}
