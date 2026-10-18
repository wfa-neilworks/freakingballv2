import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabaseUser = await createClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: club } = await supabaseUser
    .from("clubs").select("id").eq("admin_id", user.id).single();
  if (!club) return NextResponse.json({ error: "No club" }, { status: 403 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all scored matches for this club's tournaments
  const { data: matches } = await admin
    .from("tournament_matches")
    .select(`
      id, event_id, is_playoff, round_number,
      team1_player1, team1_player2, team2_player1, team2_player2,
      team1_score, team2_score, winner_team,
      tournament_events!inner(play_type, tournament_id,
        tournaments!inner(club_id)
      )
    `)
    .not("winner_team", "is", null);

  if (!matches) return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });

  // Filter to this club only
  const clubMatches = matches.filter((m) => {
    const ev = Array.isArray(m.tournament_events) ? m.tournament_events[0] : m.tournament_events as any;
    const t = Array.isArray(ev?.tournaments) ? ev.tournaments[0] : ev?.tournaments;
    return t?.club_id === club.id;
  });

  // Wipe existing player_stats and titles for members of this club
  const { data: memberIds } = await admin
    .from("members").select("id").eq("club_id", club.id);
  const ids = (memberIds ?? []).map((m) => m.id);

  if (ids.length > 0) {
    await admin.from("player_stats").delete().in("member_id", ids);
    await admin.from("titles").delete().in("member_id", ids);
  }

  // Aggregate stats: member_id + play_type → accumulated stats
  const statsMap = new Map<string, {
    member_id: string; play_type: string;
    wins: number; losses: number; points_earned: number; points_lost: number;
  }>();

  function addStat(memberId: string, playType: string, win: boolean, pf: number, pa: number) {
    const key = `${memberId}::${playType}`;
    const existing = statsMap.get(key) ?? {
      member_id: memberId, play_type: playType,
      wins: 0, losses: 0, points_earned: 0, points_lost: 0,
    };
    statsMap.set(key, {
      ...existing,
      wins: existing.wins + (win ? 1 : 0),
      losses: existing.losses + (win ? 0 : 1),
      points_earned: existing.points_earned + pf,
      points_lost: existing.points_lost + pa,
    });
  }

  // Per event: track playoff round numbers to identify final vs bronze
  const eventPlayoffRounds = new Map<string, number[]>();
  for (const m of clubMatches) {
    if (m.is_playoff) {
      const rounds = eventPlayoffRounds.get(m.event_id) ?? [];
      if (!rounds.includes(m.round_number)) rounds.push(m.round_number);
      eventPlayoffRounds.set(m.event_id, rounds);
    }
  }

  const titleInserts: { member_id: string; tournament_event_id: string; title_name: string; awarded_at: string }[] = [];

  for (const m of clubMatches) {
    const ev = Array.isArray(m.tournament_events) ? m.tournament_events[0] : m.tournament_events as any;
    const playType: string = ev?.play_type ?? "doubles";
    const winner = m.winner_team as 1 | 2;
    const t1 = m.team1_score ?? 0;
    const t2 = m.team2_score ?? 0;

    const team1 = [m.team1_player1, m.team1_player2].filter(Boolean) as string[];
    const team2 = [m.team2_player1, m.team2_player2].filter(Boolean) as string[];
    const winners = winner === 1 ? team1 : team2;
    const losers  = winner === 1 ? team2 : team1;
    const wScore  = winner === 1 ? t1 : t2;
    const lScore  = winner === 1 ? t2 : t1;

    // Only count members of this club
    for (const pid of winners) {
      if (ids.includes(pid)) addStat(pid, playType, true, wScore, lScore);
    }
    for (const pid of losers) {
      if (ids.includes(pid)) addStat(pid, playType, false, lScore, wScore);
    }

    // Titles — only for completed playoff matches
    if (m.is_playoff) {
      const rounds = (eventPlayoffRounds.get(m.event_id) ?? []).sort((a, b) => b - a);
      const maxRound = rounds[0];
      const isFinal  = m.round_number === maxRound;
      const isBronze = !isFinal && rounds.length >= 2;

      if (isFinal) {
        for (const pid of winners) {
          if (ids.includes(pid)) titleInserts.push({ member_id: pid, tournament_event_id: m.event_id, title_name: "Gold", awarded_at: new Date().toISOString() });
        }
        for (const pid of losers) {
          if (ids.includes(pid)) titleInserts.push({ member_id: pid, tournament_event_id: m.event_id, title_name: "Silver", awarded_at: new Date().toISOString() });
        }
      } else if (isBronze) {
        for (const pid of winners) {
          if (ids.includes(pid)) titleInserts.push({ member_id: pid, tournament_event_id: m.event_id, title_name: "Bronze", awarded_at: new Date().toISOString() });
        }
      }
    }
  }

  // Bulk insert stats
  const statsRows = Array.from(statsMap.values());
  if (statsRows.length > 0) {
    const { error } = await admin.from("player_stats").insert(statsRows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Bulk insert titles (deduplicate by member+event+title)
  if (titleInserts.length > 0) {
    const seen = new Set<string>();
    const deduped = titleInserts.filter((t) => {
      const key = `${t.member_id}::${t.tournament_event_id}::${t.title_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const { error } = await admin.from("titles").insert(deduped);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    statsWritten: statsRows.length,
    titlesAwarded: titleInserts.length,
    matchesProcessed: clubMatches.length,
  });
}
