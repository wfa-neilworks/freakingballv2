import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";

const PLAY_TYPE_LABELS: Record<string, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles: "Open Doubles",
};

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("admin_id", user!.id)
    .single();

  const { data: members } = await supabase
    .from("members")
    .select(`
      id, full_name, nickname, gender, is_guest,
      player_stats(play_type, wins, losses, points_earned, points_lost),
      titles(id, title_name, awarded_at, tournament_event_id)
    `)
    .eq("club_id", club!.id)
    .eq("is_active", true)
    .order("full_name");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Player Stats</h1>
        <p className="text-sm text-white/50">Wins, losses, points, and titles</p>
      </div>

      <div className="space-y-4">
        {!members?.length && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center text-white/40">
            No members yet.
          </div>
        )}

        {members?.map((member) => {
          const stats = Array.isArray(member.player_stats)
            ? member.player_stats
            : [];
          const titles = Array.isArray(member.titles) ? member.titles : [];

          const totalWins = stats.reduce((s, r) => s + (r.wins ?? 0), 0);
          const totalLosses = stats.reduce((s, r) => s + (r.losses ?? 0), 0);
          const totalMatches = totalWins + totalLosses;
          const winRate =
            totalMatches > 0
              ? Math.round((totalWins / totalMatches) * 100)
              : 0;

          return (
            <Card key={member.id} className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">
                    {member.full_name}
                    {member.nickname && (
                      <span className="ml-2 text-sm text-white/40">
                        &ldquo;{member.nickname}&rdquo;
                      </span>
                    )}
                    {member.is_guest && (
                      <Badge variant="default" className="ml-2">
                        Guest
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-white/50 capitalize">{member.gender}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-lime">{winRate}%</p>
                  <p className="text-xs text-white/40">Win Rate</p>
                </div>
              </div>

              {/* Overall */}
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-brand-lime" />
                  <span className="text-sm font-medium text-white">
                    {totalWins} W
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-white">
                    {totalLosses} L
                  </span>
                </div>
                {titles.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-white">
                      {titles.length} Title{titles.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Per play type */}
              {stats.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {stats.map((s) => (
                    <div
                      key={s.play_type}
                      className="rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <p className="text-xs text-white/40 mb-1">
                        {PLAY_TYPE_LABELS[s.play_type] ?? s.play_type}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {s.wins}W / {s.losses}L
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        +{s.points_earned} / -{s.points_lost} pts
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Titles */}
              {titles.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                    Titles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {titles.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400"
                      >
                        <Trophy className="h-3 w-3" />
                        {t.title_name} ·{" "}
                        {new Date(t.awarded_at).toLocaleDateString("en-PH", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
