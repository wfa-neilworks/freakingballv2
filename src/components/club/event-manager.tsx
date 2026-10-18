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

type Tab = "queue" | "standings" | "participants" | "medal";

function memberLabel(m: Member | undefined, short = false) {
  if (!m) return "?";
  if (short) return m.nickname ?? m.full_name.split(" ")[0];
  return m.nickname ? `${m.full_name} (${m.nickname})` : m.full_name;
}

function teamLabel(
  p1id: string,
  p2id: string | null,
  memberMap: Record<string, Member>,
  short = false
) {
  const p1 = memberLabel(memberMap[p1id], short);
  if (!p2id) return p1;
  return `${p1} / ${memberLabel(memberMap[p2id], short)}`;
}

// ── Standing calculation ──────────────────────────────────────────────────

type TeamKey = string; // "p1id" or "p1id|p2id"

function teamKey(p1: string, p2: string | null) {
  return p2 ? `${p1}|${p2}` : p1;
}

type StandingRow = {
  key: TeamKey;
  p1: string;
  p2: string | null;
  pool: number | null;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

function buildStandings(matches: Match[], isPlayoff = false): StandingRow[] {
  const map = new Map<TeamKey, StandingRow>();

  const poolMatches = matches.filter((m) => m.is_playoff === isPlayoff);

  for (const m of poolMatches) {
    if (m.team1_score === null || m.team2_score === null) continue;
    const k1 = teamKey(m.team1_player1, m.team1_player2);
    const k2 = teamKey(m.team2_player1, m.team2_player2);

    if (!map.has(k1))
      map.set(k1, { key: k1, p1: m.team1_player1, p2: m.team1_player2, pool: m.pool_number, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    if (!map.has(k2))
      map.set(k2, { key: k2, p1: m.team2_player1, p2: m.team2_player2, pool: m.pool_number, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });

    const r1 = map.get(k1)!;
    const r2 = map.get(k2)!;

    r1.pointsFor += m.team1_score;
    r1.pointsAgainst += m.team2_score;
    r2.pointsFor += m.team2_score;
    r2.pointsAgainst += m.team1_score;

    if (m.winner_team === 1) { r1.wins++; r2.losses++; }
    else if (m.winner_team === 2) { r2.wins++; r1.losses++; }
  }

  return [...map.values()].sort((a, b) =>
    b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)
  );
}

// ── Round-robin ───────────────────────────────────────────────────────────

function roundRobin<T>(teams: T[]): [T, T][][] {
  const list = [...teams];
  if (list.length % 2 !== 0) list.push(null as unknown as T);
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
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

// ── Medal round seeding ───────────────────────────────────────────────────

function seedMedalRound(
  poolStandings: Map<number | null, StandingRow[]>,
  numPools: number
): { semis: [StandingRow, StandingRow][]; label: string[] } | null {
  if (numPools === 1) {
    const pool = poolStandings.get(null) ?? poolStandings.get(1) ?? [];
    if (pool.length < 4) return null;
    // 1st vs 4th, 2nd vs 3rd
    return {
      semis: [[pool[0], pool[3]], [pool[1], pool[2]]],
      label: ["SF1: 1st vs 4th", "SF2: 2nd vs 3rd"],
    };
  }
  if (numPools === 2) {
    const p1 = poolStandings.get(1) ?? [];
    const p2 = poolStandings.get(2) ?? [];
    if (p1.length < 2 || p2.length < 2) return null;
    return {
      semis: [[p1[0], p2[1]], [p2[0], p1[1]]],
      label: ["SF1: Pool1-1st vs Pool2-2nd", "SF2: Pool2-1st vs Pool1-2nd"],
    };
  }
  if (numPools === 4) {
    const tops = [1, 2, 3, 4].map((p) => (poolStandings.get(p) ?? [])[0]).filter(Boolean);
    if (tops.length < 4) return null;
    return {
      semis: [[tops[0], tops[1]], [tops[2], tops[3]]],
      label: ["SF1: Pool1-1st vs Pool2-1st", "SF2: Pool3-1st vs Pool4-1st"],
    };
  }
  return null;
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
  const [scores, setScores] = useState<Record<string, { t1: string; t2: string }>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [courtAssign, setCourtAssign] = useState<Record<string, string>>({});

  const isDoubles = event.play_type !== "singles";
  const registeredIds = new Set(registrations.map((r) => r.member_id));
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const canRegister = tournamentStatus === "registration" && event.status === "scheduled";
  const canGenerate = tournamentStatus === "active" && event.status === "scheduled" && registrations.length >= 2;
  const canScore = event.status === "active";

  const poolMatches = matches.filter((m) => !m.is_playoff);
  const medalMatches = matches.filter((m) => m.is_playoff);

  // ── Standings per pool ──
  const poolStandings = new Map<number | null, StandingRow[]>();
  const allStandings = buildStandings(poolMatches);
  for (const row of allStandings) {
    const key = row.pool;
    if (!poolStandings.has(key)) poolStandings.set(key, []);
    poolStandings.get(key)!.push(row);
  }

  const poolPlayComplete =
    poolMatches.length > 0 &&
    poolMatches.every((m) => m.team1_score !== null && m.team2_score !== null);

  // ── Registration ────────────────────────────────────────────────────────

  async function addParticipant(memberId: string) {
    setError(null);
    setAddingId(memberId);
    const temp: Registration = { id: `temp-${memberId}`, member_id: memberId, partner_id: null, pool_number: null };
    setRegistrations((prev) => [...prev, temp]);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("tournament_registrations")
      .insert({ event_id: event.id, member_id: memberId })
      .select()
      .single();
    if (err) {
      setRegistrations((prev) => prev.filter((r) => r.id !== temp.id));
      setError(err.message);
    } else {
      setRegistrations((prev) => prev.map((r) => (r.id === temp.id ? data : r)));
    }
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
      const partnerReg = registrations.find((r) => r.member_id === newPid);
      if (partnerReg) {
        if (partnerReg.partner_id && partnerReg.partner_id !== reg.member_id) {
          const displaced = registrations.find((r) => r.member_id === partnerReg.partner_id);
          if (displaced) await supabase.from("tournament_registrations").update({ partner_id: null }).eq("id", displaced.id);
        }
        await supabase.from("tournament_registrations").update({ partner_id: reg.member_id }).eq("id", partnerReg.id);
      }
    }

    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.id === regId) return { ...r, partner_id: newPid };
        if (newPid && r.member_id === newPid) return { ...r, partner_id: reg.member_id };
        if (r.member_id === reg.partner_id && reg.partner_id !== newPid) return { ...r, partner_id: null };
        const pr = prev.find((p) => p.member_id === newPid);
        if (pr && r.member_id === pr.partner_id && r.member_id !== reg.member_id) return { ...r, partner_id: null };
        return r;
      })
    );
  }

  // ── Generate pool matches ───────────────────────────────────────────────

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
      const rounds = roundRobin(poolTeams);
      rounds.forEach((round, ri) => {
        round.forEach((match) => {
          inserts.push({
            event_id: event.id,
            pool_number: event.num_pools > 1 ? pool : null,
            court_number: 0, // unassigned
            round_number: ri + 1,
            team1_player1: match[0].p1,
            team1_player2: match[0].p2 ?? null,
            team2_player1: match[1].p1,
            team2_player2: match[1].p2 ?? null,
            is_playoff: false,
          });
        });
      });
    }

    const { data: newMatches, error: matchErr } = await supabase.from("tournament_matches").insert(inserts).select();
    if (matchErr) { setError(matchErr.message); return; }
    setMatches(newMatches ?? []);
    startTransition(() => router.refresh());
  }

  // ── Score ───────────────────────────────────────────────────────────────

  async function saveScore(matchId: string) {
    setError(null);
    const s = scores[matchId];
    if (!s) return;
    const t1 = parseInt(s.t1);
    const t2 = parseInt(s.t2);
    if (isNaN(t1) || isNaN(t2)) { setError("Enter valid scores."); return; }
    const winner = t1 > t2 ? 1 : t2 > t1 ? 2 : null;
    const supabase = createClient();
    const { error: err } = await supabase.from("tournament_matches").update({
      team1_score: t1, team2_score: t2, winner_team: winner, played_at: new Date().toISOString(),
    }).eq("id", matchId);
    if (err) { setError(err.message); return; }
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, team1_score: t1, team2_score: t2, winner_team: winner } : m));
    setScores((prev) => { const n = { ...prev }; delete n[matchId]; return n; });
  }

  // ── Assign court ────────────────────────────────────────────────────────

  async function assignCourt(matchId: string, court: number) {
    const supabase = createClient();
    await supabase.from("tournament_matches").update({ court_number: court }).eq("id", matchId);
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, court_number: court } : m));
  }

  // ── Generate medal round ────────────────────────────────────────────────

  async function generateMedalRound() {
    setError(null);
    const seed = seedMedalRound(poolStandings, event.num_pools);
    if (!seed) { setError("Not enough standings to seed medal round."); return; }

    const inserts = seed.semis.map(([a, b], i) => ({
      event_id: event.id,
      pool_number: null,
      court_number: 0,
      round_number: i + 1,
      team1_player1: a.p1,
      team1_player2: a.p2 ?? null,
      team2_player1: b.p1,
      team2_player2: b.p2 ?? null,
      is_playoff: true,
    }));

    const supabase = createClient();
    const { data, error: err } = await supabase.from("tournament_matches").insert(inserts).select();
    if (err) { setError(err.message); return; }
    setMatches((prev) => [...prev, ...(data ?? [])]);
    setTab("medal");
  }

  async function generateFinals(semifinalMatches: Match[]) {
    // Winners play final, losers play bronze
    const [sf1, sf2] = semifinalMatches;
    if (!sf1 || !sf2 || sf1.winner_team === null || sf2.winner_team === null) {
      setError("Both semifinals must be scored first.");
      return;
    }

    const getTeam = (m: Match, side: 1 | 2) => ({
      p1: side === 1 ? m.team1_player1 : m.team2_player1,
      p2: side === 1 ? m.team1_player2 : m.team2_player2,
    });

    const sf1winner = getTeam(sf1, sf1.winner_team as 1 | 2);
    const sf1loser = getTeam(sf1, sf1.winner_team === 1 ? 2 : 1);
    const sf2winner = getTeam(sf2, sf2.winner_team as 1 | 2);
    const sf2loser = getTeam(sf2, sf2.winner_team === 1 ? 2 : 1);

    const inserts = [
      { event_id: event.id, pool_number: null, court_number: 0, round_number: 10, team1_player1: sf1winner.p1, team1_player2: sf1winner.p2, team2_player1: sf2winner.p1, team2_player2: sf2winner.p2, is_playoff: true },
      { event_id: event.id, pool_number: null, court_number: 0, round_number: 11, team1_player1: sf1loser.p1, team1_player2: sf1loser.p2, team2_player1: sf2loser.p1, team2_player2: sf2loser.p2, is_playoff: true },
    ];

    const supabase = createClient();
    const { data, error: err } = await supabase.from("tournament_matches").insert(inserts).select();
    if (err) { setError(err.message); return; }
    setMatches((prev) => [...prev, ...(data ?? [])]);
  }

  async function completeEvent() {
    const supabase = createClient();
    const { error: err } = await supabase.from("tournament_events").update({ status: "completed" }).eq("id", event.id);
    if (err) { setError(err.message); return; }
    startTransition(() => router.refresh());
  }

  // ── Tab helpers ─────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: "queue", label: "Queue" },
    { key: "standings", label: "Standings" },
    { key: "participants", label: "Participants" },
    { key: "medal", label: "Medal Round" },
  ];

  const semis = medalMatches.filter((m) => m.round_number <= 4);
  const finals = medalMatches.filter((m) => m.round_number === 10);
  const bronze = medalMatches.filter((m) => m.round_number === 11);
  const allSemisScored = semis.length > 0 && semis.every((m) => m.winner_team !== null);
  const finalsExist = finals.length > 0;

  // ── MatchCard ───────────────────────────────────────────────────────────

  function MatchCard({ match, label }: { match: Match; label?: string }) {
    const t1 = teamLabel(match.team1_player1, match.team1_player2, memberMap, true);
    const t2 = teamLabel(match.team2_player1, match.team2_player2, memberMap, true);
    const scored = match.team1_score !== null;
    const sc = scores[match.id] ?? { t1: "", t2: "" };

    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {(label || match.court_number > 0) && (
          <div className="mb-2 flex items-center gap-2">
            {label && <span className="text-xs font-semibold text-brand-lime">{label}</span>}
            {match.court_number > 0
              ? <span className="text-xs text-white/40">Court {match.court_number}</span>
              : canScore && (
                <select
                  className="rounded bg-white/10 px-2 py-0.5 text-xs text-white"
                  value={courtAssign[match.id] ?? ""}
                  onChange={(e) => {
                    const c = parseInt(e.target.value);
                    setCourtAssign((prev) => ({ ...prev, [match.id]: e.target.value }));
                    if (!isNaN(c) && c > 0) assignCourt(match.id, c);
                  }}
                >
                  <option value="">Assign court…</option>
                  {Array.from({ length: event.num_courts }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Court {i + 1}</option>
                  ))}
                </select>
              )}
          </div>
        )}
        {!label && match.court_number === 0 && canScore && (
          <div className="mb-2">
            <select
              className="rounded bg-white/10 px-2 py-0.5 text-xs text-white"
              value={courtAssign[match.id] ?? ""}
              onChange={(e) => {
                const c = parseInt(e.target.value);
                setCourtAssign((prev) => ({ ...prev, [match.id]: e.target.value }));
                if (!isNaN(c) && c > 0) assignCourt(match.id, c);
              }}
            >
              <option value="">Assign court…</option>
              {Array.from({ length: event.num_courts }, (_, i) => (
                <option key={i + 1} value={i + 1}>Court {i + 1}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className={`flex-1 text-sm font-medium ${match.winner_team === 1 ? "text-brand-lime" : "text-white"}`}>{t1}</span>
          {scored ? (
            <span className="text-sm font-bold tabular-nums text-white">{match.team1_score} – {match.team2_score}</span>
          ) : canScore ? (
            <div className="flex items-center gap-1">
              <input type="number" min="0" placeholder="0" value={sc.t1}
                onChange={(e) => setScores((p) => ({ ...p, [match.id]: { ...sc, t1: e.target.value } }))}
                className="w-12 rounded bg-white/10 px-2 py-1 text-center text-sm text-white" />
              <span className="text-white/40">–</span>
              <input type="number" min="0" placeholder="0" value={sc.t2}
                onChange={(e) => setScores((p) => ({ ...p, [match.id]: { ...sc, t2: e.target.value } }))}
                className="w-12 rounded bg-white/10 px-2 py-1 text-center text-sm text-white" />
              <button onClick={() => saveScore(match.id)}
                className="ml-1 rounded bg-brand-lime px-2 py-1 text-xs font-semibold text-brand-dark">
                Save
              </button>
            </div>
          ) : (
            <span className="text-xs text-white/30">vs</span>
          )}
          <span className={`flex-1 text-right text-sm font-medium ${match.winner_team === 2 ? "text-brand-lime" : "text-white"}`}>{t2}</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl bg-white/5 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-brand-lime text-brand-dark"
                : "text-white/60 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── QUEUE ─────────────────────────────────────────────────────── */}
      {tab === "queue" && (
        <div className="space-y-6">
          {canGenerate && matches.length === 0 && (
            <div>
              <Button onClick={generateMatches}>Generate Pool Matches</Button>
              <p className="mt-2 text-xs text-white/40">
                {registrations.length} participant{registrations.length !== 1 ? "s" : ""} ·{" "}
                {event.num_pools} pool{event.num_pools > 1 ? "s" : ""}
              </p>
            </div>
          )}

          {poolMatches.length === 0 && !canGenerate && (
            <p className="text-sm text-white/40">
              {event.status === "scheduled"
                ? "Start the tournament to generate matches."
                : "No pool matches yet."}
            </p>
          )}

          {/* Group by round */}
          {[...new Set(poolMatches.map((m) => m.round_number))].sort((a, b) => a - b).map((round) => {
            const rMatches = poolMatches.filter((m) => m.round_number === round);
            return (
              <div key={round}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">Round {round}</p>
                <div className="space-y-2">
                  {rMatches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            );
          })}

          {canScore && (
            <div className="flex gap-3 pt-2">
              {poolPlayComplete && medalMatches.length === 0 && (
                <Button onClick={generateMedalRound}>Generate Medal Round</Button>
              )}
              {event.status === "active" && (
                <Button variant="outline" onClick={completeEvent}>Complete Event</Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STANDINGS ─────────────────────────────────────────────────── */}
      {tab === "standings" && (
        <div className="space-y-6">
          {poolStandings.size === 0 && (
            <p className="text-sm text-white/40">No scored matches yet.</p>
          )}
          {[...poolStandings.entries()].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0)).map(([pool, rows]) => (
            <div key={pool ?? "main"}>
              {event.num_pools > 1 && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-lime">
                  Pool {pool}
                </p>
              )}
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-white/40">
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Team</th>
                      <th className="px-4 py-2 text-center">W</th>
                      <th className="px-4 py-2 text-center">L</th>
                      <th className="px-4 py-2 text-center">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.key} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-2 text-white/40">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-white">
                          {teamLabel(row.p1, row.p2, memberMap)}
                        </td>
                        <td className="px-4 py-2 text-center text-brand-lime">{row.wins}</td>
                        <td className="px-4 py-2 text-center text-white/60">{row.losses}</td>
                        <td className="px-4 py-2 text-center text-white/60">
                          {row.pointsFor - row.pointsAgainst > 0 ? "+" : ""}
                          {row.pointsFor - row.pointsAgainst}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PARTICIPANTS ───────────────────────────────────────────────── */}
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
                      {m.is_guest && (
                        <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Guest</span>
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
              <p className="mb-2 text-xs text-white/40">Add participants</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {members.filter((m) => !registeredIds.has(m.id)).map((m) => (
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
            <p className="text-sm text-white/40">
              No participants yet. Tournament must be in &ldquo;Registration&rdquo; status to add participants.
            </p>
          )}
        </div>
      )}

      {/* ── MEDAL ROUND ────────────────────────────────────────────────── */}
      {tab === "medal" && (
        <div className="space-y-6">
          {medalMatches.length === 0 && (
            <div>
              {poolPlayComplete ? (
                <Button onClick={generateMedalRound}>Generate Medal Round</Button>
              ) : (
                <p className="text-sm text-white/40">Complete all pool matches first to unlock the medal round.</p>
              )}
            </div>
          )}

          {/* Semifinals */}
          {semis.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-lime">Semifinals</p>
              <div className="space-y-2">
                {semis.map((m, i) => (
                  <MatchCard key={m.id} match={m} label={`SF${i + 1}`} />
                ))}
              </div>
            </div>
          )}

          {/* Generate finals button */}
          {allSemisScored && !finalsExist && (
            <Button onClick={() => generateFinals(semis)}>Generate Final & Bronze Match</Button>
          )}

          {/* Finals */}
          {finals.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-lime">Final</p>
              <div className="space-y-2">
                {finals.map((m) => <MatchCard key={m.id} match={m} label="Gold Medal Match" />)}
              </div>
            </div>
          )}

          {/* Bronze */}
          {bronze.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">Bronze Match</p>
              <div className="space-y-2">
                {bronze.map((m) => <MatchCard key={m.id} match={m} label="Bronze Medal Match" />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
