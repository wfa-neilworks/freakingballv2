export const revalidate = 30;

import { createClient } from "@/lib/supabase/server";
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from "lucide-react";

const PLAY_TYPE_LABELS: Record<string, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles: "Open Doubles",
};

const MEDAL_CONFIG = {
  Gold:   { icon: "🥇", color: "text-yellow-400", bg: "bg-yellow-400/10", ring: "ring-yellow-400/20" },
  Silver: { icon: "🥈", color: "text-slate-300",  bg: "bg-slate-300/10",  ring: "ring-slate-300/20" },
  Bronze: { icon: "🥉", color: "text-orange-400", bg: "bg-orange-400/10", ring: "ring-orange-400/20" },
};

const RANK_BADGE: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-yellow-400/15", text: "text-yellow-400", label: "#1" },
  2: { bg: "bg-slate-400/15",  text: "text-slate-300",  label: "#2" },
  3: { bg: "bg-orange-400/15", text: "text-orange-400", label: "#3" },
};

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  const { data: members } = await supabase
    .from("members")
    .select(`
      id, full_name, nickname, gender, is_guest,
      player_stats(play_type, wins, losses, points_earned, points_lost),
      titles(id, title_name, awarded_at, tournament_event_id,
        tournament_events(name, tournament_id,
          tournaments(name)
        )
      )
    `)
    .eq("club_id", club!.id)
    .eq("is_active", true)
    .order("full_name");

  // Compute totals and sort by win rate desc, then total wins
  const ranked = (members ?? [])
    .map((m) => {
      const stats = Array.isArray(m.player_stats) ? m.player_stats : [];
      const titles = Array.isArray(m.titles) ? m.titles : [];
      const totalWins   = stats.reduce((s, r) => s + (r.wins ?? 0), 0);
      const totalLosses = stats.reduce((s, r) => s + (r.losses ?? 0), 0);
      const totalMatches = totalWins + totalLosses;
      const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
      return { ...m, stats, titles, totalWins, totalLosses, totalMatches, winRate };
    })
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalWins - a.totalWins;
    });

  const hasAnyStats = ranked.some((m) => m.totalMatches > 0);

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-white">Player Stats</h1>
        <p className="mt-0.5 text-sm text-white/40">
          {ranked.length} player{ranked.length !== 1 ? "s" : ""}
          {hasAnyStats ? " · ranked by win rate" : ""}
        </p>
      </div>

      {/* Empty state */}
      {!ranked.length && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-lime/10">
            <Trophy className="h-7 w-7 text-brand-lime/60" />
          </div>
          <p className="font-semibold text-white/50">No members yet</p>
          <p className="mt-1 text-sm text-white/25">Add members to start tracking stats</p>
        </div>
      )}

      {/* No stats yet */}
      {ranked.length > 0 && !hasAnyStats && (
        <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <p className="text-sm text-white/30">No match results yet — stats appear after scores are saved</p>
        </div>
      )}

      {/* Leaderboard */}
      {hasAnyStats && (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
          {ranked.filter((m) => m.totalMatches > 0).map((member, idx) => {
            const rank = idx + 1;
            const rankStyle = RANK_BADGE[rank];
            const goldCount   = member.titles.filter((t) => t.title_name === "Gold").length;
            const silverCount = member.titles.filter((t) => t.title_name === "Silver").length;
            const bronzeCount = member.titles.filter((t) => t.title_name === "Bronze").length;

            return (
              <div
                key={member.id}
                className={`px-5 py-4 ${idx !== 0 ? "border-t border-white/6" : ""} ${rank <= 3 ? "hover:bg-white/4" : "hover:bg-white/3"} transition-colors`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    rankStyle ? `${rankStyle.bg} ${rankStyle.text}` : "bg-white/6 text-white/30"
                  }`}>
                    {rank}
                  </div>

                  {/* Name + badges */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">
                        {member.full_name}
                      </span>
                      {member.nickname && (
                        <span className="text-xs text-white/30">&ldquo;{member.nickname}&rdquo;</span>
                      )}
                      {member.is_guest && (
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40">Guest</span>
                      )}
                      {/* Medal counts */}
                      {goldCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-[11px] text-yellow-400 ring-1 ring-yellow-400/20">
                          🥇 {goldCount}
                        </span>
                      )}
                      {silverCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-300/10 px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-300/20">
                          🥈 {silverCount}
                        </span>
                      )}
                      {bronzeCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-0.5 text-[11px] text-orange-400 ring-1 ring-orange-400/20">
                          🥉 {bronzeCount}
                        </span>
                      )}
                    </div>

                    {/* Per play-type breakdown */}
                    {member.stats.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                        {member.stats.map((s) => (
                          <span key={s.play_type} className="text-xs text-white/25">
                            {PLAY_TYPE_LABELS[s.play_type] ?? s.play_type}
                            {" "}
                            <span className="text-white/40">{s.wins}W–{s.losses}L</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stats summary */}
                  <div className="flex shrink-0 items-center gap-5 text-right">
                    <div className="hidden sm:block">
                      <div className="flex items-center justify-end gap-3 text-sm">
                        <span className="flex items-center gap-1 text-brand-lime/80">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {member.totalWins}
                        </span>
                        <span className="flex items-center gap-1 text-red-400/70">
                          <TrendingDown className="h-3.5 w-3.5" />
                          {member.totalLosses}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-white/20">{member.totalMatches} matches</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black tabular-nums ${
                        member.winRate >= 60 ? "text-brand-lime" :
                        member.winRate >= 40 ? "text-white" :
                        "text-red-400"
                      }`}>
                        {member.winRate}%
                      </p>
                      <p className="text-[10px] text-white/25">win rate</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Players with no matches (inactive in terms of stats) */}
      {hasAnyStats && ranked.filter((m) => m.totalMatches === 0).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/20">No matches yet</p>
          <div className="overflow-hidden rounded-2xl border border-white/6 bg-white/2">
            {ranked.filter((m) => m.totalMatches === 0).map((member, idx, arr) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 px-5 py-3 ${idx !== 0 ? "border-t border-white/5" : ""}`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5">
                  <Minus className="h-3 w-3 text-white/20" />
                </div>
                <span className="text-sm text-white/30">{member.full_name}</span>
                {member.is_guest && (
                  <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-white/25">Guest</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
