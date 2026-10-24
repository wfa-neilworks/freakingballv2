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
import { UserPlus, Play, RefreshCw, CheckCircle, StopCircle } from "lucide-react";

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
  const [scores, setScores] = useState<
    Record<string, { t1: string; t2: string }>
  >({});
  const [sessionStatus, setSessionStatus] = useState(session.status);

  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  const isSingles = session.play_type === "singles";

  const maxRound = Math.max(0, ...matches.map((m) => m.round_number));
  const currentRoundMatches = matches.filter(
    (m) => m.round_number === maxRound
  );
  const allCurrentScored = currentRoundMatches.every(
    (m) => m.winner_team !== null
  );

  function playerName(id: string) {
    const m = memberMap.get(id);
    return m?.nickname ?? m?.full_name ?? id.slice(0, 8);
  }

  async function toggleParticipant(memberId: string) {
    const supabase = createClient();
    const next = new Set(participants);

    if (next.has(memberId)) {
      await supabase
        .from("open_play_participants")
        .delete()
        .eq("open_play_id", session.id)
        .eq("member_id", memberId);
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

    // Rebuild history from existing matches
    const history = createHistory(players.map((p) => p.id));
    for (const m of matches) {
      history.matchCount.set(
        m.team1_player1,
        (history.matchCount.get(m.team1_player1) ?? 0) + 1
      );
      history.matchCount.set(
        m.team2_player1,
        (history.matchCount.get(m.team2_player1) ?? 0) + 1
      );
      if (m.team1_player2) {
        history.matchCount.set(
          m.team1_player2,
          (history.matchCount.get(m.team1_player2) ?? 0) + 1
        );
        history.partneredWith.get(m.team1_player1)?.add(m.team1_player2);
        history.partneredWith.get(m.team1_player2)?.add(m.team1_player1);
      }
      if (m.team2_player2) {
        history.matchCount.set(
          m.team2_player2,
          (history.matchCount.get(m.team2_player2) ?? 0) + 1
        );
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

    const nextRound = maxRound + 1;
    let assignments;

    if (isSingles) {
      assignments = generateSinglesRound(players, session.num_courts, history);
    } else {
      assignments = generateDoublesRound(
        players,
        session.num_courts,
        history,
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

    const { data: newMatches } = await supabase
      .from("open_play_matches")
      .insert(inserts)
      .select("*");

    if (newMatches) {
      setMatches((prev) => [...prev, ...newMatches]);
    }

    // Set session to active if not already
    if (sessionStatus === "scheduled") {
      await supabase
        .from("open_plays")
        .update({ status: "active" })
        .eq("id", session.id);
      setSessionStatus("active");
    }
  }

  async function submitScore(matchId: string) {
    const s = scores[matchId];
    if (!s) return;
    const t1 = parseInt(s.t1, 10);
    const t2 = parseInt(s.t2, 10);
    if (isNaN(t1) || isNaN(t2)) return;

    const winner = t1 > t2 ? 1 : t2 > t1 ? 2 : null;
    const supabase = createClient();

    await supabase
      .from("open_play_matches")
      .update({
        team1_score: t1,
        team2_score: t2,
        winner_team: winner as 1 | 2 | null,
        played_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, team1_score: t1, team2_score: t2, winner_team: winner as 1 | 2 | null }
          : m
      )
    );
  }

  async function endSession() {
    const supabase = createClient();
    await supabase
      .from("open_plays")
      .update({ status: "completed" })
      .eq("id", session.id);
    setSessionStatus("completed");
    startTransition(() => router.refresh());
  }

  const roundNumbers = [...new Set(matches.map((m) => m.round_number))].sort(
    (a, b) => a - b
  );

  return (
    <div className="space-y-6">
      {/* Participants Panel */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">
            Participants ({participants.size})
          </h2>
          {sessionStatus === "scheduled" && (
            <span className="text-xs text-white/40">
              Toggle to add/remove players
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allMembers.map((m) => {
            const isIn = participants.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() =>
                  sessionStatus !== "completed" && toggleParticipant(m.id)
                }
                disabled={sessionStatus === "completed"}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  isIn
                    ? "bg-brand-lime text-brand-dark"
                    : "bg-white/10 text-white/60 hover:bg-white/20",
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
      </div>

      {/* Rounds */}
      {roundNumbers.map((round) => {
        const roundMatches = matches.filter((m) => m.round_number === round);
        const isCurrentRound = round === maxRound;

        return (
          <div
            key={round}
            className="rounded-xl border border-white/10 bg-white/5 p-5"
          >
            <h2 className="mb-4 font-semibold text-white">Round {round}</h2>
            <div className="space-y-3">
              {roundMatches.map((m) => {
                const t1Names = [
                  playerName(m.team1_player1),
                  m.team1_player2 ? playerName(m.team1_player2) : null,
                ]
                  .filter(Boolean)
                  .join(" & ");
                const t2Names = [
                  playerName(m.team2_player1),
                  m.team2_player2 ? playerName(m.team2_player2) : null,
                ]
                  .filter(Boolean)
                  .join(" & ");

                const scored = m.winner_team !== null;

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg border p-3",
                      scored
                        ? "border-brand-lime/20 bg-brand-lime/5"
                        : "border-white/10 bg-black/20"
                    )}
                  >
                    <span className="mb-2 block text-xs font-medium text-white/40">
                      Court {m.court_number}
                    </span>

                    {/* Player 1 [score] vs [score] Player 2 */}
                    <div className="flex items-center gap-2">
                      {/* Team 1 */}
                      <span
                        className={cn(
                          "flex-1 text-right text-sm font-semibold",
                          m.winner_team === 1 ? "text-brand-lime" : "text-white"
                        )}
                      >
                        {t1Names}
                      </span>

                      {scored ? (
                        <>
                          <span className="text-sm font-bold tabular-nums text-white">
                            {m.team1_score}
                          </span>
                          <span className="text-white/30">—</span>
                          <span className="text-sm font-bold tabular-nums text-white">
                            {m.team2_score}
                          </span>
                        </>
                      ) : isCurrentRound && sessionStatus === "active" ? (
                        <>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="h-8 w-12 rounded bg-white/10 px-2 text-center text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                            value={scores[m.id]?.t1 ?? ""}
                            onChange={(e) =>
                              setScores((prev) => ({
                                ...prev,
                                [m.id]: { t1: e.target.value, t2: prev[m.id]?.t2 ?? "" },
                              }))
                            }
                          />
                          <span className="text-white/30">vs</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="h-8 w-12 rounded bg-white/10 px-2 text-center text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                            value={scores[m.id]?.t2 ?? ""}
                            onChange={(e) =>
                              setScores((prev) => ({
                                ...prev,
                                [m.id]: { t1: prev[m.id]?.t1 ?? "", t2: e.target.value },
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => submitScore(m.id)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-white/30">vs</span>
                      )}

                      {/* Team 2 */}
                      <span
                        className={cn(
                          "flex-1 text-sm font-semibold",
                          m.winner_team === 2 ? "text-brand-lime" : "text-white"
                        )}
                      >
                        {t2Names}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Actions */}
      {sessionStatus !== "completed" && (
        <div className="flex flex-wrap gap-3">
          {participants.size >= (isSingles ? 2 : 4) && (
            <Button
              onClick={generateNextRound}
              disabled={maxRound > 0 && !allCurrentScored}
            >
              <Play className="h-4 w-4" />
              {maxRound === 0 ? "Start Round 1" : `Generate Round ${maxRound + 1}`}
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
