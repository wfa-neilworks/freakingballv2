import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StatsLeaderboard, type PlayerRow } from "@/components/club/stats-leaderboard";
import { TrendingUp } from "lucide-react";

export default async function PublicStatsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const supabase = await createAdminClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("id", clubId)
    .single();

  if (!club) notFound();

  const { data: members } = await supabase
    .from("members")
    .select(`
      id, full_name, nickname, gender, is_guest, photo_url,
      player_stats(play_type, wins, losses, points_earned, points_lost),
      titles(id, title_name, awarded_at, tournament_event_id,
        tournament_events(name, tournaments(name))
      )
    `)
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("full_name");

  const { data: allTournamentMatches } = await supabase
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

  const { data: allOpenPlayMatches } = await supabase
    .from("open_play_matches")
    .select(`
      id, played_at,
      team1_player1, team1_player2, team2_player1, team2_player2,
      team1_score, team2_score, winner_team,
      open_plays!inner(id, name, play_type, club_id)
    `)
    .not("winner_team", "is", null);

  const clubTournamentMatches = (allTournamentMatches ?? []).filter((m) => {
    const ev = m.tournament_events as any;
    const t = Array.isArray(ev?.tournaments) ? ev.tournaments[0] : ev?.tournaments;
    return t?.club_id === clubId;
  });

  const clubOpenPlayMatches = (allOpenPlayMatches ?? []).filter((m) => {
    const op = m.open_plays as any;
    const session = Array.isArray(op) ? op[0] : op;
    return session?.club_id === clubId;
  });

  const memberMap: Record<string, string> = {};
  for (const m of members ?? []) memberMap[m.id] = m.nickname ?? m.full_name.split(" ")[0];

  const historyMap: Record<string, PlayerRow["matches"]> = {};

  for (const match of clubTournamentMatches) {
    if (match.winner_team === null) continue;
    const ev = match.tournament_events as any;
    const evArr = Array.isArray(ev) ? ev[0] : ev;
    const tArr  = Array.isArray(evArr?.tournaments) ? evArr.tournaments[0] : evArr?.tournaments;
    const playType  = evArr?.play_type ?? "doubles";
    const eventName = evArr?.name ?? "";
    const tournName = tArr?.name ?? "";
    const team1 = [match.team1_player1, match.team1_player2].filter(Boolean) as string[];
    const team2 = [match.team2_player1, match.team2_player2].filter(Boolean) as string[];
    const addEntry = (pid: string, oppTeam: string[], myScore: number, oppScore: number, won: boolean) => {
      if (!historyMap[pid]) historyMap[pid] = [];
      historyMap[pid].push({
        id: `t::${match.id}::${pid}`,
        play_type: playType, event_name: eventName, tournament_name: tournName,
        date: match.played_at,
        opponent1: memberMap[oppTeam[0]] ?? "Unknown",
        opponent2: oppTeam[1] ? (memberMap[oppTeam[1]] ?? "Unknown") : null,
        my_score: myScore, opp_score: oppScore, won, is_playoff: match.is_playoff, source: "tournament",
      });
    };
    const won1 = match.winner_team === 1;
    for (const pid of team1) addEntry(pid, team2, match.team1_score!, match.team2_score!, won1);
    for (const pid of team2) addEntry(pid, team1, match.team2_score!, match.team1_score!, !won1);
  }

  for (const match of clubOpenPlayMatches) {
    if (match.winner_team === null) continue;
    const op = match.open_plays as any;
    const session = Array.isArray(op) ? op[0] : op;
    const playType    = session?.play_type ?? "doubles";
    const sessionName = session?.name ?? "Open Play";
    const team1 = [match.team1_player1, match.team1_player2].filter(Boolean) as string[];
    const team2 = [match.team2_player1, match.team2_player2].filter(Boolean) as string[];
    const addEntry = (pid: string, oppTeam: string[], myScore: number, oppScore: number, won: boolean) => {
      if (!historyMap[pid]) historyMap[pid] = [];
      historyMap[pid].push({
        id: `op::${match.id}::${pid}`,
        play_type: playType, event_name: sessionName, tournament_name: "",
        date: match.played_at,
        opponent1: memberMap[oppTeam[0]] ?? "Unknown",
        opponent2: oppTeam[1] ? (memberMap[oppTeam[1]] ?? "Unknown") : null,
        my_score: myScore, opp_score: oppScore, won, is_playoff: false, source: "open_play",
      });
    };
    const won1 = match.winner_team === 1;
    for (const pid of team1) addEntry(pid, team2, match.team1_score!, match.team2_score!, won1);
    for (const pid of team2) addEntry(pid, team1, match.team2_score!, match.team1_score!, !won1);
  }

  for (const pid of Object.keys(historyMap)) {
    historyMap[pid].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  const players: PlayerRow[] = (members ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    nickname: m.nickname,
    gender: m.gender,
    is_guest: m.is_guest,
    photo_url: (m as any).photo_url ?? null,
    stats: Array.isArray(m.player_stats) ? m.player_stats : [],
    titles: (Array.isArray(m.titles) ? m.titles : []).map((t: any) => {
      const evArr = Array.isArray(t.tournament_events) ? t.tournament_events[0] : t.tournament_events;
      const tArr  = Array.isArray(evArr?.tournaments) ? evArr.tournaments[0] : evArr?.tournaments;
      return {
        id: t.id, title_name: t.title_name, awarded_at: t.awarded_at,
        tournament_event_id: t.tournament_event_id,
        event_name: evArr?.name ?? "", tournament_name: tArr?.name ?? "",
      };
    }),
    matches: historyMap[m.id] ?? [],
  }));

  const hasAnyStats = players.some((p) =>
    p.stats.some((s) => s.wins + s.losses > 0) || p.matches.length > 0
  );
  const availablePlayTypes = Array.from(new Set(players.flatMap((p) => [
    ...p.stats.map((s) => s.play_type),
    ...p.matches.map((m) => m.play_type),
  ]))).sort();
  const availableGenders = Array.from(new Set(players.map((p) => p.gender))).sort();

  return (
    <div className="min-h-screen bg-brand-dark px-4 pb-16 pt-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Club header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-lime/60">Player Stats</p>
          <h1 className="mt-1 text-2xl font-black text-white">{club.name}</h1>
        </div>

        {!hasAnyStats ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-lime/10">
                <TrendingUp className="h-6 w-6 text-brand-lime/50" />
              </div>
            </div>
            <p className="text-sm text-white/30">No stats recorded yet</p>
          </div>
        ) : (
          <StatsLeaderboard
            players={players}
            availablePlayTypes={availablePlayTypes}
            availableGenders={availableGenders}
            playerCount={players.length}
            profileBasePath={`/stats/${clubId}`}
          />
        )}

        <p className="text-center text-xs text-white/20">Powered by FreakingBall</p>
      </div>
    </div>
  );
}
