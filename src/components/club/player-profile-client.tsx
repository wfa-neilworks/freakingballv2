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
  Star,
  ChevronRight,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import type { PlayerRow, OpenPlayAward } from "@/components/club/stats-leaderboard";
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

const CARD_STYLE = {
  background: "rgba(255,255,255,0.035)",
  borderColor: "rgba(255,255,255,0.07)",
} as const;

/* ─── Title medal config ─────────────────────────────────────── */
const TITLE_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Gold:   { color: "#FACC15", bg: "rgba(234,179,8,0.09)",   border: "rgba(234,179,8,0.22)"   },
  Silver: { color: "#94A3B8", bg: "rgba(148,163,184,0.09)", border: "rgba(148,163,184,0.18)" },
  Bronze: { color: "#CD7F32", bg: "rgba(180,120,60,0.09)",  border: "rgba(180,120,60,0.22)"  },
};

const AWARD_CFG: Record<1 | 2 | 3, { color: string; bg: string; border: string; label: string }> = {
  1: { color: "#FACC15", bg: "rgba(234,179,8,0.09)",   border: "rgba(234,179,8,0.22)",   label: "1st Place" },
  2: { color: "#94A3B8", bg: "rgba(148,163,184,0.09)", border: "rgba(148,163,184,0.18)", label: "2nd Place" },
  3: { color: "#CD7F32", bg: "rgba(180,120,60,0.09)",  border: "rgba(180,120,60,0.22)",  label: "3rd Place" },
};

/* ─── ProfileAvatar ──────────────────────────────────────────── */
function ProfileAvatar({ name, photoUrl, rank }: { name: string; photoUrl?: string | null; rank: number }) {
  const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const ringColor = rank === 1 ? "#FACC15" : rank === 2 ? "#94A3B8" : rank === 3 ? "#CD7F32" : "rgba(183,255,114,0.5)";
  const bg        = rank === 1 ? "rgba(234,179,8,0.18)" : rank === 2 ? "rgba(148,163,184,0.14)" : rank === 3 ? "rgba(180,120,60,0.16)" : "rgba(183,255,114,0.1)";
  const textColor = rank === 1 ? "#FACC15" : rank === 2 ? "#94A3B8" : rank === 3 ? "#CD7F32" : "#b7ff72";
  const sharedStyle = { border: `3px solid ${ringColor}`, boxShadow: `0 0 0 3px ${ringColor}22` };

  if (photoUrl) {
    return (
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full sm:h-20 sm:w-20" style={sharedStyle}>
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-black sm:h-20 sm:w-20 sm:text-2xl"
      style={{ ...sharedStyle, background: bg, color: textColor }}>
      {initials}
    </div>
  );
}

/* ─── StatCard ───────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent, sub, delay }: {
  icon: React.ElementType; label: string; value: string | number;
  accent: string; sub?: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease }}
      className="rounded-2xl border p-4" style={CARD_STYLE}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}18` }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <p className="mt-3 text-2xl font-black leading-none tabular-nums" style={{ color: accent }}>{value}</p>
      <p className="mt-1 text-[11px] text-white/35">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-white/20">{sub}</p>}
    </motion.div>
  );
}

/* ─── Rank ordinal ───────────────────────────────────────────── */
function rankLabel(n: number) {
  if (n === 1) return "1st"; if (n === 2) return "2nd"; if (n === 3) return "3rd"; return `${n}th`;
}

/* ─── WinRateArc ─────────────────────────────────────────────── */
function WinRateArc({ rate, size = 96 }: { rate: number; size?: number }) {
  const half = size / 2, r = half * 0.71, circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ, sw = size * 0.065;
  const color = rate >= 60 ? "#b7ff72" : rate >= 40 ? "#60a5fa" : "#f87171";
  const fontSize = size >= 80 ? "text-xl" : "text-base";
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={half} cy={half} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <motion.circle cx={half} cy={half} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1, delay: 0.4, ease }} />
      </svg>
      <div className="absolute text-center">
        <p className={`${fontSize} font-black tabular-nums leading-none`} style={{ color }}>{rate}%</p>
        <p className="text-[9px] text-white/30 uppercase tracking-wide">win rate</p>
      </div>
    </div>
  );
}

