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
import { OpenPlayStandings } from "@/components/club/open-play-standings";

interface Member {
  id: string;
  full_name: string;
  nickname: string | null;
  gender: "male" | "female" | "other";
  is_guest: boolean;
  photo_url?: string | null;
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
  const [confirmEnd, setConfirmEnd] = useState(false);

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
    const minNeeded = isSingles ? 2 : 4;
    // Only fill as many courts as we have players for
    const courtsToFill = Math.min(session.num_courts, Math.floor(players.length / minNeeded));
    let assignments;

    if (isSingles) {
      assignments = generateSinglesRound(players, courtsToFill, history);
    } else {
      assignments = generateDoublesRound(
        players, courtsToFill, history,
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

  async function fillFreeCourts(currentMatches: typeof matches, force = false) {
    const supabase = createClient();
    const allPlayers: Player[] = [...participants].map((id) => ({
      id,
      gender: memberMap.get(id)?.gender,
    }));
    const minNeeded = isSingles ? 2 : 4;

    // How many courts can actually run given current player count
    const courtsInUse = Math.min(session.num_courts, Math.floor(allPlayers.length / minNeeded));

    // Courts with an active (unscored) match
    const activeCourts = new Set(
      currentMatches.filter((m) => m.winner_team === null).map((m) => m.court_number)
    );
    // Free courts = courts 1..courtsInUse with no active match
    const freeCourts = Array.from({ length: courtsInUse }, (_, i) => i + 1).filter(
      (c) => !activeCourts.has(c)
    );

    if (freeCourts.length === 0) return;

    const isExactFit = allPlayers.length === courtsInUse * minNeeded;

    // Exact fit: wait until ALL courts in use are free before scheduling the next round.
    // This prevents the same players from immediately reshuffling after one match finishes.
    // `force` bypasses this — used by the manual "Check for Match" button.
    if (!force && isExactFit && activeCourts.size > 0) return;

    // Work through each free court one at a time, updating busyPlayers as we go
    const busyPlayers = new Set<string>();
    for (const m of currentMatches) {
      if (m.winner_team === null) {
        [m.team1_player1, m.team1_player2, m.team2_player1, m.team2_player2]
          .filter(Boolean)
          .forEach((id) => busyPlayers.add(id!));
      }
    }

    const newMatches: typeof matches = [];
    let nextRoundNum = Math.max(0, ...currentMatches.map((m) => m.round_number)) + 1;

    for (const courtNum of freeCourts) {
      const availablePlayers = allPlayers.filter((p) => !busyPlayers.has(p.id));

      if (availablePlayers.length < minNeeded) break;

      const history = buildHistory([...currentMatches, ...newMatches], allPlayers);
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

      if (!assignments[0]) break;
      const a = assignments[0];

      const { data: newMatch } = await supabase.from("open_play_matches").insert({
        open_play_id: session.id,
        court_number: courtNum,
        round_number: nextRoundNum++,
        team1_player1: a.team1[0],
        team1_player2: a.team1[1] ?? null,
        team2_player1: a.team2[0],
        team2_player2: a.team2[1] ?? null,
      }).select("*").single();

      if (newMatch) {
        newMatches.push(newMatch);
        // Mark these players as busy so the next court loop excludes them
        [a.team1[0], a.team1[1], a.team2[0], a.team2[1]]
          .filter(Boolean)
          .forEach((id) => busyPlayers.add(id!));
      }
    }

    if (newMatches.length > 0) {
      setMatches((prev) => [...prev, ...newMatches]);
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
      await fillFreeCourts(updatedMatches);
    }
  }

  async function skipMatch(matchId: string) {
    const supabase = createClient();
    const skippedMatch = matches.find((m) => m.id === matchId);

    // Delete the match — no score, no W/L recorded
    await supabase.from("open_play_matches").delete().eq("id", matchId);
    const updatedMatches = matches.filter((m) => m.id !== matchId);
    setMatches(updatedMatches);

    if (skippedMatch) {
      await fillFreeCourts(updatedMatches);
    }
  }

  async function endSession() {
    const supabase = createClient();
    const unscoredIds = matches.filter((m) => m.winner_team === null).map((m) => m.id);
    if (unscoredIds.length > 0) {
      await supabase.from("open_play_matches").delete().in("id", unscoredIds);
      setMatches((prev) => prev.filter((m) => m.winner_team !== null));
    }
    await supabase.from("open_plays").update({ status: "completed" }).eq("id", session.id);
    setSessionStatus("completed");
    startTransition(() => router.refresh());
  }

  // Pending matches first, then scored matches newest-first
  const pendingMatches = matches.filter((m) => m.winner_team === null).sort((a, b) => a.court_number - b.court_number);
  const scoredMatches = matches.filter((m) => m.winner_team !== null).sort((a, b) => b.round_number - a.round_number || b.court_number - a.court_number);
  const sortedMatches = [...pendingMatches, ...scoredMatches];

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
        const stats: Record<string, { wins: number; losses: number; diff: number }> = {};
        const addPlayer = (id: string) => { if (!stats[id]) stats[id] = { wins: 0, losses: 0, diff: 0 }; };
        for (const m of matches) {
          if (m.winner_team === null) continue;
          const t1 = [m.team1_player1, m.team1_player2].filter(Boolean) as string[];
          const t2 = [m.team2_player1, m.team2_player2].filter(Boolean) as string[];
          t1.forEach(addPlayer); t2.forEach(addPlayer);
          const s1 = m.team1_score ?? 0;
          const s2 = m.team2_score ?? 0;
          if (m.winner_team === 1) {
            t1.forEach((id) => { stats[id].wins++; stats[id].diff += s1 - s2; });
            t2.forEach((id) => { stats[id].losses++; stats[id].diff += s2 - s1; });
          } else {
            t2.forEach((id) => { stats[id].wins++; stats[id].diff += s2 - s1; });
            t1.forEach((id) => { stats[id].losses++; stats[id].diff += s1 - s2; });
          }
        }
        const allIds = new Set([...Object.keys(stats), ...participants]);
        const rows = [...allIds]
          .map((id) => ({ id, ...(stats[id] ?? { wins: 0, losses: 0, diff: 0 }) }))
          .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.diff - a.diff);

        if (rows.length === 0) return null;

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
              <div className="border-t border-white/8 px-4 pb-5 pt-4">
                <OpenPlayStandings rows={rows} memberMap={memberMap} />
              </div>
            )}
          </div>
        );
      })()}

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
            <>
              <Button variant="secondary" onClick={() => fillFreeCourts(matches, true)}>
                Check for Match
              </Button>
              <Button variant="danger" onClick={() => setConfirmEnd(true)}>
                <StopCircle className="h-4 w-4" />
                End Session
              </Button>
            </>
          )}
        </div>
      )}

      {/* Matches — pending first, then scored newest first */}
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
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/40">Court {m.court_number}</span>
                  {!scored && sessionStatus === "active" && (
                    <button
                      onClick={() => skipMatch(m.id)}
                      className="text-xs text-white/25 transition hover:text-red-400"
                    >
                      Skip
                    </button>
                  )}
                </div>
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

      {sessionStatus === "completed" && (
        <div className="rounded-xl border border-brand-lime/20 bg-brand-lime/5 p-4 text-sm text-brand-lime">
          Session completed. Stats have been recorded.
        </div>
      )}

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmEnd(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1810] p-6 shadow-xl">
            <h3 className="mb-2 text-base font-bold text-white">End this session?</h3>
            <p className="mb-6 text-sm text-white/50">
              All unscored matches will be removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmEnd(false); endSession(); }}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {isPending ? "Ending…" : "Yes, End Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
