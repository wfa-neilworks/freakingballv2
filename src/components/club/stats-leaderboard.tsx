"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown, Minus, Medal } from "lucide-react";

const PLAY_TYPE_LABELS: Record<string, string> = {
  all:          "All",
  singles:      "Singles",
  doubles:      "Doubles",
  mixed_doubles:"Mixed Doubles",
  open_doubles: "Open Doubles",
};

const GENDER_LABELS: Record<string, string> = {
  all:    "All",
  male:   "Male",
  female: "Female",
  other:  "Other",
};

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
};

export type PlayerRow = {
  id: string;
  full_name: string;
  nickname: string | null;
  gender: string;
  is_guest: boolean;
  stats: PlayerStat[];
  titles: Title[];
  matches: MatchHistory[];
};

const TITLE_CONFIG: Record<string, { color: string; bg: string; ring: string; icon: string }> = {
  Gold:   { color: "text-yellow-400", bg: "bg-yellow-400/12", ring: "ring-yellow-400/25", icon: "🥇" },
  Silver: { color: "text-slate-300",  bg: "bg-slate-300/12",  ring: "ring-slate-300/25",  icon: "🥈" },
  Bronze: { color: "text-orange-400", bg: "bg-orange-400/12", ring: "ring-orange-400/25", icon: "🥉" },
};

const RANK_STYLE: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-yellow-400/15", text: "text-yellow-400" },
  2: { bg: "bg-slate-400/15",  text: "text-slate-300" },
  3: { bg: "bg-orange-400/15", text: "text-orange-400" },
};

function MedalBadge({ title, count }: { title: string; count: number }) {
  const cfg = TITLE_CONFIG[title];
  if (!cfg || count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
      <Medal className="h-3 w-3" />
      {count}
    </span>
  );
}

interface Props {
  players: PlayerRow[];
  availablePlayTypes: string[];
  availableGenders: string[];
  playerCount: number;
}

