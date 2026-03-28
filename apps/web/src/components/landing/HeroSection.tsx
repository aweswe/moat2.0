"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const HEADLINE_WORDS = ["Record.", "Replay.", "Fix."];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex(i => (i + 1) % HEADLINE_WORDS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // Animated dot grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gap = 56;
      const cols = Math.ceil(canvas.width / gap);
      const rows = Math.ceil(canvas.height / gap);
      const isDark = document.documentElement.classList.contains("dark");
      const baseAlpha = isDark ? 0.18 : 0.12;

      for (let x = 0; x <= cols; x++) {
        for (let y = 0; y <= rows; y++) {
          const px = x * gap;
          const py = y * gap;
          const dist = Math.sqrt(
            Math.pow(px - canvas.width / 2, 2) + Math.pow(py - canvas.height / 2, 2)
          );
          const pulse = Math.sin(t * 0.015 - dist * 0.012) * 0.5 + 0.5;
          const alpha = baseAlpha * pulse;
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
          ctx.fill();
        }
      }
      t++;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 mb-14 opacity-0 translate-y-3"
          style={{
            animation: revealed ? "fadeUp 0.6s ease forwards 0.2s" : "none",
          }}
        >
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-[0.25em] border border-border px-3 py-1.5 rounded-full bg-card">
            Early Access
          </span>
        </div>

        {/* Main headline */}
        <div
          className="opacity-0 translate-y-6"
          style={{
            animation: revealed ? "fadeUp 0.8s ease forwards 0.35s" : "none",
          }}
        >
          <h1 className="text-[clamp(52px,7.5vw,104px)] font-bold leading-[1.0] tracking-tight text-foreground">
            Your agent ran.
          </h1>
          <h1 className="text-[clamp(52px,7.5vw,104px)] font-bold leading-[1.0] tracking-tight text-muted-foreground mt-1 min-h-[1.2em]">
            <span key={wordIndex} style={{ animation: "fadeUp 0.5s ease forwards" }}>
              {HEADLINE_WORDS[wordIndex]}
            </span>
          </h1>
        </div>

        {/* Sub */}
        <p
          className="mt-10 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed opacity-0"
          style={{
            animation: revealed ? "fadeUp 0.8s ease forwards 0.65s" : "none",
          }}
        >
          You can&apos;t debug what you didn&apos;t record. AgentTrace records everything, so nothing is a mystery.
        </p>

        {/* CTA */}
        <div
          className="mt-12 flex items-center justify-center gap-5 opacity-0"
          style={{
            animation: revealed ? "fadeUp 0.8s ease forwards 0.85s" : "none",
          }}
        >
          <Link href="/signup">
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link
            href="/#demo"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            See how it works ↓
          </Link>
        </div>

        {/* Social proof micro-line */}
        <p
          className="mt-10 text-xs text-muted-foreground/50 font-mono tracking-widest uppercase opacity-0"
          style={{
            animation: revealed ? "fadeUp 0.6s ease forwards 1.1s" : "none",
          }}
        >
          No credit card · 5 min setup · Python & Node
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-60">
        <div
          className="w-px bg-border opacity-0"
          style={{
            height: 56,
            animation: revealed ? "fadeUp 0.6s ease forwards 1.3s" : "none",
          }}
        />
      </div>
    </section>
  );
}
