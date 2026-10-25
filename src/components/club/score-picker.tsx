"use client";

import { useEffect, useRef } from "react";

const ITEM_H = 40;
const VISIBLE = 3;
const MAX_SCORE = 50;

export function isValidPickleballScore(a: number, b: number): boolean {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi < 11) return false;
  if (hi - lo < 2) return false;
  if (hi === 11) return true;
  return hi - lo === 2;
}

export function ScoreDrum({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const containerH = ITEM_H * VISIBLE;
  const padTop = Math.floor(VISIBLE / 2) * ITEM_H;
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scores = Array.from({ length: MAX_SCORE + 1 }, (_, i) => i);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = value * ITEM_H;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(MAX_SCORE, idx));
      ref.current.scrollTop = clamped * ITEM_H;
      onChange(clamped);
    }, 80);
  }

  return (
    <div className="relative rounded-xl border border-white/15 bg-white/5" style={{ height: containerH, width: 56, overflow: "hidden" }}>
      {/* Selection highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 bg-brand-lime/15"
        style={{ top: padTop, height: ITEM_H }}
      />
      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: padTop, background: "linear-gradient(to bottom, rgba(18,30,20,0.9) 0%, transparent 100%)" }}
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ height: padTop, background: "linear-gradient(to top, rgba(18,30,20,0.9) 0%, transparent 100%)" }}
      />

      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <div style={{ height: padTop }} />
        {scores.map((s) => (
          <div
            key={s}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            className={`flex items-center justify-center tabular-nums select-none transition-all ${
              s === value ? "text-xl font-black text-white" : "text-sm font-medium text-white/25"
            }`}
          >
            {s}
          </div>
        ))}
        <div style={{ height: padTop }} />
      </div>
    </div>
  );
}
