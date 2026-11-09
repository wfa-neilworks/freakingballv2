import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PlayerProfileClient } from "@/components/club/player-profile-client";
import type { PlayerRow } from "@/components/club/stats-leaderboard";

export default async function PublicPlayerProfilePage({
  params,
}: {
  params: Promise<{ clubId: string; playerId: string }>;
}) {
  const { clubId, playerId } = await params;
  const supabase = await createAdminClient();

  // Verify club exists
  const { data: club } = await supabase
    .from("clubs").select("id").eq("id", clubId).single();
  if (!club) notFound();

  const { data: member } = await supabase
    .from("members")
    .select(`
      id, full_name, nickname, gender, is_guest, photo_url,
      player_stats(play_type, wins, losses, points_earned, points_lost),
      titles(id, title_name, awarded_at, tournament_event_id,
        tournament_events(name, tournaments(name))
      )
    `)
    .eq("id", playerId)
    .eq("club_id", clubId)
    .single();

  if (!member) notFound();

  const { data: allMembers } = await supabase
    .from("members")
    .select("id, full_name, nickname, photo_url")
    .eq("club_id", clubId);

  const memberMap: Record<string, string> = {};
  for (const m of allMembers ?? []) memberMap[m.id] = m.full_name;

  // Tournament matches
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

  const clubTournamentMatches = (allTournamentMatches ?? []).filter((m) => {
    const ev = m.tournament_events as any;
    const t = Array.isArray(ev?.tournaments) ? ev.tournaments[0] : ev?.tournaments;
    return t?.club_id === clubId;
  });

  // Open play matches
  const { data: allOpenPlayMatches } = await supabase
    .from("open_play_matches")
    .select(`
      id, played_at,
      team1_player1, team1_player2, team2_player1, team2_player2,
      team1_score, team2_score, winner_team,
      open_plays!inner(id, name, play_type, club_id)
    `)
    .not("winner_team", "is", null);

  const clubOpenPlayMatches = (allOpenPlayMatches ?? []).filter((m) => {
    const op = m.open_plays as any;
    const session = Array.isArray(op) ? op[0] : op;
    return session?.club_id === clubId;
  });

  const history: PlayerRow["matches"] = [];

  for (const match of clubTournamentMatches) {
    const ev = match.tournament_events as any;
    const evArr = Array.isArray(ev) ? ev[0] : ev;
    const tArr  = Array.isArray(evArr?.tournaments) ? evArr.tournaments[0] : evArr?.tournaments;
    const playType  = evArr?.play_type ?? "doubles";
    const eventName = evArr?.name ?? "";
    const tournName = tArr?.name ?? "";
    const team1 = [match.team1_player1, match.team1_player2].filter(Boolean) as string[];
    const team2 = [match.team2_player1, match.team2_player2].filter(Boolean) as string[];
    const isOnTeam1 = team1.includes(playerId);
    const isOnTeam2 = team2.includes(playerId);
    if (!isOnTeam1 && !isOnTeam2) continue;
    const oppTeam  = isOnTeam1 ? team2 : team1;
    const myScore  = isOnTeam1 ? (match.team1_score ?? 0) : (match.team2_score ?? 0);
    const oppScore = isOnTeam1 ? (match.team2_score ?? 0) : (match.team1_score ?? 0);
    const won = isOnTeam1 ? match.winner_team === 1 : match.winner_team === 2;
    history.push({
      id: `t::${match.id}::${playerId}`,
      play_type: playType, event_name: eventName, tournament_name: tournName,
      date: match.played_at,
      opponent1: memberMap[oppTeam[0]] ?? "Unknown",
      opponent2: oppTeam[1] ? (memberMap[oppTeam[1]] ?? "Unknown") : null,
      my_score: myScore, opp_score: oppScore, won, is_playoff: match.is_playoff, source: "tournament",
    });
  }

  for (const match of clubOpenPlayMatches) {
    const op = match.open_plays as any;
    const session = Array.isArray(op) ? op[0] : op;
    const playType    = session?.play_type ?? "doubles";
    const sessionName = session?.name ?? "Open Play";
    const team1 = [match.team1_player1, match.team1_player2].filter(Boolean) as string[];
    const team2 = [match.team2_player1, match.team2_player2].filter(Boolean) as string[];
    const isOnTeam1 = team1.includes(playerId);
    const isOnTeam2 = team2.includes(playerId);
    if (!isOnTeam1 && !isOnTeam2) continue;
    const oppTeam  = isOnTeam1 ? team2 : team1;
    const myScore  = isOnTeam1 ? (match.team1_score ?? 0) : (match.team2_score ?? 0);
    const oppScore = isOnTeam1 ? (match.team2_score ?? 0) : (match.team1_score ?? 0);
    const won = isOnTeam1 ? match.winner_team === 1 : match.winner_team === 2;
    history.push({
      id: `op::${match.id}::${playerId}`,
      play_type: playType, event_name: sessionName, tournament_name: "",
      date: match.played_at,
      opponent1: memberMap[oppTeam[0]] ?? "Unknown",
      opponent2: oppTeam[1] ? (memberMap[oppTeam[1]] ?? "Unknown") : null,
      my_score: myScore, opp_score: oppScore, won, is_playoff: false, source: "open_play",
    });
  }

  history.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const player: PlayerRow = {
    id: member.id,
    full_name: member.full_name,
    nickname: member.nickname,
    gender: member.gender,
    is_guest: member.is_guest,
    photo_url: (member as any).photo_url ?? null,
    stats: Array.isArray(member.player_stats) ? member.player_stats : [],
    titles: (Array.isArray(member.titles) ? member.titles : []).map((t: any) => {
      const evArr = Array.isArray(t.tournament_events) ? t.tournament_events[0] : t.tournament_events;
      const tArr  = Array.isArray(evArr?.tournaments) ? evArr.tournaments[0] : evArr?.tournaments;
      return {
        id: t.id, title_name: t.title_name, awarded_at: t.awarded_at,
        tournament_event_id: t.tournament_event_id,
        event_name: evArr?.name ?? "", tournament_name: tArr?.name ?? "",
      };
    }),
    matches: history,
  };

  // Rank computation
  const { data: allPlayerStats } = await supabase
    .from("player_stats")
    .select("member_id, wins, losses")
    .in("member_id", (allMembers ?? []).map((m) => m.id));

  const opWins: Record<string, number> = {};
  const opLosses: Record<string, number> = {};
  for (const match of clubOpenPlayMatches) {
    if (match.winner_team === null) continue;
    const team1 = [match.team1_player1, match.team1_player2].filter(Boolean) as string[];
    const team2 = [match.team2_player1, match.team2_player2].filter(Boolean) as string[];
    const won1 = match.winner_team === 1;
    for (const pid of team1) { opWins[pid] = (opWins[pid] ?? 0) + (won1 ? 1 : 0); opLosses[pid] = (opLosses[pid] ?? 0) + (won1 ? 0 : 1); }
    for (const pid of team2) { opWins[pid] = (opWins[pid] ?? 0) + (won1 ? 0 : 1); opLosses[pid] = (opLosses[pid] ?? 0) + (won1 ? 1 : 0); }
  }

  const statsByMember: Record<string, { wins: number; losses: number }> = {};
  for (const s of allPlayerStats ?? []) {
    if (!statsByMember[s.member_id]) statsByMember[s.member_id] = { wins: 0, losses: 0 };
    statsByMember[s.member_id].wins   += s.wins;
    statsByMember[s.member_id].losses += s.losses;
  }
  for (const mid of Object.keys(opWins)) {
    if (!statsByMember[mid]) statsByMember[mid] = { wins: 0, losses: 0 };
    statsByMember[mid].wins   += opWins[mid] ?? 0;
    statsByMember[mid].losses += opLosses[mid] ?? 0;
  }

  const ranked = (allMembers ?? [])
    .map((m) => {
      const s = statsByMember[m.id] ?? { wins: 0, losses: 0 };
      const total = s.wins + s.losses;
      const winRate = total > 0 ? s.wins / total : -1;
      return { id: m.id, winRate, wins: s.wins, losses: s.losses, total };
    })
    .filter((m) => m.total > 0)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.winRate - a.winRate);

  const rank = ranked.findIndex((r) => r.id === playerId) + 1 || ranked.length + 1;
  const totalPlayers = ranked.length;

  const h2hMembers = (allMembers ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    nickname: m.nickname,
    photo_url: m.photo_url,
  }));

  return (
    <div className="min-h-screen bg-brand-dark">
      <PlayerProfileClient
        player={player}
        rank={rank}
        totalPlayers={totalPlayers}
        allMembers={h2hMembers}
        backHref={`/stats/${clubId}`}
      />
    </div>
  );
}
