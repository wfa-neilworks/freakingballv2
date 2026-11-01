"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Target,
  TrendingUp,
  Activity,
  Flame,
  Medal,
  Search,
  X,
  ChevronDown,
  Swords,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { PlayerRow } from "@/components/club/stats-leaderboard";
import { HeadToHeadModal, type H2HMember } from "@/components/club/head-to-head-modal";

/* ─── Constants ──────────────────────────────────────────────── */
const PLAY_TYPE_LABELS: Record<string, string> = {
  all:           "All",
  singles:       "Singles",
  doubles:       "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles:  "Open Doubles",
};

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const PAGE_SIZE = 20;

/* ─── Shared surface styles ──────────────────────────────────── */
const CARD_STYLE = {
  background: "rgba(255,255,255,0.035)",
  borderColor: "rgba(255,255,255,0.07)",
} as const;

/* ─── SVG Avatar ─────────────────────────────────────────────── */
function ProfileAvatar({
  name,
  photoUrl,
  rank,
}: {
  name: string;
  photoUrl?: string | null;
  rank: number;
}) {
  const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const ringColor =
    rank === 1 ? "#FACC15" :
    rank === 2 ? "#94A3B8" :
    rank === 3 ? "#CD7F32" :
    "rgba(183,255,114,0.5)";
  const bg =
    rank === 1 ? "rgba(234,179,8,0.18)" :
    rank === 2 ? "rgba(148,163,184,0.14)" :
    rank === 3 ? "rgba(180,120,60,0.16)" :
    "rgba(183,255,114,0.1)";
  const textColor =
    rank === 1 ? "#FACC15" :
    rank === 2 ? "#94A3B8" :
    rank === 3 ? "#CD7F32" :
    "#b7ff72";

  const sharedStyle = {
    border: `3px solid ${ringColor}`,
    boxShadow: `0 0 0 3px ${ringColor}22`,
  };

  if (photoUrl) {
    return (
      <div
        className="h-14 w-14 shrink-0 overflow-hidden rounded-full sm:h-20 sm:w-20"
        style={sharedStyle}
      >
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-black sm:h-20 sm:w-20 sm:text-2xl"
      style={{ ...sharedStyle, background: bg, color: textColor }}
    >
      {initials}
    </div>
  );
}

/* ─── Animated counter ───────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease }}
      className="rounded-2xl border p-4"
      style={CARD_STYLE}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}18` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-black leading-none tabular-nums" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-white/35">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-white/20">{sub}</p>}
    </motion.div>
  );
}

/* ─── Rank ordinal ───────────────────────────────────────────── */
function rankLabel(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/* ─── Win rate arc (SVG) — size-aware ───────────────────────── */
function WinRateArc({ rate, size = 96 }: { rate: number; size?: number }) {
  const half = size / 2;
  const r = half * 0.71;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;
  const sw = size * 0.065;
  const color = rate >= 60 ? "#b7ff72" : rate >= 40 ? "#60a5fa" : "#f87171";
  const fontSize = size >= 80 ? "text-xl" : "text-base";
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={half} cy={half} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <motion.circle
          cx={half} cy={half} r={r}
          fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1, delay: 0.4, ease }}
        />
      </svg>
      <div className="absolute text-center">
        <p className={`${fontSize} font-black tabular-nums leading-none`} style={{ color }}>{rate}%</p>
        <p className="text-[9px] text-white/30 uppercase tracking-wide">win rate</p>
      </div>
    </div>
  );
}

/* ─── Match result row ───────────────────────────────────────── */
function MatchRow({ match, index }: { match: PlayerRow["matches"][number]; index: number }) {
  const date = match.date ? new Date(match.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const oppNames = match.opponent2 ? `${match.opponent1} & ${match.opponent2}` : match.opponent1;
  const isOpenPlay = match.source === "open_play";

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease }}
      className="group flex items-center gap-3 border-b border-white/[0.04] px-4 py-3.5 last:border-0 transition-colors duration-100 hover:bg-white/[0.025]"
    >
      {/* Result dot */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: match.won ? "#b7ff72" : "rgba(248,113,113,0.7)" }}
        />
      </div>

      {/* Opponent + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white/85">
          vs {oppNames}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/30">
          {/* Source badge */}
          {isOpenPlay ? (
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
            >
              Open Play
            </span>
          ) : (
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(183,255,114,0.08)", color: "rgba(183,255,114,0.6)" }}
            >
              Tournament
            </span>
          )}
          <span className="text-white/15">·</span>
          <span>{PLAY_TYPE_LABELS[match.play_type] ?? match.play_type}</span>
          {match.is_playoff && (
            <>
              <span className="text-white/15">·</span>
              <span style={{ color: "#b7ff72" }} className="opacity-70">Playoff</span>
            </>
          )}
          {match.event_name && (
            <>
              <span className="text-white/15">·</span>
              <span className="truncate">{match.event_name}</span>
            </>
          )}
          {date && (
            <>
              <span className="text-white/15">·</span>
              <span>{date}</span>
            </>
          )}
        </div>
      </div>

      {/* Score + W/L */}
      <div className="shrink-0 text-right">
        <p
          className="text-sm font-bold tabular-nums"
          style={{ color: match.won ? "#b7ff72" : "rgba(255,255,255,0.5)" }}
        >
          {match.my_score} – {match.opp_score}
        </p>
        <p
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: match.won ? "rgba(183,255,114,0.6)" : "rgba(248,113,113,0.6)" }}
        >
          {match.won ? "Win" : "Loss"}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Segmented control (reused) ────────────────────────────── */