/* ─── MatchRow ───────────────────────────────────────────────── */
function MatchRow({ match, index }: { match: PlayerRow["matches"][number]; index: number }) {
  const date = match.date ? new Date(match.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const oppNames = match.opponent2 ? `${match.opponent1} & ${match.opponent2}` : match.opponent1;
  const isOpenPlay = match.source === "open_play";
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease }}
      className="group flex items-center gap-3 border-b border-white/[0.04] px-4 py-3.5 last:border-0 transition-colors duration-100 hover:bg-white/[0.025]"
    >
      <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: match.won ? "#b7ff72" : "rgba(248,113,113,0.7)" }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white/85">vs {oppNames}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/30">
          {isOpenPlay ? (
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>Open Play</span>
          ) : (
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(183,255,114,0.08)", color: "rgba(183,255,114,0.6)" }}>Tournament</span>
          )}
          <span className="text-white/15">·</span>
          <span>{PLAY_TYPE_LABELS[match.play_type] ?? match.play_type}</span>
          {match.is_playoff && <><span className="text-white/15">·</span><span style={{ color: "#b7ff72" }} className="opacity-70">Playoff</span></>}
          {match.event_name && <><span className="text-white/15">·</span><span className="truncate">{match.event_name}</span></>}
          {date && <><span className="text-white/15">·</span><span>{date}</span></>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums" style={{ color: match.won ? "#b7ff72" : "rgba(255,255,255,0.5)" }}>
          {match.my_score} – {match.opp_score}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: match.won ? "rgba(183,255,114,0.6)" : "rgba(248,113,113,0.6)" }}>
          {match.won ? "Win" : "Loss"}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Segmented control ──────────────────────────────────────── */
