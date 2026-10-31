export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated club admin
  const supabaseUser = await createClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId, team1Score, team2Score } = await req.json();
  if (matchId == null || team1Score == null || team2Score == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const t1 = Number(team1Score);
  const t2 = Number(team2Score);
  if (isNaN(t1) || isNaN(t2)) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const winner: 1 | 2 | null = t1 > t2 ? 1 : t2 > t1 ? 2 : null;

  // Service role for writes that bypass RLS (player_stats, titles)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the match with event info
  const { data: match, error: matchErr } = await admin
    .from("tournament_matches")
    .select(`
      id, event_id, is_playoff, round_number,
      team1_player1, team1_player2, team2_player1, team2_player2,
      tournament_events(play_type, tournament_id)
    `)
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Verify the caller owns the club for this event
  const event = Array.isArray(match.tournament_events)
    ? match.tournament_events[0]
    : match.tournament_events as { play_type: string; tournament_id: string };

  const { data: tournament } = await supabaseUser
    .from("tournaments")
    .select("club_id")
    .eq("id", event.tournament_id)
    .single();

  const { data: club } = await supabaseUser
    .from("clubs")
    .select("id")
    .eq("admin_id", user.id)
    .single();

  if (!tournament || !club || tournament.club_id !== club.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Save the match score
  const { error: updateErr } = await admin
    .from("tournament_matches")
    .update({ team1_score: t1, team2_score: t2, winner_team: winner, played_at: new Date().toISOString() })
    .eq("id", matchId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // If tied (no winner), skip stat updates
  if (winner === null) return NextResponse.json({ winner });

  const playType = event.play_type;

  // Players per team
  const team1 = [match.team1_player1, match.team1_player2].filter(Boolean) as string[];
  const team2 = [match.team2_player1, match.team2_player2].filter(Boolean) as string[];
  const winners = winner === 1 ? team1 : team2;
  const losers  = winner === 1 ? team2 : team1;
  const winnerScore = winner === 1 ? t1 : t2;
  const loserScore  = winner === 1 ? t2 : t1;

  // Upsert player_stats for each player
  const statsUpserts = [
    ...winners.map((pid) => ({
      member_id: pid, play_type: playType,
      wins: 1, losses: 0,
      points_earned: winnerScore, points_lost: loserScore,
    })),
    ...losers.map((pid) => ({
      member_id: pid, play_type: playType,
      wins: 0, losses: 1,
      points_earned: loserScore, points_lost: winnerScore,
    })),
  ];

  for (const row of statsUpserts) {
    const { data: existing } = await admin
      .from("player_stats")
      .select("id, wins, losses, points_earned, points_lost")
      .eq("member_id", row.member_id)
      .eq("play_type", row.play_type)
      .single();

    if (existing) {
      await admin.from("player_stats").update({
        wins: existing.wins + row.wins,
        losses: existing.losses + row.losses,
        points_earned: existing.points_earned + row.points_earned,
        points_lost: existing.points_lost + row.points_lost,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("player_stats").insert({
        member_id: row.member_id,
        play_type: row.play_type,
        wins: row.wins,
        losses: row.losses,
        points_earned: row.points_earned,
        points_lost: row.points_lost,
      });
    }
  }

  // Award titles for playoff finals / bronze
  if (match.is_playoff) {
    // Check if this is Final (highest round among playoffs) or Bronze
    const { data: playoffMatches } = await admin
      .from("tournament_matches")
      .select("id, round_number, is_playoff")
      .eq("event_id", match.event_id)
      .eq("is_playoff", true)
      .order("round_number", { ascending: false });

    if (playoffMatches && playoffMatches.length > 0) {
      const maxRound = playoffMatches[0].round_number;
      const isFinal = match.round_number === maxRound;
      // Bronze is the match with the second-highest round among playoffs that isn't the final
      const isBronze = !isFinal && playoffMatches.length >= 2;

      if (isFinal) {
        // Gold to winners, Silver to losers
        const titleInserts = [
          ...winners.map((pid) => ({
            member_id: pid,
            tournament_event_id: match.event_id,
            title_name: "Gold",
            awarded_at: new Date().toISOString(),
          })),
          ...losers.map((pid) => ({
            member_id: pid,
            tournament_event_id: match.event_id,
            title_name: "Silver",
            awarded_at: new Date().toISOString(),
          })),
        ];
        // Only insert if no title for this event yet
        for (const t of titleInserts) {
          const { data: existing } = await admin
            .from("titles")
            .select("id")
            .eq("member_id", t.member_id)
            .eq("tournament_event_id", t.tournament_event_id)
            .single();
          if (!existing) await admin.from("titles").insert(t);
        }
      } else if (isBronze) {
        const titleInserts = winners.map((pid) => ({
          member_id: pid,
          tournament_event_id: match.event_id,
          title_name: "Bronze",
          awarded_at: new Date().toISOString(),
        }));
        for (const t of titleInserts) {
          const { data: existing } = await admin
            .from("titles")
            .select("id")
            .eq("member_id", t.member_id)
            .eq("tournament_event_id", t.tournament_event_id)
            .single();
          if (!existing) await admin.from("titles").insert(t);
        }
      }
    }
  }

  return NextResponse.json({ winner });
}