function Seg({
  options,
  value,
  onChange,
  labelMap,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labelMap: Record<string, string>;
}) {
  return (
    <div
      className="flex shrink-0 overflow-x-auto rounded-xl border border-white/[0.07] p-1"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150"
            style={{
              background: active ? "#b7ff72" : "transparent",
              color: active ? "#18251D" : "rgba(255,255,255,0.35)",
            }}
          >
            {labelMap[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export function PlayerProfileClient({
  player,
  rank,
  totalPlayers,
  allMembers,
}: {
  player: PlayerRow;
  rank: number;
  totalPlayers: number;
  allMembers: H2HMember[];
}) {
  const [matchTypeFilter, setMatchTypeFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState<"all" | "wins" | "losses">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [h2hOpen, setH2hOpen] = useState(false);

  // Overall stats: tournament player_stats + open play match history
  const tournWins   = player.stats.reduce((s, r) => s + r.wins, 0);
  const tournLosses = player.stats.reduce((s, r) => s + r.losses, 0);
  const opWins   = player.matches.filter((m) => m.source === "open_play" && m.won).length;
  const opLosses = player.matches.filter((m) => m.source === "open_play" && !m.won).length;
  const totalWins    = tournWins + opWins;
  const totalLosses  = tournLosses + opLosses;
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  // Current streak
  const sortedMatches = [...player.matches].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  );
  let streak = 0;
  let streakType: "W" | "L" | null = null;
  for (const m of sortedMatches) {
    if (streakType === null) {
      streakType = m.won ? "W" : "L";
      streak = 1;
    } else if ((m.won && streakType === "W") || (!m.won && streakType === "L")) {
      streak++;
    } else {
      break;
    }
  }

  // Titles
  const goldCount   = player.titles.filter((t) => t.title_name === "Gold").length;
  const silverCount = player.titles.filter((t) => t.title_name === "Silver").length;
  const bronzeCount = player.titles.filter((t) => t.title_name === "Bronze").length;
  const titleCount  = goldCount + silverCount + bronzeCount;

  // Available play types in match history
  const availableTypes = ["all", ...Array.from(new Set(player.matches.map((m) => m.play_type)))];

  // Filtered match history
  const filteredMatches = player.matches.filter((m) => {
    if (matchTypeFilter !== "all" && m.play_type !== matchTypeFilter) return false;
    if (resultFilter === "wins"   && !m.won)  return false;
    if (resultFilter === "losses" &&  m.won)  return false;
    if (search && !m.opponent1.toLowerCase().includes(search.toLowerCase()) &&
        !(m.opponent2 ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !m.event_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pagedMatches = filteredMatches.slice(0, page * PAGE_SIZE);
  const hasMore = pagedMatches.length < filteredMatches.length;

  // Reset page when filters change
  function handleTypeChange(v: string) { setMatchTypeFilter(v); setPage(1); }
  function handleResultChange(v: string) { setResultFilter(v as "all" | "wins" | "losses"); setPage(1); }
  function handleSearch(v: string) { setSearch(v); setPage(1); }

  const rankColor =
    rank === 1 ? "#FACC15" :
    rank === 2 ? "#94A3B8" :
    rank === 3 ? "#CD7F32" :
    "#b7ff72";

  return (
    <div className="space-y-6">

      {/* ── Back + H2H button ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease }}
        className="flex items-center justify-between gap-3"
      >
        <BackButton href="/club/stats" label="Player Stats" />
        <button
          onClick={() => setH2hOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.09] px-3.5 py-2 text-sm font-semibold text-white/60 transition-all duration-150 hover:border-brand-lime/30 hover:bg-brand-lime/8 hover:text-brand-lime"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <Swords className="h-4 w-4" />
          Head to Head
        </button>
      </motion.div>

      {/* ── Profile header ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.04, ease }}
        className="rounded-2xl border p-4 sm:p-5"
        style={CARD_STYLE}
      >
        {/* Always a horizontal row — avatar+info left, arc right */}
        <div className="flex items-center gap-4">
          {/* Avatar — smaller on mobile */}
          <div className="shrink-0">
            <ProfileAvatar name={player.full_name} photoUrl={player.photo_url} rank={rank} />
          </div>

          {/* Info — grows to fill */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <h1 className="text-lg font-black leading-tight text-white sm:text-2xl">{player.full_name}</h1>
              {player.nickname && (
                <span className="text-xs text-white/35 sm:text-sm">&ldquo;{player.nickname}&rdquo;</span>
              )}
              {player.is_guest && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white/35"
                  style={{ background: "rgba(255,255,255,0.07)" }}>Guest</span>
              )}
            </div>

            {/* Rank badge */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: `${rankColor}18`, color: rankColor, border: `1px solid ${rankColor}35` }}
              >
                {rankLabel(rank)} of {totalPlayers}
              </span>
              {goldCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "rgba(234,179,8,0.12)", color: "#FACC15", border: "1px solid rgba(234,179,8,0.25)" }}>
                  <Medal className="h-2.5 w-2.5" />{goldCount}G
                </span>
              )}
              {silverCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "rgba(148,163,184,0.12)", color: "#94A3B8", border: "1px solid rgba(148,163,184,0.2)" }}>
                  <Medal className="h-2.5 w-2.5" />{silverCount}S
                </span>
              )}
              {bronzeCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "rgba(180,120,60,0.14)", color: "#CD7F32", border: "1px solid rgba(180,120,60,0.25)" }}>
                  <Medal className="h-2.5 w-2.5" />{bronzeCount}B
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-white/30">
              {totalWins}W · {totalLosses}L · {totalMatches} matches
            </p>
          </div>

          {/* Win rate arc — smaller on mobile */}
          <div className="shrink-0">
            <div className="hidden sm:block"><WinRateArc rate={winRate} size={96} /></div>
            <div className="block sm:hidden"><WinRateArc rate={winRate} size={72} /></div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Activity}   label="Total Matches"  value={totalMatches}  accent="#b7ff72"  delay={0.1} />
        <StatCard icon={TrendingUp} label="Wins"           value={totalWins}     accent="#60a5fa"  delay={0.14} />
        <StatCard icon={Target}     label="Losses"         value={totalLosses}   accent="#f87171"  delay={0.18} />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={streak > 1 ? `${streak}${streakType}` : streak === 1 ? `1${streakType}` : "—"}
          accent={streakType === "W" ? "#b7ff72" : streakType === "L" ? "#f87171" : "rgba(255,255,255,0.3)"}
          delay={0.22}
        />
      </div>

      {/* Titles row (if any) */}
      {titleCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.28, ease }}
          className="rounded-2xl border p-4"
          style={CARD_STYLE}
        >
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400/70" />
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Titles</p>
          </div>
          <div className="space-y-2">
            {player.titles.map((t) => {
              const cfg = {
                Gold:   { color: "#FACC15", bg: "rgba(234,179,8,0.08)"  },
                Silver: { color: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
                Bronze: { color: "#CD7F32", bg: "rgba(180,120,60,0.08)"  },
              }[t.title_name] ?? { color: "#b7ff72", bg: "rgba(183,255,114,0.08)" };
              const date = t.awarded_at ? new Date(t.awarded_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{ background: cfg.bg }}>
                  <Medal className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: cfg.color }}>{t.title_name}</p>
                    {(t.event_name || t.tournament_name) && (
                      <p className="truncate text-[11px] text-white/30">{t.event_name}{t.tournament_name ? ` · ${t.tournament_name}` : ""}</p>
                    )}
                  </div>
                  {date && <span className="shrink-0 text-[11px] text-white/25">{date}</span>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Match History ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3, ease }}
        className="rounded-2xl border"
        style={CARD_STYLE}
      >
        {/* Section header */}
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-lime/60" />
              <h2 className="text-sm font-bold text-white">Match History</h2>
            </div>
            <span className="text-[11px] text-white/25">{filteredMatches.length} match{filteredMatches.length !== 1 ? "es" : ""}</span>
          </div>

          {/* Filters */}
          {player.matches.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Match type */}
                {availableTypes.length > 2 && (
                  <Seg
                    options={availableTypes}
                    value={matchTypeFilter}
                    onChange={handleTypeChange}
                    labelMap={PLAY_TYPE_LABELS}
                  />
                )}
                {/* Win/loss */}
                <Seg
                  options={["all", "wins", "losses"]}
                  value={resultFilter}
                  onChange={handleResultChange}
                  labelMap={{ all: "All", wins: "Wins", losses: "Losses" }}
                />
              </div>

              {/* Search opponents */}
              <div
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] px-3.5 transition-all duration-150 focus-within:border-brand-lime/40 focus-within:shadow-[0_0_0_3px_rgba(183,255,114,0.06)]"
                style={{ height: "38px", background: "rgba(255,255,255,0.03)" }}
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-white/20" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search opponents or events…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
                />
                <AnimatePresence>
                  {search && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.12 }}
                      onClick={() => handleSearch("")}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/30 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Match rows */}
        {filteredMatches.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-white/25">No matches for this filter</p>
          </div>
        ) : (
          <div>
            {pagedMatches.map((m, i) => (
              <MatchRow key={m.id} match={m} index={i} />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="border-t border-white/[0.05] p-3 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1.5 mx-auto rounded-xl px-4 py-2 text-sm font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
                >
                  <ChevronDown className="h-4 w-4" />
                  Load more ({filteredMatches.length - pagedMatches.length} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Head to Head modal ───────────────────────────────── */}
      <HeadToHeadModal
        open={h2hOpen}
        onClose={() => setH2hOpen(false)}
        player={player}
        allMembers={allMembers}
      />
    </div>
  );
}