function Seg({ options, value, onChange, labelMap }: {
  options: string[]; value: string; onChange: (v: string) => void; labelMap: Record<string, string>;
}) {
  return (
    <div className="flex shrink-0 overflow-x-auto rounded-xl border border-white/[0.07] p-1" style={{ background: "rgba(255,255,255,0.03)" }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button key={opt} onClick={() => onChange(opt)}
            className="shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150"
            style={{ background: active ? "#b7ff72" : "transparent", color: active ? "#18251D" : "rgba(255,255,255,0.35)" }}>
            {labelMap[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Achievements Modal ─────────────────────────────────────── */
function AchievementsModal({
  open, onClose, titles, openPlayAwards,
}: {
  open: boolean;
  onClose: () => void;
  titles: PlayerRow["titles"];
  openPlayAwards: OpenPlayAward[];
}) {
  const [tab, setTab] = useState<"titles" | "open_play">("titles");

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet — bottom on mobile, centered on sm+ */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.28, ease }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-white/[0.08] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:rounded-2xl sm:border"
            style={{
              background: "rgba(14,22,16,0.97)",
              borderColor: "rgba(255,255,255,0.08)",
              maxHeight: "85dvh",
            }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(234,179,8,0.12)" }}>
                <Trophy className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white">Achievements</h2>
                <p className="text-[11px] text-white/35">{titles.length} title{titles.length !== 1 ? "s" : ""} · {openPlayAwards.length} open play award{openPlayAwards.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={onClose}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/8 hover:text-white/70">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="shrink-0 border-b border-white/[0.06] px-5 pt-3 pb-0">
              <div className="flex gap-0">
                {(["titles", "open_play"] as const).map((t) => {
                  const active = tab === t;
                  const label = t === "titles" ? "Titles" : "Open Play";
                  const count = t === "titles" ? titles.length : openPlayAwards.length;
                  return (
                    <button key={t} onClick={() => setTab(t)}
                      className="relative flex items-center gap-1.5 px-4 pb-3 text-[13px] font-semibold transition-colors duration-150"
                      style={{ color: active ? "#b7ff72" : "rgba(255,255,255,0.35)" }}
                    >
                      {label}
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                        style={{
                          background: active ? "rgba(183,255,114,0.15)" : "rgba(255,255,255,0.07)",
                          color: active ? "#b7ff72" : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {count}
                      </span>
                      {active && (
                        <motion.div
                          layoutId="achievements-tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                          style={{ background: "#b7ff72" }}
                          transition={{ duration: 0.2, ease }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence mode="wait">
                {tab === "titles" && (
                  <motion.div key="titles"
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {titles.length === 0 ? (
                      <div className="py-10 text-center">
                        <Trophy className="mx-auto mb-2 h-8 w-8 text-white/10" />
                        <p className="text-sm text-white/25">No tournament titles yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {titles.map((t) => {
                          const cfg = TITLE_CFG[t.title_name] ?? { color: "#b7ff72", bg: "rgba(183,255,114,0.08)", border: "rgba(183,255,114,0.15)" };
                          const date = t.awarded_at ? new Date(t.awarded_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;
                          return (
                            <div key={t.id} className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
                              style={{ background: cfg.bg, borderColor: cfg.border }}>
                              <Medal className="h-5 w-5 shrink-0" style={{ color: cfg.color }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold leading-tight" style={{ color: cfg.color }}>{t.title_name}</p>
                                {(t.event_name || t.tournament_name) && (
                                  <p className="mt-0.5 truncate text-[11px] text-white/35">
                                    {t.event_name}{t.tournament_name ? ` · ${t.tournament_name}` : ""}
                                  </p>
                                )}
                              </div>
                              {date && <span className="shrink-0 text-[11px] text-white/25">{date}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {tab === "open_play" && (
                  <motion.div key="open_play"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {openPlayAwards.length === 0 ? (
                      <div className="py-10 text-center">
                        <Star className="mx-auto mb-2 h-8 w-8 text-white/10" />
                        <p className="text-sm text-white/25">No open play awards yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {openPlayAwards.map((a) => {
                          const cfg = AWARD_CFG[a.place];
                          const date = a.date ? new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
                          return (
                            <div key={a.session_id} className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
                              style={{ background: cfg.bg, borderColor: cfg.border }}>
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: `${cfg.color}18` }}>
                                <Medal className="h-4 w-4" style={{ color: cfg.color }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold leading-tight" style={{ color: cfg.color }}>{cfg.label}</p>
                                <p className="mt-0.5 truncate text-[11px] text-white/35">
                                  {a.session_name} · {a.wins}W {a.losses}L
                                </p>
                              </div>
                              {date && <span className="shrink-0 text-[11px] text-white/25">{date}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Compact Achievements summary card ──────────────────────── */
function AchievementsCard({
  titles, openPlayAwards, onViewAll,
}: {
  titles: PlayerRow["titles"];
  openPlayAwards: OpenPlayAward[];
  onViewAll: () => void;
}) {
  const totalCount = titles.length + openPlayAwards.length;

  // Most notable preview items (up to 3 total, prefer gold first)
  const goldTitles   = titles.filter((t) => t.title_name === "Gold");
  const silverTitles = titles.filter((t) => t.title_name === "Silver");
  const bronzeTitles = titles.filter((t) => t.title_name === "Bronze");
  const gold1st   = openPlayAwards.filter((a) => a.place === 1);
  const silver2nd = openPlayAwards.filter((a) => a.place === 2);
  const bronze3rd = openPlayAwards.filter((a) => a.place === 3);

  type PreviewItem = { key: string; color: string; label: string; count: number };
  const preview: PreviewItem[] = [];
  if (goldTitles.length)   preview.push({ key: "gt", color: "#FACC15", label: "Gold",     count: goldTitles.length });
  if (silverTitles.length) preview.push({ key: "st", color: "#94A3B8", label: "Silver",   count: silverTitles.length });
  if (bronzeTitles.length) preview.push({ key: "bt", color: "#CD7F32", label: "Bronze",   count: bronzeTitles.length });
  if (gold1st.length)      preview.push({ key: "g1", color: "#FACC15", label: "1st Place", count: gold1st.length });
  if (silver2nd.length)    preview.push({ key: "s2", color: "#94A3B8", label: "2nd Place", count: silver2nd.length });
  if (bronze3rd.length)    preview.push({ key: "b3", color: "#CD7F32", label: "3rd Place", count: bronze3rd.length });

  if (totalCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.26, ease }}
      className="rounded-2xl border" style={CARD_STYLE}
    >
      <button
        onClick={onViewAll}
        className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-white/[0.02] rounded-2xl"
      >
        {/* Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(234,179,8,0.12)" }}>
          <Trophy className="h-4 w-4 text-yellow-400" />
        </div>

        {/* Label + preview pills */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Achievements</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
            >
              {totalCount}
            </span>
          </div>
          {/* Category counters */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {titles.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(234,179,8,0.1)", color: "rgba(234,179,8,0.8)" }}>
                <Trophy className="h-2.5 w-2.5" />{titles.length} Title{titles.length !== 1 ? "s" : ""}
              </span>
            )}
            {openPlayAwards.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(96,165,250,0.1)", color: "rgba(96,165,250,0.8)" }}>
                <Star className="h-2.5 w-2.5" />{openPlayAwards.length} Open Play
              </span>
            )}
            {/* Medal preview chips */}
            {preview.slice(0, 4).map((p) => (
              <span key={p.key} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: `${p.color}14`, color: p.color }}>
                <Medal className="h-2.5 w-2.5" />{p.count}× {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
      </button>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export function PlayerProfileClient({
  player, rank, totalPlayers, allMembers, backHref = "/club/stats",
}: {
  player: PlayerRow;
  rank: number;
  totalPlayers: number;
  allMembers: H2HMember[];
  backHref?: string;
}) {
  const [matchTypeFilter, setMatchTypeFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState<"all" | "wins" | "losses">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [h2hOpen, setH2hOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  // Stats
  const tournWins   = player.stats.reduce((s, r) => s + r.wins, 0);
  const tournLosses = player.stats.reduce((s, r) => s + r.losses, 0);
  const opWins   = player.matches.filter((m) => m.source === "open_play" && m.won).length;
  const opLosses = player.matches.filter((m) => m.source === "open_play" && !m.won).length;
  const totalWins    = tournWins + opWins;
  const totalLosses  = tournLosses + opLosses;
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  // Streak
  const sortedMatches = [...player.matches].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  let streak = 0, streakType: "W" | "L" | null = null;
  for (const m of sortedMatches) {
    if (streakType === null) { streakType = m.won ? "W" : "L"; streak = 1; }
    else if ((m.won && streakType === "W") || (!m.won && streakType === "L")) streak++;
    else break;
  }

  // Titles summary (for header badges)
  const goldCount   = player.titles.filter((t) => t.title_name === "Gold").length;
  const silverCount = player.titles.filter((t) => t.title_name === "Silver").length;
  const bronzeCount = player.titles.filter((t) => t.title_name === "Bronze").length;

  const openPlayAwards = player.openPlayAwards ?? [];
  const totalAchievements = player.titles.length + openPlayAwards.length;

  // Match filters
  const availableTypes = ["all", ...Array.from(new Set(player.matches.map((m) => m.play_type)))];
  const filteredMatches = player.matches.filter((m) => {
    if (matchTypeFilter !== "all" && m.play_type !== matchTypeFilter) return false;
    if (resultFilter === "wins"   && !m.won) return false;
    if (resultFilter === "losses" &&  m.won) return false;
    if (search && !m.opponent1.toLowerCase().includes(search.toLowerCase()) &&
        !(m.opponent2 ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !m.event_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const pagedMatches = filteredMatches.slice(0, page * PAGE_SIZE);
  const hasMore = pagedMatches.length < filteredMatches.length;

  function handleTypeChange(v: string)   { setMatchTypeFilter(v); setPage(1); }
  function handleResultChange(v: string) { setResultFilter(v as "all" | "wins" | "losses"); setPage(1); }
  function handleSearch(v: string)       { setSearch(v); setPage(1); }

  const rankColor = rank === 1 ? "#FACC15" : rank === 2 ? "#94A3B8" : rank === 3 ? "#CD7F32" : "#b7ff72";

  return (
    <div className="space-y-4">

      {/* ── Back + H2H ───────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease }}
        className="flex items-center justify-between gap-3">
        <BackButton href={backHref} label="Player Stats" />
        <button onClick={() => setH2hOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.09] px-3.5 py-2 text-sm font-semibold text-white/60 transition-all duration-150 hover:border-brand-lime/30 hover:bg-brand-lime/8 hover:text-brand-lime"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <Swords className="h-4 w-4" />
          Head to Head
        </button>
      </motion.div>

      {/* ── Profile header ───────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.04, ease }}
        className="rounded-2xl border p-4 sm:p-5" style={CARD_STYLE}>
        <div className="flex items-center gap-4">
          <ProfileAvatar name={player.full_name} photoUrl={player.photo_url} rank={rank} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <h1 className="text-lg font-black leading-tight text-white sm:text-2xl">{player.full_name}</h1>
              {player.nickname && <span className="text-xs text-white/35 sm:text-sm">&ldquo;{player.nickname}&rdquo;</span>}
              {player.is_guest && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white/35"
                  style={{ background: "rgba(255,255,255,0.07)" }}>Guest</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: `${rankColor}18`, color: rankColor, border: `1px solid ${rankColor}35` }}>
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
              {totalAchievements > 0 && !goldCount && !silverCount && !bronzeCount && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>
                  <Star className="h-2.5 w-2.5" />{totalAchievements}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-white/30">{totalWins}W · {totalLosses}L · {totalMatches} matches</p>
          </div>
          <div className="shrink-0">
            <div className="hidden sm:block"><WinRateArc rate={winRate} size={96} /></div>
            <div className="block sm:hidden"><WinRateArc rate={winRate} size={72} /></div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Activity}   label="Total Matches"  value={totalMatches} accent="#b7ff72" delay={0.1} />
        <StatCard icon={TrendingUp} label="Wins"           value={totalWins}    accent="#60a5fa" delay={0.14} />
        <StatCard icon={Target}     label="Losses"         value={totalLosses}  accent="#f87171" delay={0.18} />
        <StatCard
          icon={Flame} label="Current Streak"
          value={streak > 0 ? `${streak}${streakType}` : "—"}
          accent={streakType === "W" ? "#b7ff72" : streakType === "L" ? "#f87171" : "rgba(255,255,255,0.3)"}
          delay={0.22}
        />
      </div>

      {/* ── Achievements compact card ─────────────────────────── */}
      <AchievementsCard
        titles={player.titles}
        openPlayAwards={openPlayAwards}
        onViewAll={() => setAchievementsOpen(true)}
      />

      {/* ── Match History ────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3, ease }}
        className="rounded-2xl border" style={CARD_STYLE}>
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-lime/60" />
              <h2 className="text-sm font-bold text-white">Match History</h2>
            </div>
            <span className="text-[11px] text-white/25">{filteredMatches.length} match{filteredMatches.length !== 1 ? "es" : ""}</span>
          </div>
          {player.matches.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {availableTypes.length > 2 && (
                  <Seg options={availableTypes} value={matchTypeFilter} onChange={handleTypeChange} labelMap={PLAY_TYPE_LABELS} />
                )}
                <Seg options={["all", "wins", "losses"]} value={resultFilter} onChange={handleResultChange}
                  labelMap={{ all: "All", wins: "Wins", losses: "Losses" }} />
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] px-3.5 transition-all duration-150 focus-within:border-brand-lime/40 focus-within:shadow-[0_0_0_3px_rgba(183,255,114,0.06)]"
                style={{ height: "38px", background: "rgba(255,255,255,0.03)" }}>
                <Search className="h-3.5 w-3.5 shrink-0 text-white/20" />
                <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search opponents or events…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none" />
                <AnimatePresence>
                  {search && (
                    <motion.button initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}
                      onClick={() => handleSearch("")}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/30 hover:bg-white/10 hover:text-white">
                      <X className="h-3 w-3" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {filteredMatches.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-white/25">No matches for this filter</p>
          </div>
        ) : (
          <div>
            {pagedMatches.map((m, i) => <MatchRow key={m.id} match={m} index={i} />)}
            {hasMore && (
              <div className="border-t border-white/[0.05] p-3 text-center">
                <button onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1.5 mx-auto rounded-xl px-4 py-2 text-sm font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/70">
                  <ChevronDown className="h-4 w-4" />
                  Load more ({filteredMatches.length - pagedMatches.length} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <AchievementsModal
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        titles={player.titles}
        openPlayAwards={openPlayAwards}
      />
      <HeadToHeadModal
        open={h2hOpen}
        onClose={() => setH2hOpen(false)}
        player={player}
        allMembers={allMembers}
      />
    </div>
  );
}
