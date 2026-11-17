import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { computeRatingChanges, type RatingPlayer } from "@/lib/rating";
import type { SkillLevel } from "@/types/database";

export async function POST(req: NextRequest) {
  // Verify authenticated club admin
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

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the match + open play session
  const { data: match, error: matchErr } = await admin
    .from("open_play_matches")
    .select("id, open_play_id, team1_player1, team1_player2, team2_player1, team2_player2, winner_team")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Verify caller owns this club
  const { data: session } = await admin
    .from("open_plays")
    .select("club_id")
    .eq("id", match.open_play_id)
    .single();

  const { data: club } = await supabaseUser
    .from("clubs")
    .select("id")
    .eq("admin_id", user.id)
    .single();

  if (!session || !club || session.club_id !== club.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Idempotency: skip rating update if match was already scored
  const alreadyScored = match.winner_team !== null;

  // Save the score
  const { error: updateErr } = await admin
    .from("open_play_matches")
    .update({
      team1_score: t1,
      team2_score: t2,
      winner_team: winner,
      played_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // No winner (tie) or already scored — skip rating updates
  if (winner === null || alreadyScored) {
    return NextResponse.json({ winner, ratingChanges: [] });
  }

  // Collect all player IDs
  const playerIds = [
    match.team1_player1,
    match.team1_player2,
    match.team2_player1,
    match.team2_player2,
  ].filter(Boolean) as string[];

  // Fetch current ratings
  const { data: memberRows } = await admin
    .from("members")
    .select("id, rating, skill_level, total_rated_games")
    .in("id", playerIds);

  if (!memberRows || memberRows.length === 0) {
    return NextResponse.json({ winner, ratingChanges: [] });
  }

  const memberMap = new Map(memberRows.map((m) => [m.id, m]));

  const makeTeam = (ids: (string | null)[]): RatingPlayer[] =>
    ids
      .filter(Boolean)
      .flatMap((id) => {
        const m = memberMap.get(id!);
        if (!m) return [];
        return [{
          memberId: m.id,
          rating: m.rating,
          totalRatedGames: m.total_rated_games,
          currentLevel: m.skill_level as SkillLevel,
        }];
      });

  const team1Players = makeTeam([match.team1_player1, match.team1_player2]);
  const team2Players = makeTeam([match.team2_player1, match.team2_player2]);

  if (team1Players.length === 0 || team2Players.length === 0) {
    return NextResponse.json({ winner, ratingChanges: [] });
  }

  const ratingChanges = computeRatingChanges({
    team1: team1Players,
    team2: team2Players,
    winnerTeam: winner,
    team1Score: t1,
    team2Score: t2,
  });

  // Apply rating changes
  for (const change of ratingChanges) {
    await admin
      .from("members")
      .update({
        rating: change.ratingAfter,
        skill_level: change.newSkillLevel,
        total_rated_games: (memberMap.get(change.memberId)!.total_rated_games ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", change.memberId);

    await admin.from("member_rating_history").insert({
      member_id: change.memberId,
      match_id: matchId,
      match_source: "open_play",
      rating_before: change.ratingBefore,
      rating_after: change.ratingAfter,
      change: change.change,
      reason: null,
    });
  }

  return NextResponse.json({ winner, ratingChanges });
}
