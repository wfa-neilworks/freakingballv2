"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight, Medal, TrendingUp } from "lucide-react";
import { PlayerAvatar } from "@/components/club/player-avatar";

/* ─── Constants ──────────────────────────────────────────────── */
const PLAY_TYPE_LABELS: Record<string, string> = {
  all:           "All",
  singles:       "Singles",
  doubles:       "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles:  "Open Doubles",
};

const GENDER_LABELS: Record<string, string> = {
  all:    "All",
  male:   "Male",
  female: "Female",
  other:  "Other",
};

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ─── Types ──────────────────────────────────────────────────── */
type PlayerStat = {
  play_type: string;
  wins: number;
  losses: number;
  points_earned: number;
  points_lost: number;
};

type Title = {
  id: string;
  title_name: string;
  awarded_at: string;
  tournament_event_id: string;
  event_name: string;
  tournament_name: string;
};

type MatchHistory = {
  id: string;
  play_type: string;
  event_name: string;
  tournament_name: string;
  date: string | null;
  opponent1: string;
  opponent2: string | null;
  my_score: number;
  opp_score: number;
  won: boolean;
  is_playoff: boolean;
  source: "tournament" | "open_play";
};

export type PlayerRow = {
  id: string;
  full_name: string;
  nickname: string | null;
  gender: string;
  is_guest: boolean;
  photo_url?: string | null;
  stats: PlayerStat[];
  titles: Title[];
  matches: MatchHistory[];
};

interface Props {
  players: PlayerRow[];
  availablePlayTypes: string[];
  availableGenders: string[];
  playerCount: number;
  /** Override the base path for player profile links. Defaults to /club/stats */
  profileBasePath?: string;
}

