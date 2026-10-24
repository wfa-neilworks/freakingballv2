export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { Trophy } from "lucide-react";
import { StatsLeaderboard, type PlayerRow } from "@/components/club/stats-leaderboard";

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  // Members with stats + titles
  const { data: members } = await supabase
    .from("members")
    .select(`
      id, full_name, nickname, gender, is_guest,
      player_stats(play_type, wins, losses, points_earned, points_lost),
      titles(id, title_name, awarded_at, tournament_event_id,
        tournament_events(name, tournaments(name))
      )
    `)
    .eq("club_id", club!.id)
    .eq("is_active", true)
    .order("full_name");

  // All scored matches for this club (to build per-player history)
  const { data: allMatches } = await supabase
    .from("tournament_matches")
    .select(`
      id, is_playoff, played_at,
      team1_player1, team1_player2, team2_player1, team2_player2,
      team1_score, team2_score, winner_team,
      tournament_events!inner(id, name, play_type,
        tournaments!inner(name, club_id)
      )
    `)
    .not("winner_team", "is", null);

  // Filter to this club
  const clubMatches = (allMatches ?? []).filter((m) => {
    const ev = m.tournament_events as any;
    const t = Array.isArray(ev?.tournaments) ? ev.tournaments[0] : ev?.tournaments;
    return t?.club_id === club!.id;
  });

  // Build member id → name lookup
  const memberMap: Record<string, string> = {};
  for (const m of members ?? []) memberMap[m.id] = m.nickname ?? m.full_name.split(" ")[0];

  // Build per-player match history
  const historyMap: Record<string, PlayerRow["matches"]> = {};

  for (const match of clubMatches) {
    if (match.winner_team === null) continue;
    const ev = match.tournament_events as any;
    const evArr = Array.isArray(ev) ? ev[0] : ev;
    const tArr  = Array.isArray(evArr?.tournaments) ? evArr.tournaments[0] : evArr?.tournaments;
    const playType    = evArr?.play_type ?? "doubles";
    const eventName   = evArr?.name ?? "";
    const tournName   = tArr?.name ?? "";

    const team1 = [match.team1_player1, match.team1_player2].filter(Boolean) as string[];
    const team2 = [match.team2_player1, match.team2_player2].filter(Boolean) as string[];

    const addEntry = (playerId: string, myTeam: string[], oppTeam: string[], myScore: number, oppScore: number, won: boolean) => {
      if (!historyMap[playerId]) historyMap[playerId] = [];
      historyMap[playerId].push({
        id: `${match.id}::${playerId}`,
        play_type: playType,
        event_name: eventName,
        tournament_name: tournName,
        date: match.played_at,
        opponent1: memberMap[oppTeam[0]] ?? "Unknown",
        opponent2: oppTeam[1] ? (memberMap[oppTeam[1]] ?? "Unknown") : null,
        my_score: myScore,
        opp_score: oppScore,
        won,
        is_playoff: match.is_playoff,
      });
    };

    const won1 = match.winner_team === 1;
    for (const pid of team1) addEntry(pid, team1, team2, match.team1_score!, match.team2_score!, won1);
    for (const pid of team2) addEntry(pid, team2, team1, match.team2_score!, match.team1_score!, !won1);
  }

  // Sort each player's history by date desc
  for (const pid of Object.keys(historyMap)) {
    historyMap[pid].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  // Build PlayerRow list
  const players: PlayerRow[] = (members ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    nickname: m.nickname,
    gender: m.gender,
    is_guest: m.is_guest,
    stats: Array.isArray(m.player_stats) ? m.player_stats : [],
    titles: (Array.isArray(m.titles) ? m.titles : []).map((t: any) => {
      const evArr = Array.isArray(t.tournament_events) ? t.tournament_events[0] : t.tournament_events;
      const tArr  = Array.isArray(evArr?.tournaments) ? evArr.tournaments[0] : evArr?.tournaments;
      return {
        id: t.id,
        title_name: t.title_name,
        awarded_at: t.awarded_at,
        tournament_event_id: t.tournament_event_id,
        event_name: evArr?.name ?? "",
        tournament_name: tArr?.name ?? "",
      };
    }),
    matches: historyMap[m.id] ?? [],
  }));

  const hasAnyStats = players.some((p) => p.stats.some((s) => s.wins + s.losses > 0));

  // Derive filter options from actual data
  const availablePlayTypes = Array.from(new Set(players.flatMap((p) => p.stats.map((s) => s.play_type)))).sort();
  const availableGenders   = Array.from(new Set(players.map((p) => p.gender))).sort();

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-white">Player Stats</h1>
        <p className="mt-0.5 text-sm text-white/40">
          {players.length} player{players.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Empty state — no members */}
      {!players.length && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-lime/10">
            <Trophy className="h-7 w-7 text-brand-lime/60" />
          </div>
          <p className="font-semibold text-white/50">No members yet</p>
          <p className="mt-1 text-sm text-white/25">Add members to start tracking stats</p>
        </div>
      )}

      {/* No stats yet */}
      {players.length > 0 && !hasAnyStats && (
        <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <p className="text-sm text-white/30">No match results yet — save scores in a tournament event to populate stats</p>
        </div>
      )}

      {/* Leaderboard (client component handles filters + expand) */}
      {hasAnyStats && (
        <StatsLeaderboard
          players={players}
          availablePlayTypes={availablePlayTypes}
          availableGenders={availableGenders}
        />
      )}
    </div>
  );
}
