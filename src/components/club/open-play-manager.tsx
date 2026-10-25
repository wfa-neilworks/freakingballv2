"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  generateSinglesRound,
  generateDoublesRound,
  createHistory,
  type Player,
} from "@/lib/rotation";
import { UserPlus, Play, CheckCircle, StopCircle, ChevronDown, ChevronUp } from "lucide-react";
import { isValidPickleballScore } from "@/components/club/score-picker";

interface Member {
  id: string;
  full_name: string;
  nickname: string | null;
  gender: "male" | "female" | "other";
  is_guest: boolean;
}

interface Match {
  id: string;
  round_number: number;
  court_number: number;
  team1_player1: string;
  team1_player2: string | null;
  team2_player1: string;
  team2_player2: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_team: 1 | 2 | null;
}

interface OpenPlayManagerProps {
  session: {
    id: string;
    play_type: string;
    partner_mode: string | null;
    doubles_category: string | null;
    num_courts: number;
    status: string;
  };
  allMembers: Member[];
  participantIds: string[];
  matches: Match[];
}

export function OpenPlayManager({
  session,
  allMembers,
  participantIds: initialParticipants,
  matches: initialMatches,
}: OpenPlayManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(initialParticipants)
  );
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [scores, setScores] = useState<Record<string, { t1: string; t2: string }>>({});
  const [sessionStatus, setSessionStatus] = useState(session.status);

  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  const isSingles = session.play_type === "singles";
  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [standingsOpen, setStandingsOpen] = useState(true);

  const maxRound = Math.max(0, ...matches.map((m) => m.round_number));

  function playerName(id: string) {
    const m = memberMap.get(id);
    return m?.nickname ?? m?.full_name ?? id.slice(0, 8);
  }

  function buildHistory(allMatches: Match[], players: Player[]) {
    const history = createHistory(players.map((p) => p.id));
    for (const m of allMatches) {
      history.matchCount.set(m.team1_player1, (history.matchCount.get(m.team1_player1) ?? 0) + 1);
      history.matchCount.set(m.team2_player1, (history.matchCount.get(m.team2_player1) ?? 0) + 1);
      if (m.team1_player2) {
        history.matchCount.set(m.team1_player2, (history.matchCount.get(m.team1_player2) ?? 0) + 1);
        history.partneredWith.get(m.team1_player1)?.add(m.team1_player2);
        history.partneredWith.get(m.team1_player2)?.add(m.team1_player1);
      }
      if (m.team2_player2) {
        history.matchCount.set(m.team2_player2, (history.matchCount.get(m.team2_player2) ?? 0) + 1);
        history.partneredWith.get(m.team2_player1)?.add(m.team2_player2);
        history.partneredWith.get(m.team2_player2)?.add(m.team2_player1);
      }
      [m.team1_player1, m.team1_player2].filter(Boolean).forEach((a) => {
        [m.team2_player1, m.team2_player2].filter(Boolean).forEach((b) => {
          if (a && b) {
            history.playedAgainst.get(a)?.add(b);
            history.playedAgainst.get(b)?.add(a);
          }
        });
      });
    }
    return history;
  }

  async function toggleParticipant(memberId: string) {
    const supabase = createClient();
    const next = new Set(participants);

    if (next.has(memberId)) {
      await supabase.from("open_play_participants").delete()
        .eq("open_play_id", session.id).eq("member_id", memberId);
      next.delete(memberId);
    } else {
      await supabase.from("open_play_participants").insert({
        open_play_id: session.id,
        member_id: memberId,
      });
      next.add(memberId);
    }
    setParticipants(next);
  }

  async function generateNextRound() {
    const players: Player[] = [...participants].map((id) => ({
      id,
      gender: memberMap.get(id)?.gender,
    }));

    const history = buildHistory(matches, players);
    const nextRound = maxRound + 1;
    let assignments;

    if (isSingles) {
      assignments = generateSinglesRound(players, session.num_courts, history);
    } else {
      assignments = generateDoublesRound(
        players, session.num_courts, history,
        (session.partner_mode ?? "rotating") as "fixed" | "rotating",
        session.play_type as "doubles" | "mixed_doubles" | "open_doubles"
      );
    }

    const supabase = createClient();
    const inserts = assignments.map((a) => ({
      open_play_id: session.id,
      court_number: a.courtNumber,
      round_number: nextRound,
      team1_player1: a.team1[0],
      team1_player2: a.team1[1] ?? null,
      team2_player1: a.team2[0],
      team2_player2: a.team2[1] ?? null,
    }));

    const { data: newMatches } = await supabase.from("open_play_matches").insert(inserts).select("*");
    if (newMatches) setMatches((prev) => [...prev, ...newMatches]);

    if (sessionStatus === "scheduled") {
      await supabase.from("open_plays").update({ status: "active" }).eq("id", session.id);
      setSessionStatus("active");
    }
  }

  async function submitScore(matchId: string) {
    const s = scores[matchId];
    if (!s) return;
    const t1 = parseInt(s.t1, 10);
    const t2 = parseInt(s.t2, 10);
    if (isNaN(t1) || isNaN(t2) || !isValidPickleballScore(t1, t2)) return;

    const winner = t1 > t2 ? 1 : t2 > t1 ? 2 : null;
    const supabase = createClient();

    await supabase.from("open_play_matches").update({
      team1_score: t1,
      team2_score: t2,
      winner_team: winner as 1 | 2 | null,
      played_at: new Date().toISOString(),
    }).eq("id", matchId);

    const scoredMatch = matches.find((m) => m.id === matchId);
    const updatedMatches = matches.map((m) =>
      m.id === matchId
        ? { ...m, team1_score: t1, team2_score: t2, winner_team: winner as 1 | 2 | null }
        : m
    );
    setMatches(updatedMatches);

    // Auto-assign a new match to the freed court
    if (scoredMatch) {
      const players: Player[] = [...participants].map((id) => ({
        id,
        gender: memberMap.get(id)?.gender,
      }));

      // Players currently in an unfinished match are not available
      const busyPlayers = new Set<string>();
      for (const m of updatedMatches) {
        if (m.winner_team === null) {
          [m.team1_player1, m.team1_player2, m.team2_player1, m.team2_player2]
            .filter(Boolean)
            .forEach((id) => busyPlayers.add(id!));
        }
      }
      const availablePlayers = players.filter((p) => !busyPlayers.has(p.id));
      const minNeeded = isSingles ? 2 : 4;

      if (availablePlayers.length >= minNeeded) {
        const history = buildHistory(updatedMatches, players);
        let assignments;
        if (isSingles) {
          assignments = generateSinglesRound(availablePlayers, 1, history);
        } else {
          assignments = generateDoublesRound(
            availablePlayers, 1, history,
            (session.partner_mode ?? "rotating") as "fixed" | "rotating",
            session.play_type as "doubles" | "mixed_doubles" | "open_doubles"
          );
        }

        if (assignments[0]) {
          const a = assignments[0];
          const nextRoundNum = Math.max(...updatedMatches.map((m) => m.round_number)) + 1;
          const { data: newMatch } = await supabase.from("open_play_matches").insert({
            open_play_id: session.id,
            court_number: scoredMatch.court_number,
            round_number: nextRoundNum,
            team1_player1: a.team1[0],
            team1_player2: a.team1[1] ?? null,
            team2_player1: a.team2[0],
            team2_player2: a.team2[1] ?? null,
          }).select("*").single();

          if (newMatch) setMatches((prev) => [...prev, newMatch]);
        }
      }
    }
  }

  async function endSession() {
    const supabase = createClient();
    await supabase.from("open_plays").update({ status: "completed" }).eq("id", session.id);
    setSessionStatus("completed");
    startTransition(() => router.refresh());
  }

  const sortedMatches = [...matches].sort((a, b) => a.round_number - b.round_number || a.court_number - b.court_number);

  return (
    <div className="space-y-6">
      {/* Participants Panel */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <button
          className="flex w-full items-center justify-between px-5 py-4"
          onClick={() => setParticipantsOpen((o) => !o)}
        >
          <h2 className="font-semibold text-white">Participants ({participants.size})</h2>
          <div className="flex items-center gap-2">
            {sessionStatus === "scheduled" && (
              <span className="text-xs text-white/40">Toggle to add/remove</span>
            )}
            {participantsOpen ? (
              <ChevronUp className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/40" />
            )}
          </div>
        </button>
        {participantsOpen && (
          <div className="flex flex-wrap gap-2 border-t border-white/8 px-5 pb-5 pt-4">
            {allMembers.map((m) => {
              const isIn = participants.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => sessionStatus !== "completed" && toggleParticipant(m.id)}
                  disabled={sessionStatus === "completed"}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    isIn ? "bg-brand-lime text-brand-dark" : "bg-white/10 text-white/60 hover:bg-white/20",
                    m.is_guest && "border border-dashed",
                    sessionStatus === "completed" && "cursor-default opacity-70"
                  )}
                >
                  <UserPlus className="mr-1 inline-block h-3 w-3" />
                  {m.nickname ?? m.full_name}
                  {m.is_guest && " (G)"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Standings Panel */}
      {(() => {
        const stats: Record<string, { wins: number; losses: number }> = {};
        const addPlayer = (id: string) => { if (!stats[id]) stats[id] = { wins: 0, losses: 0 }; };
        for (const m of matches) {
          if (m.winner_team === null) continue;
          const t1 = [m.team1_player1, m.team1_player2].filter(Boolean) as string[];
          const t2 = [m.team2_player1, m.team2_player2].filter(Boolean) as string[];
          t1.forEach(addPlayer); t2.forEach(addPlayer);
          if (m.winner_team === 1) {
            t1.forEach((id) => stats[id].wins++);
            t2.forEach((id) => stats[id].losses++);
          } else {
            t2.forEach((id) => stats[id].wins++);
            t1.forEach((id) => stats[id].losses++);
          }
        }
        const rows = [...participants]
          .map((id) => ({ id, ...(stats[id] ?? { wins: 0, losses: 0 }) }))
          .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

        if (rows.length === 0) return null;

        const top3 = rows.slice(0, 3);
        const rest = rows.slice(3);

        function initials(id: string) {
          const mem = memberMap.get(id);
          const name = mem?.nickname ?? mem?.full_name ?? "?";
          return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
        }
        function displayName(id: string) {
          const mem = memberMap.get(id);
          return mem?.nickname ?? mem?.full_name?.split(" ")[0] ?? "?";
        }

        const podiumOrder = [top3[1], top3[0], top3[2]];
        const podiumStyles = [
          { ring: "border-slate-400/60", avatar: "bg-slate-400/20 text-slate-300", label: "2nd", crown: false },
          { ring: "border-yellow-400/80", avatar: "bg-yellow-400/20 text-yellow-300", label: "1st", crown: true },
          { ring: "border-amber-600/60", avatar: "bg-amber-700/20 text-amber-500", label: "3rd", crown: false },
        ];

        return (
          <div className="rounded-xl border border-white/10 bg-white/5">
            <button
              className="flex w-full items-center justify-between px-5 py-4"
              onClick={() => setStandingsOpen((o) => !o)}
            >
              <h2 className="font-semibold text-white">Standings</h2>
              {standingsOpen ? (
                <ChevronUp className="h-4 w-4 text-white/40" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/40" />
              )}
            </button>

            {standingsOpen && (
              <div className="border-t border-white/8 px-5 pb-5 pt-6">
                <div className="mb-6 flex items-end justify-center gap-6">
                  {podiumOrder.map((row, pi) => {
                    if (!row) return <div key={pi} className="w-20" />;
                    const style = podiumStyles[pi];
                    const isFirst = pi === 1;
                    return (
                      <div key={row.id} className="flex flex-col items-center gap-1.5">
                        {style.crown && <span className="mb-0.5 text-lg">👑</span>}
                        <div className={`flex items-center justify-center rounded-full border-2 font-bold ${style.ring} ${style.avatar} ${isFirst ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm"}`}>
                          {initials(row.id)}
                        </div>
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
          </div>
        );
      })()}

      {/* Matches — flat list, newest at bottom */}
      {sortedMatches.length > 0 && (
        <div className="space-y-2">
          {sortedMatches.map((m) => {
            const t1Names = [playerName(m.team1_player1), m.team1_player2 ? playerName(m.team1_player2) : null]
              .filter(Boolean).join(" & ");
            const t2Names = [playerName(m.team2_player1), m.team2_player2 ? playerName(m.team2_player2) : null]
              .filter(Boolean).join(" & ");
            const scored = m.winner_team !== null;

            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-lg border p-3",
                  scored ? "border-brand-lime/20 bg-brand-lime/5" : "border-white/10 bg-white/5"
                )}
              >
                <span className="mb-2 block text-xs font-medium text-white/40">Court {m.court_number}</span>
                <div className="flex items-center gap-2">
                  <span className={cn("flex-1 text-sm font-semibold", m.winner_team === 1 ? "text-brand-lime" : "text-white")}>
                    {t1Names}
                  </span>
                  {scored ? (
                    <>
                      <span className="text-sm font-bold tabular-nums text-white">{m.team1_score}</span>
                      <span className="text-white/30">—</span>
                      <span className="text-sm font-bold tabular-nums text-white">{m.team2_score}</span>
                    </>
                  ) : sessionStatus === "active" ? (
                    <>
                      {(() => {
                        const t1v = parseInt(scores[m.id]?.t1 ?? "", 10);
                        const t2v = parseInt(scores[m.id]?.t2 ?? "", 10);
                        const valid = !isNaN(t1v) && !isNaN(t2v) && isValidPickleballScore(t1v, t2v);
                        return (
                          <>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="h-8 w-12 rounded bg-[#1a2a1f] border border-white/20 px-2 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                              value={scores[m.id]?.t1 ?? ""}
                              onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: { t1: e.target.value, t2: prev[m.id]?.t2 ?? "" } }))}
                            />
                            <button
                              onClick={() => submitScore(m.id)}
                              disabled={!valid}
                              className="rounded-lg bg-brand-lime px-2.5 py-1.5 text-xs font-bold text-brand-dark transition disabled:opacity-30"
                            >
                              ✓
                            </button>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="h-8 w-12 rounded bg-[#1a2a1f] border border-white/20 px-2 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                              value={scores[m.id]?.t2 ?? ""}
                              onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: { t1: prev[m.id]?.t1 ?? "", t2: e.target.value } }))}
                            />
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="text-xs text-white/30">vs</span>
                  )}
                  <span className={cn("flex-1 text-right text-sm font-semibold", m.winner_team === 2 ? "text-brand-lime" : "text-white")}>
                    {t2Names}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {sessionStatus !== "completed" && (
        <div className="flex flex-wrap gap-3">
          {sessionStatus === "scheduled" && participants.size >= (isSingles ? 2 : 4) && (
            <Button onClick={generateNextRound}>
              <Play className="h-4 w-4" />
              Start Session
            </Button>
          )}
          {sessionStatus === "active" && (
            <Button variant="danger" onClick={endSession} loading={isPending}>
              <StopCircle className="h-4 w-4" />
              End Session
            </Button>
          )}
        </div>
      )}

      {sessionStatus === "completed" && (
        <div className="rounded-xl border border-brand-lime/20 bg-brand-lime/5 p-4 text-sm text-brand-lime">
          Session completed. Stats have been recorded.
        </div>
      )}
    </div>
  );
}
