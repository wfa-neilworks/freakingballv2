export const revalidate = 10;

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PlayerAvatar } from "@/components/club/player-avatar";

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

  // Build standings
  const stats: Record<string, { wins: number; losses: number }> = {};
  for (const m of allMatches) {
    if (m.winner_team === null) continue;
    const t1 = [m.team1_player1, m.team1_player2].filter(Boolean) as string[];
    const t2 = [m.team2_player1, m.team2_player2].filter(Boolean) as string[];
    [...t1, ...t2].forEach((id) => { if (!stats[id]) stats[id] = { wins: 0, losses: 0 }; });
    if (m.winner_team === 1) {
      t1.forEach((id) => stats[id].wins++);
      t2.forEach((id) => stats[id].losses++);
    } else {
      t2.forEach((id) => stats[id].wins++);
      t1.forEach((id) => stats[id].losses++);
    }
  }

  const rows = participantIds
    .map((id) => ({ id, ...(stats[id] ?? { wins: 0, losses: 0 }) }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  const sortedMatches = [...allMatches].sort(
    (a, b) => a.round_number - b.round_number || a.court_number - b.court_number
  );

  function displayName(pid: string) {
    const m = memberMap.get(pid);
    return m?.nickname ?? m?.full_name?.split(" ")[0] ?? "?";
  }

  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumStyles = [
    { ring: "border-slate-400/60", avatar: "bg-slate-400/20 text-slate-300", label: "2nd", crown: false },
    { ring: "border-yellow-400/80", avatar: "bg-yellow-400/20 text-yellow-300", label: "1st", crown: true },
    { ring: "border-amber-600/60", avatar: "bg-amber-700/20 text-amber-500", label: "3rd", crown: false },
  ];

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
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 pb-5 pt-4">
            <h2 className="mb-4 font-semibold text-white">Standings</h2>

            {/* Podium */}
            <div className="mb-6 flex items-end justify-center gap-6">
              {podiumOrder.map((row, pi) => {
                if (!row) return <div key={pi} className="w-20" />;
                const style = podiumStyles[pi];
                const isFirst = pi === 1;
                return (
                  <div key={row.id} className="flex flex-col items-center gap-1.5">
                    {style.crown && <span className="mb-0.5 text-lg">👑</span>}
                    <PlayerAvatar
                      name={displayName(row.id)}
                      photoUrl={memberMap.get(row.id)?.photo_url}
                      size={isFirst ? "lg" : "md"}
                      className={`border-2 ${style.ring} ${!memberMap.get(row.id)?.photo_url ? style.avatar : ""}`}
                    />
                    <p className={`max-w-[72px] truncate text-center font-semibold ${isFirst ? "text-sm text-white" : "text-xs text-white/70"}`}>
                      {displayName(row.id)}
                    </p>
                    <p className="text-xs text-white/40">
                      <span className="font-semibold text-brand-lime">{row.wins}W</span>
                      {" · "}
                      <span>{row.losses}L</span>
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isFirst ? "bg-yellow-400/20 text-yellow-300" :
                      pi === 0 ? "bg-slate-400/15 text-slate-400" :
                      "bg-amber-700/20 text-amber-500"
                    }`}>
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rest of table */}
            {rest.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-left text-xs text-white/40">
                      <th className="w-8 px-4 py-2">#</th>
                      <th className="px-3 py-2">Player</th>
                      <th className="px-3 py-2 text-center">W</th>
                      <th className="px-3 py-2 text-center">L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((row, i) => {
                      const mem = memberMap.get(row.id);
                      return (
                        <tr key={row.id} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-2.5 text-xs text-white/30">{i + 4}</td>
                          <td className="px-3 py-2.5 font-medium text-white">
                            {mem?.nickname ?? mem?.full_name ?? row.id.slice(0, 8)}
                            {mem?.is_guest && <span className="ml-1.5 text-xs text-yellow-400/70">(G)</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center font-semibold text-brand-lime">{row.wins}</td>
                          <td className="px-3 py-2.5 text-center text-white/50">{row.losses}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Matches */}
        {sortedMatches.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-white">Matches</h2>
            {sortedMatches.map((m) => {
              const t1 = [m.team1_player1, m.team1_player2].filter(Boolean).map((id) => displayName(id as string)).join(" & ");
              const t2 = [m.team2_player1, m.team2_player2].filter(Boolean).map((id) => displayName(id as string)).join(" & ");
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
                    <span className={`flex-1 text-sm font-semibold ${m.winner_team === 1 ? "text-brand-lime" : "text-white"}`}>
                      {t1}
                    </span>
                    {scored ? (
                      <>
                        <span className="text-sm font-bold tabular-nums text-white">{m.team1_score}</span>
                        <span className="text-white/30">—</span>
                        <span className="text-sm font-bold tabular-nums text-white">{m.team2_score}</span>
                      </>
                    ) : (
                      <span className="rounded-full bg-brand-lime/10 px-2.5 py-0.5 text-xs font-semibold text-brand-lime">
                        Playing
                      </span>
                    )}
                    <span className={`flex-1 text-right text-sm font-semibold ${m.winner_team === 2 ? "text-brand-lime" : "text-white"}`}>
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
