
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OpenPlayStandings } from "@/components/club/open-play-standings";

export default async function OpenPlayLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("open_plays")
    .select("id, name, play_type, status, num_courts, club_id")
    .eq("id", id)
    .single();

  if (!session) notFound();

  const { data: participants } = await supabase
    .from("open_play_participants")
    .select("member_id")
    .eq("open_play_id", id);

  const participantIds = participants?.map((p) => p.member_id) ?? [];

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, nickname, is_guest, photo_url")
    .in("id", participantIds.length > 0 ? participantIds : ["__none__"]);

  const memberMap = new Map((members ?? []).map((m) => [m.id, m]));

  const { data: matches } = await supabase
    .from("open_play_matches")
    .select("*")
    .eq("open_play_id", id)
    .order("round_number")
    .order("court_number");

  const allMatches = matches ?? [];

  // Build standings — same logic as open-play-manager, untouched
  const stats: Record<string, { wins: number; losses: number; diff: number }> = {};
  for (const m of allMatches) {
    if (m.winner_team === null) continue;
    const t1 = [m.team1_player1, m.team1_player2].filter(Boolean) as string[];
    const t2 = [m.team2_player1, m.team2_player2].filter(Boolean) as string[];
    [...t1, ...t2].forEach((pid) => { if (!stats[pid]) stats[pid] = { wins: 0, losses: 0, diff: 0 }; });
    const s1 = m.team1_score ?? 0;
    const s2 = m.team2_score ?? 0;
    if (m.winner_team === 1) {
      t1.forEach((pid) => { stats[pid].wins++; stats[pid].diff += s1 - s2; });
      t2.forEach((pid) => { stats[pid].losses++; stats[pid].diff += s2 - s1; });
    } else {
      t2.forEach((pid) => { stats[pid].wins++; stats[pid].diff += s2 - s1; });
      t1.forEach((pid) => { stats[pid].losses++; stats[pid].diff += s1 - s2; });
    }
  }

  const allIds = [...new Set([...Object.keys(stats), ...participantIds])];
  const rows = allIds
    .map((pid) => ({ id: pid, ...(stats[pid] ?? { wins: 0, losses: 0, diff: 0 }) }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.diff - a.diff);

  const sortedMatches = [...allMatches].sort(
    (a, b) => a.round_number - b.round_number || a.court_number - b.court_number
  );

  // Full name for match display (no nicknames)
  function playerFullName(pid: string) {
    const m = memberMap.get(pid);
    if (!m) return pid.slice(0, 8);
    return m.full_name;
  }

  return (
    <div className="min-h-screen bg-brand-dark px-4 pb-12 pt-6">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-lime/60">Live</p>
          <h1 className="mt-1 text-2xl font-black text-white">{session.name}</h1>
          <p className="mt-0.5 text-sm capitalize text-white/40">
            {session.play_type.replace(/_/g, " ")} · {session.num_courts} court{session.num_courts !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Standings */}
        {rows.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 pb-5 pt-4">
            <OpenPlayStandings rows={rows} memberMap={memberMap} />
          </div>
        )}

        {/* Matches */}
        {sortedMatches.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-white">Matches</h2>
            {sortedMatches.map((m) => {
              const t1 = [m.team1_player1, m.team1_player2]
                .filter(Boolean)
                .map((pid) => playerFullName(pid as string))
                .join(" & ");
              const t2 = [m.team2_player1, m.team2_player2]
                .filter(Boolean)
                .map((pid) => playerFullName(pid as string))
                .join(" & ");
              const scored = m.winner_team !== null;
              return (
                <div
                  key={m.id}
                  className={`rounded-lg border p-3 ${scored ? "border-brand-lime/20 bg-brand-lime/5" : "border-white/10 bg-white/5"}`}
                >
                  <div className="mb-2">
                    <span className="text-xs font-medium text-white/40">Court {m.court_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${m.winner_team === 1 ? "text-brand-lime" : "text-white"}`}>
                      {t1}
                    </span>
                    {scored ? (
                      <>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-white">{m.team1_score}</span>
                        <span className="shrink-0 text-white/30">—</span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-white">{m.team2_score}</span>
                      </>
                    ) : (
                      <span className="shrink-0 rounded-full bg-brand-lime/10 px-2.5 py-0.5 text-xs font-semibold text-brand-lime">
                        Playing
                      </span>
                    )}
                    <span className={`min-w-0 flex-1 truncate text-right text-sm font-semibold ${m.winner_team === 2 ? "text-brand-lime" : "text-white"}`}>
                      {t2}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sortedMatches.length === 0 && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
            <p className="text-white/30">Session hasn&apos;t started yet</p>
          </div>
        )}

        <p className="text-center text-xs text-white/20">Auto-refreshes every 10 seconds</p>
      </div>
    </div>
  );
}
