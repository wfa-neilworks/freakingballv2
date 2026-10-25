"use client";

import { useEffect, useRef, useState } from "react";

const ITEM_H = 52;
const VISIBLE = 5; // rows visible in drum (must be odd)
const MAX_SCORE = 50;

interface ScorePickerProps {
  team1: string;
  team2: string;
  onConfirm: (t1: number, t2: number) => void;
  onCancel: () => void;
}

function isValidPickleballScore(a: number, b: number): boolean {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi < 11) return false;         // nobody reached 11 yet
  if (hi - lo < 2) return false;     // must win by 2
  if (hi === 11) return true;        // clean 11 win (lo <= 9)
  // above 11: both could be in deuce territory — lo must be hi-2
  return hi - lo === 2;
}

function Drum({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const containerH = ITEM_H * VISIBLE;
  const ref = useRef<HTMLDivElement>(null);
  const scores = Array.from({ length: MAX_SCORE + 1 }, (_, i) => i);
  const isScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to value whenever it changes externally
  useEffect(() => {
    if (!ref.current || isScrolling.current) return;
    ref.current.scrollTop = value * ITEM_H;
  }, [value]);

  function handleScroll() {
    isScrolling.current = true;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      isScrolling.current = false;
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(MAX_SCORE, idx));
      // Snap
      ref.current.scrollTop = clamped * ITEM_H;
      onChange(clamped);
    }, 80);
  }

  const padTop = Math.floor(VISIBLE / 2) * ITEM_H;

  return (
    <div className="relative" style={{ height: containerH, width: 88, overflow: "hidden" }}>
      {/* Selection highlight bar */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 rounded-xl border border-white/20 bg-white/8"
        style={{ top: Math.floor(VISIBLE / 2) * ITEM_H, height: ITEM_H }}
      />
      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: padTop, background: "linear-gradient(to bottom, #18251D 20%, transparent)" }}
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ height: padTop, background: "linear-gradient(to top, #18251D 20%, transparent)" }}
      />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Top padding so 0 can center */}
        <div style={{ height: padTop }} />

        {scores.map((s) => {
          const isSelected = s === value;
          return (
            <div
              key={s}
              style={{ height: ITEM_H, scrollSnapAlign: "center" }}
              className={`flex items-center justify-center tabular-nums transition-all select-none ${
                isSelected
                  ? "text-3xl font-black text-white"
                  : "text-xl font-semibold text-white/30"
              }`}
            >
              {s}
            </div>
          );
        })}

        {/* Bottom padding */}
        <div style={{ height: padTop }} />
      </div>
    </div>
  );
}

export function ScorePicker({ team1, team2, onConfirm, onCancel }: ScorePickerProps) {
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);

  const valid = isValidPickleballScore(s1, s2);

  let hint = "";
  if (s1 === 0 && s2 === 0) hint = "";
  else if (!valid) {
    const hi = Math.max(s1, s2);
    const lo = Math.min(s1, s2);
    if (hi < 11) hint = `Need at least 11 to win`;
    else if (hi - lo === 1) hint = `Win by 2 — keep scrolling`;
    else if (hi - lo === 0) hint = `It's tied — someone must win by 2`;
    else hint = `Win by exactly 2 points`;
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full rounded-t-3xl border-t border-white/10 bg-[#18251D] px-6 pb-10 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Enter Score
        </p>

        {/* Team labels */}
        <div className="mb-4 flex items-center justify-center gap-8">
          <p className="w-20 truncate text-center text-xs font-semibold text-white/70">{team1}</p>
          <div className="w-6" />
          <p className="w-20 truncate text-center text-xs font-semibold text-white/70">{team2}</p>
        </div>

        {/* Drums */}
        <div className="flex items-center justify-center gap-4">
          <Drum value={s1} onChange={setS1} />
          <span className="mb-1 text-2xl font-black text-white/20">—</span>
          <Drum value={s2} onChange={setS2} />
        </div>

        {/* Hint */}
        <div className="mt-3 h-5 text-center">
          {hint && <p className="text-xs text-yellow-400/80">{hint}</p>}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-white/10 py-3.5 text-sm font-semibold text-white/50 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => valid && onConfirm(s1, s2)}
            disabled={!valid}
            className="flex-1 rounded-2xl bg-brand-lime py-3.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-lime/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save  {s1} — {s2}
          </button>
        </div>
      </div>
    </div>
  );
}
