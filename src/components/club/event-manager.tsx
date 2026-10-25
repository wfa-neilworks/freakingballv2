"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { PlayType, TournamentStatus } from "@/types/database";
import { isValidPickleballScore } from "@/components/club/score-picker";

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

type Tab = "queue" | "standings" | "participants" | "medal";

type TeamSlot = { p1: string; p2: string | null } | null; // null = TBA

function memberLabel(m: Member | undefined, short = false) {
  if (!m) return "?";
  if (short) return m.nickname ?? m.full_name.split(" ")[0];
  return m.nickname ? `${m.full_name} (${m.nickname})` : m.full_name;
}

function teamLabel(p1: string, p2: string | null, map: Record<string, Member>, short = false) {
  return p2
    ? `${memberLabel(map[p1], short)} / ${memberLabel(map[p2], short)}`
    : memberLabel(map[p1], short);
}

// ── Standings ──────────────────────────────────────────────────────────────

type StandingRow = {
  key: string;
  p1: string;
  p2: string | null;
  pool: number | null;
  wins: number;
  losses: number;
  pf: number;
  pa: number;
};

function buildStandings(matches: Match[]): Map<number | null, StandingRow[]> {
  const map = new Map<string, StandingRow>();
  for (const m of matches) {
    if (m.is_playoff || m.team1_score === null || m.team2_score === null) continue;
    const k1 = m.team1_player2 ? `${m.team1_player1}|${m.team1_player2}` : m.team1_player1;
    const k2 = m.team2_player2 ? `${m.team2_player1}|${m.team2_player2}` : m.team2_player1;
    if (!map.has(k1)) map.set(k1, { key: k1, p1: m.team1_player1, p2: m.team1_player2, pool: m.pool_number, wins: 0, losses: 0, pf: 0, pa: 0 });
    if (!map.has(k2)) map.set(k2, { key: k2, p1: m.team2_player1, p2: m.team2_player2, pool: m.pool_number, wins: 0, losses: 0, pf: 0, pa: 0 });
    const r1 = map.get(k1)!; const r2 = map.get(k2)!;
    r1.pf += m.team1_score; r1.pa += m.team2_score;
    r2.pf += m.team2_score; r2.pa += m.team1_score;
    if (m.winner_team === 1) { r1.wins++; r2.losses++; }
    else if (m.winner_team === 2) { r2.wins++; r1.losses++; }
  }
  const byPool = new Map<number | null, StandingRow[]>();
  for (const row of map.values()) {
    if (!byPool.has(row.pool)) byPool.set(row.pool, []);
    byPool.get(row.pool)!.push(row);
  }
  for (const rows of byPool.values()) {
    rows.sort((a, b) => b.wins - a.wins || (b.pf - b.pa) - (a.pf - a.pa));
  }
  return byPool;
}

// ── Seed medal slots from standings ───────────────────────────────────────

type SeedResult = {
  sf1: [TeamSlot, TeamSlot];
  sf2: [TeamSlot, TeamSlot];
  sf1Label: string;
  sf2Label: string;
};

function seedFromStandings(
  standings: Map<number | null, StandingRow[]>,
  numPools: number,
  complete: boolean
): SeedResult {
  const tba: TeamSlot = null;

  function slot(rows: StandingRow[], idx: number): TeamSlot {
    if (!complete) return tba;
    const r = rows[idx];
    return r ? { p1: r.p1, p2: r.p2 } : tba;
  }

  if (numPools === 1) {
    const rows = standings.get(null) ?? standings.get(1) ?? [];
    return {
      sf1: [slot(rows, 0), slot(rows, 3)],
      sf2: [slot(rows, 1), slot(rows, 2)],
      sf1Label: "1st vs 4th",
      sf2Label: "2nd vs 3rd",
    };
  }
  if (numPools === 2) {
    const p1 = standings.get(1) ?? [];
    const p2 = standings.get(2) ?? [];
    return {
      sf1: [slot(p1, 0), slot(p2, 1)],
      sf2: [slot(p2, 0), slot(p1, 1)],
      sf1Label: "Pool 1 (1st) vs Pool 2 (2nd)",
      sf2Label: "Pool 2 (1st) vs Pool 1 (2nd)",
    };
  }
  // 4 pools
  const tops = [1, 2, 3, 4].map((p) => slot(standings.get(p) ?? [], 0));
  return {
    sf1: [tops[0], tops[1]],
    sf2: [tops[2], tops[3]],
    sf1Label: "Pool 1 (1st) vs Pool 2 (1st)",
    sf2Label: "Pool 3 (1st) vs Pool 4 (1st)",
  };
}