export function StatsLeaderboard({ players, availablePlayTypes, availableGenders, playerCount }: Props) {
  const [playType, setPlayType] = useState("all");
  const [gender, setGender] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailPlayType, setDetailPlayType] = useState("all");

  // Filter + rank
  const ranked = players
    .filter((p) => gender === "all" || p.gender === gender)
    .filter((p) => !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || (p.nickname ?? "").toLowerCase().includes(search.toLowerCase()))
    .map((p) => {
      const filteredStats = playType === "all"
        ? p.stats
        : p.stats.filter((s) => s.play_type === playType);
      const wins   = filteredStats.reduce((s, r) => s + r.wins, 0);
      const losses = filteredStats.reduce((s, r) => s + r.losses, 0);
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
    const total = filteredStats.reduce((s, r) => s + r.wins + r.losses, 0);
    const matchesSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || (p.nickname ?? "").toLowerCase().includes(search.toLowerCase());
    return total === 0 && (gender === "all" || p.gender === gender) && matchesSearch;
  });

  const playTypeOptions = ["all", ...availablePlayTypes];
  const genderOptions   = ["all", ...availableGenders];

  return (
    <div className="space-y-3">
      {/* Header: title + search */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-lime" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
            <h1 className="text-2xl font-black text-white">Player Stats</h1>
          </div>
          <p className="mt-0.5 text-sm text-white/40">{playerCount} player{playerCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative w-44 shrink-0">
          <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="h-9 w-full rounded-full border border-white/10 bg-white/5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-lime"
          />
        </div>
      </div>

      {/* Play type filter — pill style */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {playTypeOptions.map((pt) => (
          <button
            key={pt}
            onClick={() => setPlayType(pt)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              playType === pt
                ? "bg-brand-lime text-brand-dark"
                : "border border-white/12 bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            {PLAY_TYPE_LABELS[pt] ?? pt}
          </button>
        ))}
      </div>

      {/* Gender filter — pill style */}
      <div className="flex gap-1.5">
        {genderOptions.map((g) => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              gender === g
                ? "bg-brand-lime text-brand-dark"
                : "border border-white/12 bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            {GENDER_LABELS[g] ?? g}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <p className="text-sm text-white/30">No results for this filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map((member, idx) => {
            const rank = idx + 1;
            const rs = RANK_STYLE[rank];
            const isFirst = rank === 1;
            const goldCount   = member.titles.filter((t) => t.title_name === "Gold").length;
            const silverCount = member.titles.filter((t) => t.title_name === "Silver").length;
            const bronzeCount = member.titles.filter((t) => t.title_name === "Bronze").length;
            const isExpanded  = expandedId === member.id;
            const initials = member.full_name.trim().split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

            const avatarColors = [
              "bg-brand-lime/20 text-brand-lime",
              "bg-blue-500/20 text-blue-300",
              "bg-orange-500/20 text-orange-300",
              "bg-purple-500/20 text-purple-300",
              "bg-pink-500/20 text-pink-300",
            ];
            const avatarColor = avatarColors[(rank - 1) % avatarColors.length];

            const detailMatches = member.matches.filter(
              (m) => detailPlayType === "all" || m.play_type === detailPlayType
            );

            return (
              <div key={member.id} className={`overflow-hidden rounded-2xl border transition-all ${
                isFirst
                  ? "border-yellow-500/40 bg-yellow-500/5"
                  : "border-white/15 bg-white/3 hover:border-white/20"
              }`}>
                {/* Row */}
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : member.id);
                    setDetailPlayType("all");
                  }}
                  className="w-full px-4 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank + crown */}
                    <div className="relative shrink-0">
                      {isFirst && (
                        <div className="absolute -top-1 -left-1 text-sm">👑</div>
                      )}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                        rs ? `${rs.bg} ${rs.text}` : "bg-white/6 text-white/30"
                      }`}>
                        {rank}
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${avatarColor}`}>
                      {initials}
                    </div>

                    {/* Name + medals */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-white">{member.full_name}</span>
                        {member.nickname && (
                          <span className="text-xs text-white/30">&ldquo;{member.nickname}&rdquo;</span>
                        )}
                        {member.is_guest && (
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40">Guest</span>
                        )}
                        <MedalBadge title="Gold"   count={goldCount} />
                        <MedalBadge title="Silver" count={silverCount} />
                        <MedalBadge title="Bronze" count={bronzeCount} />
                      </div>
                      <p className="mt-0.5 text-xs text-white/30">
                        {member.filteredWins}W – {member.filteredLosses}L
                        <span className="ml-2 text-white/20">{member.filteredTotal} matches</span>
                      </p>
                    </div>

                    {/* Separator */}
                    <div className="h-10 w-px shrink-0 bg-white/10" />

                    {/* Win rate + chevron */}
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <p className={`text-xl font-black tabular-nums ${
                          member.winRate >= 60 ? "text-brand-lime" :
                          member.winRate >= 40 ? "text-white" : "text-red-400"
                        }`}>
                          {member.winRate}%
                        </p>
                        <p className="text-[10px] text-white/25">win rate</p>
                      </div>
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-white/30" />
                        : <ChevronRight className="h-4 w-4 text-white/20" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded: match history */}
                {isExpanded && (
                  <div className="border-t border-white/6 bg-white/[0.02] px-4 pb-4 pt-3">
                    {member.matches.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {["all", ...Array.from(new Set(member.matches.map((m) => m.play_type)))].map((pt) => (
                          <button
                            key={pt}
                            onClick={(e) => { e.stopPropagation(); setDetailPlayType(pt); }}
                            className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                              detailPlayType === pt
                                ? "bg-brand-lime/20 text-brand-lime"
                                : "bg-white/6 text-white/40 hover:text-white"
                            }`}
                          >
                            {PLAY_TYPE_LABELS[pt] ?? pt}
                          </button>
                        ))}
                      </div>
                    )}

                    {detailMatches.length === 0 ? (
                      <p className="text-xs text-white/30">No matches for this play type</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detailMatches.map((m) => (
                          <div
                            key={m.id}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                              m.won ? "border-brand-lime/15 bg-brand-lime/5" : "border-white/6 bg-white/3"
                            }`}
                          >
                            <div className={`h-2 w-2 shrink-0 rounded-full ${m.won ? "bg-brand-lime" : "bg-red-400/60"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">
                                vs {m.opponent1}{m.opponent2 ? ` / ${m.opponent2}` : ""}
                              </p>
                              <p className="text-xs text-white/30">
                                {PLAY_TYPE_LABELS[m.play_type] ?? m.play_type}
                                {m.is_playoff && <span className="ml-1 text-brand-lime/60">· Playoff</span>}
                                {" · "}{m.event_name}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={`text-sm font-bold tabular-nums ${m.won ? "text-brand-lime" : "text-white/60"}`}>
                                {m.my_score} – {m.opp_score}
                              </p>
                              <p className={`text-[10px] ${m.won ? "text-brand-lime/60" : "text-red-400/60"}`}>
                                {m.won ? "Win" : "Loss"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Players with no matches under this filter */}
      {noMatchPlayers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/20">No matches</p>
          <div className="space-y-1.5">
            {noMatchPlayers.map((member) => {
              const initials = member.full_name.trim().split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/2 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-black text-white/20">
                    {initials}
                  </div>
                  <span className="text-sm text-white/30">{member.full_name}</span>
                  {member.is_guest && (
                    <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-white/25">Guest</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
