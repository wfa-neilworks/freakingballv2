"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SCORE = 30;
const ITEM_H = 48; // px height of each score row

interface ScorePickerProps {
  team1: string;
  team2: string;
  onConfirm: (t1: number, t2: number) => void;
  onCancel: () => void;
}

function Drum({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const scores = Array.from({ length: MAX_SCORE + 1 }, (_, i) => i);

  // Scroll to current value on mount / value change
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: value * ITEM_H, behavior: "smooth" });
  }, [value]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(MAX_SCORE, idx));
    if (clamped !== value) onChange(clamped);
  }

  return (
    <div className="relative h-[192px] w-24 overflow-hidden">
      {/* Selection highlight */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 rounded-xl border border-brand-lime/40 bg-brand-lime/10"
        style={{ top: (192 / 2) - ITEM_H / 2, height: ITEM_H }}
      />
      {/* Fade top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#18251D] to-transparent" />
      {/* Fade bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[#18251D] to-transparent" />

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        {/* Padding so first/last item can center */}
        <div style={{ height: (192 / 2) - ITEM_H / 2 }} />
        {scores.map((s) => (
          <div
            key={s}
            onClick={() => {
              onChange(s);
              listRef.current?.scrollTo({ top: s * ITEM_H, behavior: "smooth" });
            }}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            className="flex cursor-pointer items-center justify-center text-2xl font-bold tabular-nums text-white/70 select-none"
          >
            {s}
          </div>
        ))}
        <div style={{ height: (192 / 2) - ITEM_H / 2 }} />
      </div>
    </div>
  );
}

export function ScorePicker({ team1, team2, onConfirm, onCancel }: ScorePickerProps) {
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full rounded-t-3xl border-t border-white/10 bg-[#18251D] px-6 pb-10 pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-white/40">
          Enter Score
        </p>

        {/* Drums */}
        <div className="flex items-center justify-center gap-4">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-2">
            <p className="max-w-[96px] truncate text-center text-xs font-semibold text-white/60">{team1}</p>
            <Drum value={s1} onChange={setS1} />
          </div>

          <span className="mt-8 text-2xl font-black text-white/20">—</span>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-2">
            <p className="max-w-[96px] truncate text-center text-xs font-semibold text-white/60">{team2}</p>
            <Drum value={s2} onChange={setS2} />
          </div>
        </div>

        {/* Confirm */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/50 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(s1, s2)}
            className="flex-1 rounded-2xl bg-brand-lime py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-lime/90"
          >
            Save  {s1} — {s2}
          </button>
        </div>
      </div>
    </div>
  );
}