/* ─── Segmented control ──────────────────────────────────────── */
function SegmentedControl({
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
            className="relative shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150"
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

/* ─── Medal badge ────────────────────────────────────────────── */
const TITLE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Gold:   { color: "#FACC15", bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.25)" },
  Silver: { color: "#94A3B8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.2)" },
  Bronze: { color: "#CD7F32", bg: "rgba(180,120,60,0.14)",  border: "rgba(180,120,60,0.25)" },
};

function MedalBadge({ title, count }: { title: string; count: number }) {
  const cfg = TITLE_CONFIG[title];
  if (!cfg || count === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <Medal className="h-2.5 w-2.5" />
      {count}
    </span>
  );
}

/* ─── Rank number cell ───────────────────────────────────────── */
const RANK_CFG = {
  1: { bg: "rgba(234,179,8,0.18)",    color: "#FACC15" },
  2: { bg: "rgba(148,163,184,0.14)", color: "#94A3B8" },
  3: { bg: "rgba(180,120,60,0.16)",  color: "#CD7F32" },
} as Record<number, { bg: string; color: string }>;

function RankBubble({ rank }: { rank: number }) {
  const cfg = RANK_CFG[rank];
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums"
      style={
        cfg
          ? { background: cfg.bg, color: cfg.color }
          : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }
      }
    >
      {rank}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export function StatsLeaderboard({ players, availablePlayTypes, availableGenders, playerCount, profileBasePath = "/club/stats" }: Props) {
  const router = useRouter();
  const [playType, setPlayType] = useState("all");
  const [gender, setGender] = useState("all");
  const [search, setSearch] = useState("");

  const playTypeOptions = ["all", ...availablePlayTypes];
  const genderOptions   = ["all", ...availableGenders];

  // Rank + filter — combines tournament player_stats with open play match history
  const ranked = players
    .filter((p) => gender === "all" || p.gender === gender)
    .filter((p) =>
      !search ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.nickname ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .map((p) => {
      const filteredStats = playType === "all" ? p.stats : p.stats.filter((s) => s.play_type === playType);
      const tournWins   = filteredStats.reduce((s, r) => s + r.wins, 0);
      const tournLosses = filteredStats.reduce((s, r) => s + r.losses, 0);

      // Open play wins/losses from match history
      const opMatches = playType === "all"
        ? p.matches.filter((m) => m.source === "open_play")
        : p.matches.filter((m) => m.source === "open_play" && m.play_type === playType);
      const opWins   = opMatches.filter((m) => m.won).length;
      const opLosses = opMatches.filter((m) => !m.won).length;

      const wins   = tournWins + opWins;
      const losses = tournLosses + opLosses;
      const total  = wins + losses;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : -1;
      return { ...p, filteredWins: wins, filteredLosses: losses, filteredTotal: total, winRate };
    })
    .filter((p) => p.filteredTotal > 0)
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.filteredWins - a.filteredWins;
    });

  const noMatchPlayers = players.filter((p) => {
    const filteredStats = playType === "all" ? p.stats : p.stats.filter((s) => s.play_type === playType);
    const tournTotal = filteredStats.reduce((s, r) => s + r.wins + r.losses, 0);
    const opTotal = (playType === "all"
      ? p.matches.filter((m) => m.source === "open_play")
      : p.matches.filter((m) => m.source === "open_play" && m.play_type === playType)
    ).length;
    const total = tournTotal + opTotal;
    const matchesSearch =
      !search ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.nickname ?? "").toLowerCase().includes(search.toLowerCase());
    return total === 0 && (gender === "all" || p.gender === gender) && matchesSearch;
  });

  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(183,255,114,0.12)" }}>
          <TrendingUp className="h-5 w-5 text-brand-lime" />
        </div>
        <div>
          <h1 className="text-xl font-black leading-tight text-white">Player Stats</h1>
          <p className="text-xs text-white/35">{playerCount} player{playerCount !== 1 ? "s" : ""}</p>
        </div>
      </motion.div>

      {/* ── Filter toolbar ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.06, ease }}
        className="flex flex-col gap-2.5"
      >
        {/* Row 1: match type + gender */}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={playTypeOptions}
            value={playType}
            onChange={setPlayType}
            labelMap={PLAY_TYPE_LABELS}
          />
          {genderOptions.length > 2 && (
            <SegmentedControl
              options={genderOptions}
              value={gender}
              onChange={setGender}
              labelMap={GENDER_LABELS}
            />
          )}
        </div>

        {/* Row 2: search */}
        <div
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] px-3.5 transition-all duration-150 focus-within:border-brand-lime/40 focus-within:shadow-[0_0_0_3px_rgba(183,255,114,0.06)]"
          style={{ height: "40px", background: "rgba(255,255,255,0.04)" }}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players by name or nickname…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.12 }}
                onClick={() => setSearch("")}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Leaderboard list ────────────────────────────────── */}
      {ranked.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-dashed border-white/[0.07] py-14 text-center"
        >
          <p className="text-sm text-white/30">No results for this filter</p>
        </motion.div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07]"
          style={{ background: "rgba(255,255,255,0.025)" }}>
          {ranked.map((member, idx) => {
            const rank = idx + 1;
            const goldCount   = member.titles.filter((t) => t.title_name === "Gold").length;
            const silverCount = member.titles.filter((t) => t.title_name === "Silver").length;
            const bronzeCount = member.titles.filter((t) => t.title_name === "Bronze").length;
            const isLast = idx === ranked.length - 1;

            const winRateColor =
              member.winRate >= 60 ? "#b7ff72" :
              member.winRate >= 40 ? "rgba(255,255,255,0.8)" :
              "#f87171";

            return (
              <motion.button
                key={member.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.1 + idx * 0.04, ease }}
                onClick={() => router.push(`${profileBasePath}/${member.id}`)}
                className={`group w-full px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.03] ${
                  !isLast ? "border-b border-white/[0.05]" : ""
                } ${rank === 1 ? "bg-yellow-400/[0.03]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <RankBubble rank={rank} />

                  {/* Avatar */}
                  <PlayerAvatar
                    name={member.full_name}
                    photoUrl={member.photo_url}
                    size="sm"
                    className={member.photo_url ? "" : (
                      rank === 1 ? "bg-yellow-400/15 text-yellow-300" :
                      rank === 2 ? "bg-slate-400/12 text-slate-300" :
                      rank === 3 ? "bg-orange-400/12 text-orange-300" :
                      "bg-white/6 text-white/30"
                    )}
                  />

                  {/* Name + medals */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="text-sm font-semibold leading-tight text-white/90 group-hover:text-white transition-colors">
                        {member.full_name}
                      </span>
                      {member.nickname && (
                        <span className="text-[11px] text-white/30">&ldquo;{member.nickname}&rdquo;</span>
                      )}
                      {member.is_guest && (
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white/30"
                          style={{ background: "rgba(255,255,255,0.06)" }}>Guest</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-white/30">
                        {member.filteredWins}W · {member.filteredLosses}L
                      </span>
                      <span className="text-[10px] text-white/15">·</span>
                      <span className="text-[11px] text-white/20">{member.filteredTotal} matches</span>
                      <MedalBadge title="Gold"   count={goldCount} />
                      <MedalBadge title="Silver" count={silverCount} />
                      <MedalBadge title="Bronze" count={bronzeCount} />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-9 w-px shrink-0 bg-white/[0.07]" />

                  {/* Win rate */}
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-black tabular-nums leading-none" style={{ color: winRateColor }}>
                      {member.winRate}%
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/25">win rate</p>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="h-4 w-4 shrink-0 -translate-x-0.5 text-white/15 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-white/40" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Players with no matches ──────────────────────────── */}
      {noMatchPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">
            No matches yet
          </p>
          <div className="overflow-hidden rounded-2xl border border-white/[0.05]"
            style={{ background: "rgba(255,255,255,0.015)" }}>
            {noMatchPlayers.map((member, idx) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx !== noMatchPlayers.length - 1 ? "border-b border-white/[0.04]" : ""}`}
              >
                <PlayerAvatar
                  name={member.full_name}
                  photoUrl={member.photo_url}
                  size="sm"
                  className={member.photo_url ? "" : "bg-white/4 text-white/15"}
                />
                <span className="text-sm text-white/30">{member.full_name}</span>
                {member.is_guest && (
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white/25"
                    style={{ background: "rgba(255,255,255,0.05)" }}>Guest</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
