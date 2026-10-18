"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { PlayType, TournamentStatus } from "@/types/database";

type Member = {
  id: string;
  full_name: string;
  nickname: string | null;
  gender: string;
  is_guest: boolean;
};

type Registration = {
  id: string;
  member_id: string;
  partner_id: string | null;
  pool_number: number | null;
};

type Match = {
  id: string;
  event_id: string;
  pool_number: number | null;
  court_number: number;
  round_number: number;
  team1_player1: string;
  team1_player2: string | null;
  team2_player1: string;
  team2_player2: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_team: number | null;
  is_playoff: boolean;
  played_at: string | null;
};

type Event = {
  id: string;
  tournament_id: string;
  name: string;
  play_type: PlayType;
  doubles_category: string | null;
  num_courts: number;
  num_pools: number;
  status: string;
};

function memberLabel(m: Member) {
  return m.nickname ? `${m.full_name} (${m.nickname})` : m.full_name;
}

export function EventManager({
  event,
  tournamentStatus,
  members,
  initialRegistrations,
  initialMatches,
}: {
  event: Event;
  tournamentStatus: TournamentStatus;
  members: Member[];
  initialRegistrations: Registration[];
  initialMatches: Match[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { t1: string; t2: string }>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isDoubles = event.play_type !== "singles";
  const registeredIds = new Set(registrations.map((r) => r.member_id));
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const canRegister = tournamentStatus === "registration" && event.status === "scheduled";
  const canGenerate = tournamentStatus === "active" && event.status === "scheduled" && registrations.length >= 2;
  const canScore = event.status === "active";

  // ── Registration ──────────────────────────────────────────────────────────

  async function addParticipant(memberId: string) {
    setError(null);
    setAddingId(memberId);
    // Optimistic: show in list immediately with a temp id
    const tempReg: Registration = { id: `temp-${memberId}`, member_id: memberId, partner_id: null, pool_number: null };
    setRegistrations((prev) => [...prev, tempReg]);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("tournament_registrations")
      .insert({ event_id: event.id, member_id: memberId })
      .select()
      .single();
    if (err) {
      setRegistrations((prev) => prev.filter((r) => r.id !== tempReg.id));
      setError(err.message);
    } else {
      setRegistrations((prev) => prev.map((r) => r.id === tempReg.id ? data : r));
    }
    setAddingId(null);
  }

  async function removeParticipant(regId: string) {
    setError(null);
    setRemovingId(regId);
    // Optimistic: remove from list immediately
    setRegistrations((prev) => prev.filter((r) => r.id !== regId));
    const supabase = createClient();
    const { error: err } = await supabase
      .from("tournament_registrations")
      .delete()
      .eq("id", regId);
    if (err) {
      setError(err.message);
      // Revert on failure — just refresh
      startTransition(() => router.refresh());
    }
    setRemovingId(null);
  }

  async function assignPartner(regId: string, partnerId: string) {
    setError(null);
    const supabase = createClient();
    const reg = registrations.find((r) => r.id === regId);
    if (!reg) return;

    // Clear old reverse link if this player had a different partner before
    if (reg.partner_id && reg.partner_id !== partnerId) {
      const oldPartnerReg = registrations.find((r) => r.member_id === reg.partner_id);
      if (oldPartnerReg) {
        await supabase
          .from("tournament_registrations")
          .update({ partner_id: null })
          .eq("id", oldPartnerReg.id);
      }
    }

    // Set this player's partner
    const newPartnerId = partnerId || null;
    await supabase
      .from("tournament_registrations")
      .update({ partner_id: newPartnerId })
      .eq("id", regId);

    // Set reverse link on the partner (clear their old partner first)
    if (newPartnerId) {
      const partnerReg = registrations.find((r) => r.member_id === newPartnerId);
      if (partnerReg) {
        // Clear whoever the partner was previously paired with
        if (partnerReg.partner_id && partnerReg.partner_id !== reg.member_id) {
          const displaced = registrations.find((r) => r.member_id === partnerReg.partner_id);
          if (displaced) {
            await supabase
              .from("tournament_registrations")
              .update({ partner_id: null })
              .eq("id", displaced.id);
          }
        }
        await supabase
          .from("tournament_registrations")
          .update({ partner_id: reg.member_id })
          .eq("id", partnerReg.id);
      }
    }

    // Rebuild local state to reflect all changes
    setRegistrations((prev) => {
      return prev.map((r) => {
        if (r.id === regId) return { ...r, partner_id: newPartnerId };
        if (newPartnerId && r.member_id === newPartnerId) return { ...r, partner_id: reg.member_id };
        // Clear displaced partners
        if (r.member_id === reg.partner_id && reg.partner_id !== newPartnerId) return { ...r, partner_id: null };
        const partnerReg = prev.find((p) => p.member_id === newPartnerId);
        if (partnerReg && r.member_id === partnerReg.partner_id && r.member_id !== reg.member_id) return { ...r, partner_id: null };
        return r;
      });
    });
  }

  // ── Match Generation ───────────────────────────────────────────────────────

  async function generateMatches() {
    setError(null);

    // Activate the event
    const supabase = createClient();
    const { error: statusErr } = await supabase
      .from("tournament_events")
      .update({ status: "active" })
      .eq("id", event.id);
    if (statusErr) { setError(statusErr.message); return; }

    // Build teams
    const teams: { p1: string; p2: string | null }[] = [];
    if (!isDoubles) {
      registrations.forEach((r) => teams.push({ p1: r.member_id, p2: null }));
    } else {
      const seen = new Set<string>();
      registrations.forEach((r) => {
        if (seen.has(r.member_id)) return;
        seen.add(r.member_id);
        if (r.partner_id) seen.add(r.partner_id);
        teams.push({ p1: r.member_id, p2: r.partner_id ?? null });
      });
    }

    if (teams.length < 2) { setError("Need at least 2 teams to generate matches."); return; }

    // Round-robin within pools
    const poolSize = Math.ceil(teams.length / event.num_pools);
    const inserts: object[] = [];
    let courtCursor = 1;

    for (let pool = 1; pool <= event.num_pools; pool++) {
      const poolTeams = teams.slice((pool - 1) * poolSize, pool * poolSize);
      const rounds = roundRobin(poolTeams);
      rounds.forEach((round, roundIdx) => {
        round.forEach((match) => {
          inserts.push({
            event_id: event.id,
            pool_number: event.num_pools > 1 ? pool : null,
            court_number: ((courtCursor - 1) % event.num_courts) + 1,
            round_number: roundIdx + 1,
            team1_player1: match[0].p1,
            team1_player2: match[0].p2 ?? null,
            team2_player1: match[1].p1,
            team2_player2: match[1].p2 ?? null,
          });
          courtCursor++;
        });
      });
    }

    const { data: newMatches, error: matchErr } = await supabase
      .from("tournament_matches")
      .insert(inserts)
      .select();
    if (matchErr) { setError(matchErr.message); return; }

    setMatches(newMatches ?? []);
    startTransition(() => router.refresh());
  }

  // ── Score Entry ────────────────────────────────────────────────────────────

  async function saveScore(matchId: string) {
    setError(null);
    const s = scores[matchId];
    if (!s) return;
    const t1 = parseInt(s.t1);
    const t2 = parseInt(s.t2);
    if (isNaN(t1) || isNaN(t2)) { setError("Enter valid scores."); return; }
    const winner = t1 > t2 ? 1 : t2 > t1 ? 2 : null;

    const supabase = createClient();
    const { error: err } = await supabase
      .from("tournament_matches")
      .update({ team1_score: t1, team2_score: t2, winner_team: winner, played_at: new Date().toISOString() })
      .eq("id", matchId);
    if (err) { setError(err.message); return; }

    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, team1_score: t1, team2_score: t2, winner_team: winner } : m
      )
    );
  }

  // ── Complete Event ─────────────────────────────────────────────────────────

  async function completeEvent() {
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("tournament_events")
      .update({ status: "completed" })
      .eq("id", event.id);
    if (err) { setError(err.message); return; }
    startTransition(() => router.refresh());
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const unregistered = members.filter((m) => !registeredIds.has(m.id));
  const rounds = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b);

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Participants ── */}
      <section>
        <h2 className="mb-3 font-semibold text-white">
          Participants ({registrations.length})
        </h2>

        {/* Registered list */}
        {registrations.length > 0 && (
          <div className="mb-4 space-y-2">
            {registrations.map((reg) => {
              const m = memberMap[reg.member_id];
              if (!m) return null;
              return (
                <div
                  key={reg.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white">{memberLabel(m)}</span>
                    {m.is_guest && (
                      <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                        Guest
                      </span>
                    )}
                    <span className="text-xs text-white/40 capitalize">{m.gender}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDoubles && canRegister && (
                      <select
                        className="rounded bg-white/10 px-2 py-1 text-xs text-white"
                        value={reg.partner_id ?? ""}
                        onChange={(e) => assignPartner(reg.id, e.target.value)}
                      >
                        <option value="">No partner</option>
                        {registrations
                          .filter((r) => {
                            if (r.member_id === reg.member_id) return false;
                            // Allow if unpartnered OR already this player's partner
                            return !r.partner_id || r.partner_id === reg.member_id;
                          })
                          .map((r) => {
                            const pm = memberMap[r.member_id];
                            return pm ? (
                              <option key={pm.id} value={pm.id}>
                                {memberLabel(pm)}
                              </option>
                            ) : null;
                          })}
                      </select>
                    )}
                    {isDoubles && !canRegister && reg.partner_id && (
                      <span className="text-xs text-white/50">
                        + {memberLabel(memberMap[reg.partner_id] ?? { full_name: "?", nickname: null } as Member)}
                      </span>
                    )}
                    {canRegister && (
                      <button
                        onClick={() => removeParticipant(reg.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add participants */}
        {canRegister && unregistered.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-white/40">Add participants</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {unregistered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addParticipant(m.id)}
                  disabled={addingId === m.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-left transition hover:border-brand-lime/30 hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="text-sm text-white">{memberLabel(m)}</span>
                  <span className="text-xs text-brand-lime">
                    {addingId === m.id ? "Adding…" : "+ Add"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!canRegister && registrations.length === 0 && (
          <p className="text-sm text-white/40">
            No participants yet. Tournament must be in &quot;Registration&quot; status to add participants.
          </p>
        )}
      </section>

      {/* ── Generate Matches ── */}
      {canGenerate && matches.length === 0 && (
        <section>
          <Button onClick={generateMatches} disabled={isPending}>
            Generate Round-Robin Matches
          </Button>
          <p className="mt-2 text-xs text-white/40">
            {registrations.length} participant{registrations.length !== 1 ? "s" : ""} ·{" "}
            {event.num_pools} pool{event.num_pools > 1 ? "s" : ""} ·{" "}
            {event.num_courts} court{event.num_courts > 1 ? "s" : ""}
          </p>
        </section>
      )}

      {/* ── Matches ── */}
      {matches.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Matches</h2>
            {canScore && (
              <Button size="sm" variant="outline" onClick={completeEvent}>
                Complete Event
              </Button>
            )}
          </div>

          {rounds.map((round) => {
            const roundMatches = matches.filter((m) => m.round_number === round);
            const pools = [...new Set(roundMatches.map((m) => m.pool_number))];

            return (
              <div key={round} className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-lime">
                  Round {round}
                </p>
                {pools.map((pool) => (
                  <div key={pool ?? "main"}>
                    {event.num_pools > 1 && pool && (
                      <p className="mb-1 text-xs text-white/40">Pool {pool}</p>
                    )}
                    <div className="space-y-2">
                      {roundMatches
                        .filter((m) => m.pool_number === pool)
                        .map((match) => {
                          const t1p1 = memberMap[match.team1_player1];
                          const t1p2 = match.team1_player2 ? memberMap[match.team1_player2] : null;
                          const t2p1 = memberMap[match.team2_player1];
                          const t2p2 = match.team2_player2 ? memberMap[match.team2_player2] : null;

                          const t1Label = t1p2
                            ? `${t1p1?.nickname ?? t1p1?.full_name} / ${t1p2?.nickname ?? t1p2?.full_name}`
                            : (t1p1?.nickname ?? t1p1?.full_name ?? "?");
                          const t2Label = t2p2
                            ? `${t2p1?.nickname ?? t2p1?.full_name} / ${t2p2?.nickname ?? t2p2?.full_name}`
                            : (t2p1?.nickname ?? t2p1?.full_name ?? "?");

                          const scored = match.team1_score !== null;
                          const sc = scores[match.id] ?? { t1: "", t2: "" };

                          return (
                            <div
                              key={match.id}
                              className="rounded-xl border border-white/10 bg-white/5 p-4"
                            >
                              <div className="mb-2 text-xs text-white/40">
                                Court {match.court_number}
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`flex-1 text-sm font-medium ${
                                    match.winner_team === 1 ? "text-brand-lime" : "text-white"
                                  }`}
                                >
                                  {t1Label}
                                </span>
                                {scored ? (
                                  <span className="text-sm font-bold text-white">
                                    {match.team1_score} – {match.team2_score}
                                  </span>
                                ) : canScore ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={sc.t1}
                                      onChange={(e) =>
                                        setScores((prev) => ({
                                          ...prev,
                                          [match.id]: { ...sc, t1: e.target.value },
                                        }))
                                      }
                                      className="w-12 rounded bg-white/10 px-2 py-1 text-center text-sm text-white"
                                    />
                                    <span className="text-white/40">–</span>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={sc.t2}
                                      onChange={(e) =>
                                        setScores((prev) => ({
                                          ...prev,
                                          [match.id]: { ...sc, t2: e.target.value },
                                        }))
                                      }
                                      className="w-12 rounded bg-white/10 px-2 py-1 text-center text-sm text-white"
                                    />
                                    <button
                                      onClick={() => saveScore(match.id)}
                                      className="ml-1 rounded bg-brand-lime px-2 py-1 text-xs font-semibold text-brand-dark"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-white/30">vs</span>
                                )}
                                <span
                                  className={`flex-1 text-right text-sm font-medium ${
                                    match.winner_team === 2 ? "text-brand-lime" : "text-white"
                                  }`}
                                >
                                  {t2Label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

// ── Round-robin scheduler ──────────────────────────────────────────────────

function roundRobin<T>(teams: T[]): [T, T][][] {
  const list = [...teams];
  if (list.length % 2 !== 0) list.push(null as unknown as T); // bye
  const n = list.length;
  const rounds: [T, T][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const round: [T, T][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== null && b !== null) round.push([a, b]);
    }
    rounds.push(round);
    // rotate all except first element
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}
