"use client";

import { useState } from "react";
import { Trophy, Calendar, MapPin, Layers, ChevronDown, ChevronUp } from "lucide-react";

interface EventHeaderCardProps {
  event: {
    name: string;
    play_type: string;
    doubles_category: string | null;
    num_courts: number;
    num_pools: number;
    location: string;
    status: string;
  };
  tournamentName: string;
  sc: { bg: string; text: string; ring: string; dot: string; label: string };
  eventDate: Date;
  playTypeLabel: Record<string, string>;
}

export function EventHeaderCard({ event, tournamentName, sc, eventDate, playTypeLabel }: EventHeaderCardProps) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = eventDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = eventDate.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)" }}>
      {/* Always-visible top row */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-lime/10 ring-1 ring-brand-lime/20">
          <Trophy className="h-5 w-5 text-brand-lime" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black leading-tight text-white">{event.name}</h1>
          {/* Compact summary line */}
          <p className="mt-0.5 truncate text-xs text-white/40">
            <span className="capitalize">{playTypeLabel[event.play_type] ?? event.play_type}</span>
            {event.doubles_category && <span className="ml-1 text-white/25">· {event.doubles_category}</span>}
            <span className="mx-1 text-white/20">·</span>
            {event.num_courts}C / {event.num_pools}P
            <span className="mx-1 text-white/20">·</span>
            {dateStr}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${event.status === "active" ? "animate-pulse" : ""}`} />
            {sc.label}
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/8 hover:text-white/60"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expandable detail cards */}
      {expanded && (
        <div className="grid grid-cols-3 gap-2 border-t border-white/6 p-4 pt-3">
          <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-white/35">
              <Calendar className="h-3 w-3 text-brand-lime/60" />
              <span className="text-[10px] uppercase tracking-wide">Date</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-white">{dateStr}</p>
            <p className="text-[11px] text-white/35">{timeStr}</p>
          </div>

          <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-white/35">
              <MapPin className="h-3 w-3 text-brand-lime/60" />
              <span className="text-[10px] uppercase tracking-wide">Venue</span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-tight text-white">{event.location}</p>
          </div>

          <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-white/35">
              <Layers className="h-3 w-3 text-brand-lime/60" />
              <span className="text-[10px] uppercase tracking-wide">Format</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-white">{event.num_courts} Court{event.num_courts > 1 ? "s" : ""}</p>
            <p className="text-[11px] text-white/35">{event.num_pools} Pool{event.num_pools > 1 ? "s" : ""}</p>
          </div>
        </div>
      )}
    </div>
  );
}