// ── Round-robin ────────────────────────────────────────────────────────────

function roundRobin<T>(teams: T[]): [T, T][][] {
  const list = [...teams];
  if (list.length % 2 !== 0) list.push(null as unknown as T);
  const n = list.length;
  const rounds: [T, T][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [T, T][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]; const b = list[n - 1 - i];
      if (a !== null && b !== null) round.push([a, b]);
    }
    rounds.push(round);
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

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
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("queue");
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [error, setError] = useState<string | null>(null);
  const [inlineScores, setInlineScores] = useState<Record<string, { t1: number; t2: number }>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [generatingMedal, setGeneratingMedal] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");

  const isDoubles = event.play_type !== "singles";
  const registeredIds = new Set(registrations.map((r) => r.member_id));
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  // Determine gender filter: singles + doubles (mens/womens) restrict by gender
  const genderFilter: string | null =
    (event.play_type === "singles" || event.play_type === "doubles") && event.doubles_category
      ? event.doubles_category === "mens" ? "male" : "female"
      : null;
  const eligibleMembers = genderFilter
    ? members.filter((m) => m.gender === genderFilter)
    : members;

  const canRegister = tournamentStatus === "registration" && event.status === "scheduled";
  const canGenerate = tournamentStatus === "active" && event.status === "scheduled" && registrations.length >= 2;
  const canScore = event.status === "active";

  const poolMatches = matches.filter((m) => !m.is_playoff);
  const medalMatches = matches.filter((m) => m.is_playoff);
  const semis = medalMatches.filter((m) => m.round_number <= 4);
  const finals = medalMatches.filter((m) => m.round_number === 10);
  const bronze = medalMatches.filter((m) => m.round_number === 11);

  const poolPlayComplete =
    poolMatches.length > 0 &&
    poolMatches.every((m) => m.team1_score !== null && m.team2_score !== null);

  const standings = buildStandings(poolMatches);
  const seed = seedFromStandings(standings, event.num_pools, poolPlayComplete);

  // Auto-generate medal matches when pool play completes
  const autoGenerateMedal = useCallback(async () => {
    if (!poolPlayComplete || semis.length > 0 || generatingMedal || !canScore) return;
    setGeneratingMedal(true);
    const supabase = createClient();

    const makeInsert = (a: TeamSlot, b: TeamSlot, roundNum: number) => {
      if (!a || !b) return null;
      return {
        event_id: event.id,
        pool_number: null,
        court_number: 0,
        round_number: roundNum,
        team1_player1: a.p1,
        team1_player2: a.p2 ?? null,
        team2_player1: b.p1,
        team2_player2: b.p2 ?? null,
        is_playoff: true,
      };
    };

    type InsertRow = {
      event_id: string; pool_number: null; court_number: number; round_number: number;
      team1_player1: string; team1_player2: string | null;
      team2_player1: string; team2_player2: string | null; is_playoff: boolean;
    };
    const inserts = ([
      makeInsert(seed.sf1[0], seed.sf1[1], 1),
      makeInsert(seed.sf2[0], seed.sf2[1], 2),
    ].filter(Boolean)) as InsertRow[];

    if (inserts.length === 0) { setGeneratingMedal(false); return; }

    const { data, error: err } = await supabase.from("tournament_matches").insert(inserts).select();
    if (!err && data) {
      // Auto-assign free courts to new semi-final matches
      const currentMatches = [...matches, ...data];
      const freeCourts = Array.from({ length: event.num_courts }, (_, i) => i + 1)
        .filter((c) => !currentMatches.some((m) => m.court_number === c && m.winner_team === null && !data.find((d) => d.id === m.id)));
      const assigned = data.map((m, i) => {
        const court = freeCourts[i] ?? 0;
        return { ...m, court_number: court };
      });
      await Promise.all(assigned.filter((m) => m.court_number > 0).map((m) =>
        supabase.from("tournament_matches").update({ court_number: m.court_number }).eq("id", m.id)
      ));
      setMatches((prev) => [...prev, ...assigned]);
    }
    setGeneratingMedal(false);
  }, [poolPlayComplete, semis.length, generatingMedal, canScore, event.id, seed]);

  useEffect(() => {
    autoGenerateMedal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolPlayComplete]);

  // Auto-generate Final + Bronze when both semis scored
  const allSemisScored = semis.length === 2 && semis.every((m) => m.winner_team !== null);
  useEffect(() => {
    if (!allSemisScored || finals.length > 0) return;
    (async () => {
      const [sf1, sf2] = semis;
      const get = (m: Match, side: 1 | 2) => ({
        p1: side === 1 ? m.team1_player1 : m.team2_player1,
        p2: side === 1 ? m.team1_player2 : m.team2_player2,
      });
      const sf1w = get(sf1, sf1.winner_team as 1 | 2);
      const sf1l = get(sf1, sf1.winner_team === 1 ? 2 : 1);
      const sf2w = get(sf2, sf2.winner_team as 1 | 2);
      const sf2l = get(sf2, sf2.winner_team === 1 ? 2 : 1);

      const supabase = createClient();
      const { data, error: err } = await supabase.from("tournament_matches").insert([
        { event_id: event.id, pool_number: null, court_number: 0, round_number: 10, team1_player1: sf1w.p1, team1_player2: sf1w.p2, team2_player1: sf2w.p1, team2_player2: sf2w.p2, is_playoff: true },
        { event_id: event.id, pool_number: null, court_number: 0, round_number: 11, team1_player1: sf1l.p1, team1_player2: sf1l.p2, team2_player1: sf2l.p1, team2_player2: sf2l.p2, is_playoff: true },
      ]).select();
      if (!err && data) {
        // Auto-assign free courts to final + bronze
        const allMatches = [...matches, ...data];
        const freeCourts = Array.from({ length: event.num_courts }, (_, i) => i + 1)
          .filter((c) => !allMatches.some((m) => m.court_number === c && m.winner_team === null && !data.find((d) => d.id === m.id)));
        const assigned = data.map((m, i) => ({ ...m, court_number: freeCourts[i] ?? 0 }));
        await Promise.all(assigned.filter((m) => m.court_number > 0).map((m) =>
          supabase.from("tournament_matches").update({ court_number: m.court_number }).eq("id", m.id)
        ));
        setMatches((prev) => [...prev, ...assigned]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSemisScored, finals.length]);

  // ── Registration ──────────────────────────────────────────────────────────

  async function addParticipant(memberId: string) {
    setError(null); setAddingId(memberId);
    const temp: Registration = { id: `temp-${memberId}`, member_id: memberId, partner_id: null, pool_number: null };
    setRegistrations((prev) => [...prev, temp]);
    const supabase = createClient();
    const { data, error: err } = await supabase.from("tournament_registrations").insert({ event_id: event.id, member_id: memberId }).select().single();
    if (err) { setRegistrations((prev) => prev.filter((r) => r.id !== temp.id)); setError(err.message); }
    else setRegistrations((prev) => prev.map((r) => r.id === temp.id ? data : r));
    setAddingId(null);
  }

  async function removeParticipant(regId: string) {
    setError(null);
    setRegistrations((prev) => prev.filter((r) => r.id !== regId));
    const supabase = createClient();
    const { error: err } = await supabase.from("tournament_registrations").delete().eq("id", regId);
    if (err) { setError(err.message); startTransition(() => router.refresh()); }
  }

  async function assignPartner(regId: string, partnerId: string) {
    setError(null);
    const supabase = createClient();
    const reg = registrations.find((r) => r.id === regId);
    if (!reg) return;
    if (reg.partner_id && reg.partner_id !== partnerId) {
      const old = registrations.find((r) => r.member_id === reg.partner_id);
      if (old) await supabase.from("tournament_registrations").update({ partner_id: null }).eq("id", old.id);
    }
    const newPid = partnerId || null;
    await supabase.from("tournament_registrations").update({ partner_id: newPid }).eq("id", regId);
    if (newPid) {
      const pr = registrations.find((r) => r.member_id === newPid);
      if (pr) {
        if (pr.partner_id && pr.partner_id !== reg.member_id) {
          const displaced = registrations.find((r) => r.member_id === pr.partner_id);
          if (displaced) await supabase.from("tournament_registrations").update({ partner_id: null }).eq("id", displaced.id);
        }
        await supabase.from("tournament_registrations").update({ partner_id: reg.member_id }).eq("id", pr.id);
      }
    }
    setRegistrations((prev) => prev.map((r) => {
      if (r.id === regId) return { ...r, partner_id: newPid };
      if (newPid && r.member_id === newPid) return { ...r, partner_id: reg.member_id };
      if (r.member_id === reg.partner_id && reg.partner_id !== newPid) return { ...r, partner_id: null };
      const pr = prev.find((p) => p.member_id === newPid);
      if (pr && r.member_id === pr.partner_id && r.member_id !== reg.member_id) return { ...r, partner_id: null };
      return r;
    }));
  }

  // ── Generate pool matches ─────────────────────────────────────────────────

  async function generateMatches() {
    setError(null);
    const supabase = createClient();
    const { error: statusErr } = await supabase.from("tournament_events").update({ status: "active" }).eq("id", event.id);
    if (statusErr) { setError(statusErr.message); return; }

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
    if (teams.length < 2) { setError("Need at least 2 teams."); return; }

    const inserts: object[] = [];
    const poolSize = Math.ceil(teams.length / event.num_pools);
    for (let pool = 1; pool <= event.num_pools; pool++) {
      const poolTeams = teams.slice((pool - 1) * poolSize, pool * poolSize);
      roundRobin(poolTeams).forEach((round, ri) => {
        round.forEach((match) => {
          inserts.push({
            event_id: event.id,
            pool_number: event.num_pools > 1 ? pool : null,
            court_number: 0,
            round_number: ri + 1,
            team1_player1: match[0].p1, team1_player2: match[0].p2 ?? null,
            team2_player1: match[1].p1, team2_player2: match[1].p2 ?? null,
            is_playoff: false,
          });
        });
      });
    }

    const { data: newMatches, error: matchErr } = await supabase.from("tournament_matches").insert(inserts).select();
    if (matchErr) { setError(matchErr.message); return; }

    // Auto-assign courts 1..N to first N matches in insertion order (array order = queue order)
    const ordered = (newMatches ?? []).slice(); // DB returns in insertion order
    const autoAssigns = ordered.slice(0, event.num_courts);
    await Promise.all(autoAssigns.map((m, i) =>
      supabase.from("tournament_matches").update({ court_number: i + 1 }).eq("id", m.id)
    ));
    const withCourts = (newMatches ?? []).map((m) => {
      const idx = autoAssigns.findIndex((a) => a.id === m.id);
      return idx >= 0 ? { ...m, court_number: idx + 1 } : m;
    });
    setMatches(withCourts);
    startTransition(() => router.refresh());
  }

  // ── Score ─────────────────────────────────────────────────────────────────

  async function saveScore(matchId: string, t1: number, t2: number) {
    setError(null);
    const res = await fetch("/api/save-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, team1Score: t1, team2Score: t2 }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to save score"); return; }
    const { winner } = await res.json();

    // Find freed court, then auto-assign to next unassigned unscored match
    const freingMatch = matches.find((m) => m.id === matchId);
    const freedCourt = freingMatch?.court_number ?? 0;

    let updatedMatches = matches.map((m) =>
      m.id === matchId ? { ...m, team1_score: t1, team2_score: t2, winner_team: winner } : m
    );

    if (freedCourt > 0) {
      // Next match: first unassigned unscored match in original array order (= insertion/queue order)
      const next = updatedMatches
        .find((m) => m.court_number === 0 && m.winner_team === null && m.team1_score === null);

      if (next) {
        const supabase = createClient();
        await supabase.from("tournament_matches").update({ court_number: freedCourt }).eq("id", next.id);
        updatedMatches = updatedMatches.map((m) => m.id === next.id ? { ...m, court_number: freedCourt } : m);
      }
    }

    setMatches(updatedMatches);
  }

  async function completeEvent() {
    const supabase = createClient();
    const { error: err } = await supabase.from("tournament_events").update({ status: "completed" }).eq("id", event.id);
    if (err) { setError(err.message); return; }
    startTransition(() => router.refresh());
  }

  // Auto-complete: once both Final and Bronze have a winner, mark event completed
  const allMedalMatchesDone =
    event.status === "active" &&
    finals.length > 0 &&
    bronze.length > 0 &&
    finals.every((m) => m.winner_team !== null) &&
    bronze.every((m) => m.winner_team !== null);

  useEffect(() => {
    if (allMedalMatchesDone) {
      completeEvent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMedalMatchesDone]);

  // ── Match card (queue style) ──────────────────────────────────────────────

  function QueueCard({ match }: { match: Match }) {
    const t1 = teamLabel(match.team1_player1, match.team1_player2, memberMap, true);
    const t2 = teamLabel(match.team2_player1, match.team2_player2, memberMap, true);
    const scored = match.team1_score !== null;
    const hasCourt = match.court_number > 0;
    const sc = inlineScores[match.id] ?? { t1: 0, t2: 0 };
    const valid = isValidPickleballScore(sc.t1, sc.t2);

    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {/* Court + time */}
        <div className="mb-3 flex items-center gap-2">
          {hasCourt
            ? <span className="text-xs text-white/40">Court {match.court_number}</span>
            : <span className="text-xs text-white/25 italic">Waiting for court…</span>
          }
          {match.played_at && (
            <span className="text-xs text-white/30">
              {new Date(match.played_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {scored ? (
          /* Scored: show result inline */
          <div className="flex items-center gap-2">
            <span className={`flex-1 text-sm font-medium ${match.winner_team === 1 ? "text-brand-lime" : "text-white"}`}>{t1}</span>
            <span className="text-sm font-bold tabular-nums text-white">{match.team1_score}</span>
            <span className="text-white/30">–</span>
            <span className="text-sm font-bold tabular-nums text-white">{match.team2_score}</span>
            <span className={`flex-1 text-right text-sm font-medium ${match.winner_team === 2 ? "text-brand-lime" : "text-white"}`}>{t2}</span>
          </div>
        ) : canScore && hasCourt ? (
          /* Inline score inputs */
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-medium text-white">{t1}</span>
            <input
              type="number"
              min={0}
              max={50}
              value={sc.t1}
              onChange={(e) => setInlineScores((p) => ({ ...p, [match.id]: { ...sc, t1: Math.max(0, Math.min(50, Number(e.target.value) || 0)) } }))}
              className="w-12 rounded-lg border border-white/20 bg-[#1a2a1f] py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
            />
            <button
              onClick={() => valid && saveScore(match.id, sc.t1, sc.t2)}
              disabled={!valid}
              className="rounded-lg bg-brand-lime px-2.5 py-1.5 text-xs font-bold text-brand-dark transition disabled:opacity-30"
            >
              ✓
            </button>
            <input
              type="number"
              min={0}
              max={50}
              value={sc.t2}
              onChange={(e) => setInlineScores((p) => ({ ...p, [match.id]: { ...sc, t2: Math.max(0, Math.min(50, Number(e.target.value) || 0)) } }))}
              className="w-12 rounded-lg border border-white/20 bg-[#1a2a1f] py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
            />
            <span className="flex-1 text-right text-sm font-medium text-white">{t2}</span>
          </div>
        ) : (
          /* Waiting */
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-medium text-white">{t1}</span>
            <span className="text-xs text-white/25 italic">vs</span>
            <span className="flex-1 text-right text-sm font-medium text-white">{t2}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Bracket team slot ─────────────────────────────────────────────────────

  function BracketTeam({
    slot,
    seed: seedNum,
    score,
    isWinner,
  }: {
    slot: TeamSlot;
    seed?: number;
    score?: number | null;
    isWinner?: boolean;
  }) {
    const isTba = slot === null;
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${isWinner ? "bg-brand-lime/20" : ""}`}>
        {seedNum !== undefined && (
          <span className="w-4 text-xs text-white/30">{seedNum}</span>
        )}
        <span className={`flex-1 text-sm font-medium ${isTba ? "italic text-white/30" : isWinner ? "text-brand-lime" : "text-white"}`}>
          {isTba ? "TBA" : slot.p2
            ? `${memberLabel(memberMap[slot.p1], true)} / ${memberLabel(memberMap[slot.p2], true)}`
            : memberLabel(memberMap[slot.p1], true)}
        </span>
        {score !== undefined && score !== null && (
          <span className={`text-sm font-bold tabular-nums ${isWinner ? "text-brand-lime" : "text-white/60"}`}>
            {score}
          </span>
        )}
      </div>
    );
  }

  // ── Bracket match card ────────────────────────────────────────────────────

  function BracketCard({
    label,
    labelColor = "lime",
    topSlot,
    bottomSlot,
    topSeed,
    bottomSeed,
    match,
  }: {
    label: string;
    labelColor?: "lime" | "yellow" | "gray";
    topSlot: TeamSlot;
    bottomSlot: TeamSlot;
    topSeed?: number;
    bottomSeed?: number;
    match?: Match;
  }) {
    const labelClasses = {
      lime: "bg-brand-lime text-brand-dark",
      yellow: "bg-yellow-400 text-black",
      gray: "bg-white/20 text-white",
    }[labelColor];

    const scored = match?.team1_score !== null && match?.team1_score !== undefined;
    const hasCourt = (match?.court_number ?? 0) > 0;

    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className={`px-3 py-1 text-xs font-bold ${labelClasses}`}>{label}</div>
        <div className="divide-y divide-white/10">
          <BracketTeam
            slot={topSlot}
            seed={topSeed}
            score={scored ? match!.team1_score : undefined}
            isWinner={match?.winner_team === 1}
          />
          <BracketTeam
            slot={bottomSlot}
            seed={bottomSeed}
            score={scored ? match!.team2_score : undefined}
            isWinner={match?.winner_team === 2}
          />
        </div>
        {match && !scored && canScore && (() => {
          const bsc = inlineScores[match.id] ?? { t1: 0, t2: 0 };
          const bValid = isValidPickleballScore(bsc.t1, bsc.t2);
          return (
            <div className="border-t border-white/10 px-3 py-2">
              <div className="flex items-center gap-2">
                {hasCourt
                  ? <span className="text-xs text-white/40">Court {match.court_number}</span>
                  : <span className="text-xs text-white/25 italic">Waiting for court…</span>
                }
                {hasCourt && (
                  <div className="ml-auto flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={bsc.t1}
                      onChange={(e) => setInlineScores((p) => ({ ...p, [match.id]: { ...bsc, t1: Math.max(0, Math.min(50, Number(e.target.value) || 0)) } }))}
                      className="w-12 rounded-lg border border-white/20 bg-[#1a2a1f] py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                    />
                    <button
                      onClick={() => bValid && saveScore(match.id, bsc.t1, bsc.t2)}
                      disabled={!bValid}
                      className="rounded-lg bg-brand-lime px-2.5 py-1.5 text-xs font-bold text-brand-dark transition disabled:opacity-30"
                    >
                      ✓
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={bsc.t2}
                      onChange={(e) => setInlineScores((p) => ({ ...p, [match.id]: { ...bsc, t2: Math.max(0, Math.min(50, Number(e.target.value) || 0)) } }))}
                      className="w-12 rounded-lg border border-white/20 bg-[#1a2a1f] py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {match && scored && match.court_number > 0 && (
          <div className="border-t border-white/10 px-3 py-1 text-xs text-white/30">
            Court {match.court_number}
            {match.played_at && <> · {new Date(match.played_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</>}
          </div>
        )}
      </div>
    );
  }

  // ── Medal round winner/runner-up slots ────────────────────────────────────

  function getMatchSlot(m: Match, side: 1 | 2): TeamSlot {
    return side === 1
      ? { p1: m.team1_player1, p2: m.team1_player2 }
      : { p1: m.team2_player1, p2: m.team2_player2 };
  }

  function winnerOf(m: Match | undefined): TeamSlot {
    if (!m || m.winner_team === null) return null;
    return getMatchSlot(m, m.winner_team as 1 | 2);
  }

  function loserOf(m: Match | undefined): TeamSlot {
    if (!m || m.winner_team === null) return null;
    return getMatchSlot(m, m.winner_team === 1 ? 2 : 1);
  }

  const sf1Match = semis.find((m) => m.round_number === 1);
  const sf2Match = semis.find((m) => m.round_number === 2);
  const finalMatch = finals[0];
  const bronzeMatch = bronze[0];

  const tabs: { key: Tab; label: string }[] = [
    { key: "queue", label: "Queue" },
    { key: "standings", label: "Standings" },
    { key: "participants", label: "Participants" },
    { key: "medal", label: "Medal Round" },
  ];

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Tab bar */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-xl bg-white/5 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                tab === t.key ? "bg-brand-lime text-brand-dark" : "text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── QUEUE ──────────────────────────────────────────────────────────── */}
      {tab === "queue" && (
        <div className="space-y-6">
          {canGenerate && matches.length === 0 && (
            <div>
              <Button onClick={generateMatches}>Generate Pool Matches</Button>
              <p className="mt-2 text-xs text-white/40">
                {registrations.length} participant{registrations.length !== 1 ? "s" : ""} · {event.num_pools} pool{event.num_pools > 1 ? "s" : ""}
              </p>
            </div>
          )}
          {poolMatches.length === 0 && !canGenerate && (
            <p className="text-sm text-white/40">
              {event.status === "scheduled" ? "Start the tournament to generate matches." : "No pool matches yet."}
            </p>
          )}
          {[...new Set(poolMatches.map((m) => m.round_number))].sort((a, b) => a - b).map((round) => {
            const rMatches = poolMatches.filter((m) => m.round_number === round);
            return (
              <div key={round}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">Round {round}</p>
                <div className="space-y-2">{rMatches.map((m) => <QueueCard key={m.id} match={m} />)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── STANDINGS ──────────────────────────────────────────────────────── */}
      {tab === "standings" && (() => {
        // Derive medal winners from final/bronze results
        const mkKey = (m: Match, side: 1 | 2) =>
          side === 1
            ? (m.team1_player2 ? `${m.team1_player1}|${m.team1_player2}` : m.team1_player1)
            : (m.team2_player2 ? `${m.team2_player1}|${m.team2_player2}` : m.team2_player1);

        const medals: Record<string, "GLD" | "SLV" | "BRZ"> = {};
        if (finalMatch?.winner_team) {
          medals[mkKey(finalMatch, finalMatch.winner_team as 1 | 2)] = "GLD";
          medals[mkKey(finalMatch, finalMatch.winner_team === 1 ? 2 : 1)] = "SLV";
        }
        if (bronzeMatch?.winner_team) {
          medals[mkKey(bronzeMatch, bronzeMatch.winner_team as 1 | 2)] = "BRZ";
        }

        const eventDone = Object.keys(medals).length >= 2;

        const badgeStyle = {
          GLD: "bg-yellow-400 text-black",
          SLV: "bg-slate-300 text-black",
          BRZ: "bg-amber-700 text-white",
        };

        const roundsPlayed = (row: StandingRow) =>
          poolMatches.filter(
            (m) => m.team1_score !== null && (m.team1_player1 === row.p1 || m.team2_player1 === row.p1)
          ).length;

        // Final rank: GLD=1, SLV=2, BRZ=3, rest sorted by pool standing
        const medalRank: Record<string, number> = { GLD: 1, SLV: 2, BRZ: 3 };

        return (
          <div className="space-y-6">
            {standings.size === 0 && <p className="text-sm text-white/40">No scored matches yet.</p>}
            {[...standings.entries()].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0)).map(([pool, rows]) => {
              // Assign a final rank per row within this pool view
              let nonMedalRank = 4;
              const rowsWithRank = rows.map((row) => {
                const medal = medals[row.key];
                return { ...row, medal, finalRank: medal ? medalRank[medal] : nonMedalRank++ };
              });

              return (
                <div key={pool ?? "main"}>
                  {event.num_pools > 1 && (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-lime">Pool {pool}</p>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full min-w-[360px] text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs text-white/40">
                          <th className="w-10 px-3 py-2"></th>
                          <th className="px-3 py-2">Team / Player</th>
                          <th className="px-3 py-2 text-center">W</th>
                          <th className="px-3 py-2 text-center">L</th>
                          <th className="px-3 py-2 text-center">+/-</th>
                          {eventDone && <th className="px-3 py-2 text-center">Rank</th>}
                          <th className="px-3 py-2 text-center">Rds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowsWithRank.map((row, i) => {
                          const rounds = roundsPlayed(row);
                          return (
                            <tr key={row.key} className={`border-b border-white/5 last:border-0 ${row.medal ? "bg-white/[0.03]" : ""}`}>
                              <td className="px-3 py-2.5">
                                {row.medal ? (
                                  <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-black ${badgeStyle[row.medal]}`}>
                                    {row.medal}
                                  </span>
                                ) : (
                                  <span className="text-sm text-white/30">{i + 1}</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {isDoubles && row.p2 ? (
                                  <div className="space-y-0.5">
                                    <div className="font-medium text-white">{memberLabel(memberMap[row.p1])}</div>
                                    <div className="text-xs text-white/60">{memberLabel(memberMap[row.p2])}</div>
                                  </div>
                                ) : (
                                  <span className="font-medium text-white">{memberLabel(memberMap[row.p1])}</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold text-brand-lime">{row.wins}</td>
                              <td className="px-3 py-2.5 text-center text-white/60">{row.losses}</td>
                              <td className="px-3 py-2.5 text-center text-white/60">
                                {row.pf - row.pa > 0 ? "+" : ""}{row.pf - row.pa}
                              </td>
                              {eventDone && (
                                <td className="px-3 py-2.5 text-center font-semibold text-white/80">{row.finalRank}</td>
                              )}
                              <td className="px-3 py-2.5 text-center text-white/40">{rounds}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── PARTICIPANTS ────────────────────────────────────────────────────── */}
      {tab === "participants" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-white">Participants ({registrations.length})</h2>
          {registrations.length > 0 && (
            <div className="space-y-2">
              {registrations.map((reg) => {
                const m = memberMap[reg.member_id];
                if (!m) return null;
                return (
                  <div key={reg.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white">{memberLabel(m)}</span>
                      {m.is_guest && <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Guest</span>}
                      <span className="text-xs text-white/40 capitalize">{m.gender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDoubles && canRegister && (
                        <select
                          className="rounded border border-white/10 bg-[#1a2a1f] px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                          value={reg.partner_id ?? ""}
                          onChange={(e) => assignPartner(reg.id, e.target.value)}
                        >
                          <option value="">No partner</option>
                          {registrations
                            .filter((r) => r.member_id !== reg.member_id && (!r.partner_id || r.partner_id === reg.member_id))
                            .map((r) => {
                              const pm = memberMap[r.member_id];
                              return pm ? <option key={pm.id} value={pm.id}>{memberLabel(pm)}</option> : null;
                            })}
                        </select>
                      )}
                      {isDoubles && !canRegister && reg.partner_id && (
                        <span className="text-xs text-white/50">+ {memberLabel(memberMap[reg.partner_id])}</span>
                      )}
                      {canRegister && (
                        <button onClick={() => removeParticipant(reg.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {canRegister && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs text-white/40">Add participants</p>
                {genderFilter && (
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/40 capitalize">
                    {genderFilter} only
                  </span>
                )}
              </div>
              {/* Search */}
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="search"
                  placeholder="Search members…"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-brand-lime"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {eligibleMembers.filter((m) => !registeredIds.has(m.id) && (
                  participantSearch === "" ||
                  m.full_name.toLowerCase().includes(participantSearch.toLowerCase()) ||
                  (m.nickname ?? "").toLowerCase().includes(participantSearch.toLowerCase())
                )).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => addParticipant(m.id)}
                    disabled={addingId === m.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-left transition hover:border-brand-lime/30 hover:bg-white/10 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{memberLabel(m)}</span>
                      {m.is_guest && <span className="text-xs text-yellow-400">Guest</span>}
                      <span className="text-xs text-white/40 capitalize">{m.gender}</span>
                    </div>
                    <span className="text-xs text-brand-lime">{addingId === m.id ? "Adding…" : "+ Add"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!canRegister && registrations.length === 0 && (
            <p className="text-sm text-white/40">No participants. Tournament must be in &ldquo;Registration&rdquo; status to add.</p>
          )}
        </div>
      )}

      {/* ── MEDAL ROUND ─────────────────────────────────────────────────────── */}
      {tab === "medal" && (
        <div>
          {!poolPlayComplete && poolMatches.length === 0 && (
            <p className="text-sm text-white/40">Generate pool matches first.</p>
          )}
          {!poolPlayComplete && poolMatches.length > 0 && (
            <p className="mb-4 text-sm text-white/40">
              Complete all pool matches to unlock the medal round.
            </p>
          )}

          {/* Bracket layout: semis left, finals right */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Semifinals */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Semi-Finals</p>

              <BracketCard
                label="SF 1"
                labelColor="lime"
                topSlot={sf1Match ? getMatchSlot(sf1Match, 1) : seed.sf1[0]}
                bottomSlot={sf1Match ? getMatchSlot(sf1Match, 2) : seed.sf1[1]}
                match={sf1Match}
              />

              <BracketCard
                label="SF 2"
                labelColor="lime"
                topSlot={sf2Match ? getMatchSlot(sf2Match, 1) : seed.sf2[0]}
                bottomSlot={sf2Match ? getMatchSlot(sf2Match, 2) : seed.sf2[1]}
                match={sf2Match}
              />
            </div>

            {/* Right: Final + Bronze */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Finals</p>

              <BracketCard
                label="GOLD MATCH"
                labelColor="yellow"
                topSlot={finalMatch ? getMatchSlot(finalMatch, 1) : winnerOf(sf1Match)}
                bottomSlot={finalMatch ? getMatchSlot(finalMatch, 2) : winnerOf(sf2Match)}
                match={finalMatch}
              />

              <BracketCard
                label="BRONZE MATCH"
                labelColor="gray"
                topSlot={bronzeMatch ? getMatchSlot(bronzeMatch, 1) : loserOf(sf1Match)}
                bottomSlot={bronzeMatch ? getMatchSlot(bronzeMatch, 2) : loserOf(sf2Match)}
                match={bronzeMatch}
              />
            </div>
          </div>

          {/* Seed info */}
          {!poolPlayComplete && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/40 space-y-1">
              <p className="font-medium text-white/60 mb-2">Seeding rules</p>
              <p>SF 1: {seed.sf1Label}</p>
              <p>SF 2: {seed.sf2Label}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
