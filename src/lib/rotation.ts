/**
 * Fair court rotation algorithm for FreakingBall open play sessions.
 *
 * Goals:
 * 1. Every player gets equal playing time (±1 match difference max)
 * 2. Players face different opponents each round when possible
 * 3. Players have different partners each round when possible
 * 4. All courts run simultaneously per round
 *
 * Rating-aware mode (when players have ratings):
 * - Players are grouped into courts by rating (highest ratings on court 1)
 * - Within each court, all 3 possible team splits are evaluated by badness score
 * - Badness = team_avg_gap + repeat partner/opponent penalties + off-level penalty
 */

import { getRawLevel, LEVEL_ORDER } from "@/lib/rating";

export interface Player {
  id: string;
  gender?: "male" | "female" | "other";
  rating?: number;
}

export interface MatchAssignment {
  courtNumber: number;
  team1: [string, string | null];
  team2: [string, string | null];
  sittingOut: string[];
  ratingWarning?: boolean; // true if team gap > 50
}

export interface RotationHistory {
  partneredWith: Map<string, Set<string>>;
  playedAgainst: Map<string, Set<string>>;
  sharedCourtWith: Map<string, Set<string>>; // partner OR opponent — anyone on same court
  matchCount: Map<string, number>;
}

export function createHistory(playerIds: string[]): RotationHistory {
  return {
    partneredWith:   new Map(playerIds.map((id) => [id, new Set()])),
    playedAgainst:   new Map(playerIds.map((id) => [id, new Set()])),
    sharedCourtWith: new Map(playerIds.map((id) => [id, new Set()])),
    matchCount:      new Map(playerIds.map((id) => [id, 0])),
  };
}

function pairingScore(
  a: string,
  b: string,
  history: RotationHistory,
  type: "partner" | "opponent"
): number {
  const map = type === "partner" ? history.partneredWith : history.playedAgainst;
  const hasPaired = map.get(a)?.has(b) || map.get(b)?.has(a);
  return hasPaired ? 0 : 1;
}

function updateHistory(
  assignment: MatchAssignment,
  history: RotationHistory,
  isDoubles: boolean
) {
  const { team1, team2 } = assignment;
  const [t1p1, t1p2] = team1;
  const [t2p1, t2p2] = team2;

  const updateCount = (id: string) => {
    history.matchCount.set(id, (history.matchCount.get(id) ?? 0) + 1);
  };

  const addPartner = (a: string, b: string | null) => {
    if (!b) return;
    history.partneredWith.get(a)?.add(b);
    history.partneredWith.get(b)?.add(a);
  };

  const addOpponent = (a: string, b: string) => {
    history.playedAgainst.get(a)?.add(b);
    history.playedAgainst.get(b)?.add(a);
  };

  [t1p1, t1p2, t2p1, t2p2].forEach((p) => p && updateCount(p));

  if (isDoubles && t1p2 && t2p2) {
    addPartner(t1p1, t1p2);
    addPartner(t2p1, t2p2);
    [t1p1, t1p2].forEach((a) => [t2p1, t2p2].forEach((b) => addOpponent(a, b)));
  } else {
    addOpponent(t1p1, t2p1);
  }

  // Track everyone who shared this court (all 4 players with each other)
  const courtPlayers = [t1p1, t1p2, t2p1, t2p2].filter(Boolean) as string[];
  for (const a of courtPlayers) {
    for (const b of courtPlayers) {
      if (a !== b) history.sharedCourtWith.get(a)?.add(b);
    }
  }
}

/** Singles rotation — 2 players per court */
export function generateSinglesRound(
  players: Player[],
  numCourts: number,
  history: RotationHistory
): MatchAssignment[] {
  const sorted = [...players].sort(
    (a, b) => (history.matchCount.get(a.id) ?? 0) - (history.matchCount.get(b.id) ?? 0)
  );

  const active = sorted;
  const sitting: string[] = [];
  const used = new Set<string>();
  const courts: MatchAssignment[] = [];

  for (let c = 0; c < numCourts; c++) {
    const available = active.filter((p) => !used.has(p.id));
    if (available.length < 2) break;

    let best: [string, string] | null = null;
    let bestScore = -1;

    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const score = pairingScore(available[i].id, available[j].id, history, "opponent");
        if (score > bestScore) {
          bestScore = score;
          best = [available[i].id, available[j].id];
        }
      }
    }

    if (!best) best = [available[0].id, available[1].id];

    used.add(best[0]);
    used.add(best[1]);

    const assignment: MatchAssignment = {
      courtNumber: c + 1,
      team1: [best[0], null],
      team2: [best[1], null],
      sittingOut: c === 0 ? sitting : [],
    };
    courts.push(assignment);
    updateHistory(assignment, history, false);
  }

  return courts;
}

/** Doubles rotation — 4 players per court (original algorithm, no ratings) */
export function generateDoublesRound(
  players: Player[],
  numCourts: number,
  history: RotationHistory,
  partnerMode: "fixed" | "rotating",
  playType: "doubles" | "mixed_doubles" | "open_doubles",
  fixedPartners?: Map<string, string>
): MatchAssignment[] {
  const sorted = [...players].sort(
    (a, b) => (history.matchCount.get(a.id) ?? 0) - (history.matchCount.get(b.id) ?? 0)
  );

  const active = sorted;
  const sitting: string[] = [];
  const courts: MatchAssignment[] = [];
  const used = new Set<string>();

  for (let c = 0; c < numCourts; c++) {
    const available = active.filter((p) => !used.has(p.id));
    if (available.length < 4) break;

    let team1: [string, string] | null = null;
    let team2: [string, string] | null = null;

    if (partnerMode === "fixed" && fixedPartners) {
      const pairPool: Array<[string, string]> = [];
      const seen = new Set<string>();
      for (const p of available) {
        const partner = fixedPartners.get(p.id);
        if (partner && available.find((x) => x.id === partner) && !seen.has(p.id)) {
          pairPool.push([p.id, partner]);
          seen.add(p.id);
          seen.add(partner);
        }
      }
      if (pairPool.length >= 2) {
        team1 = pairPool[0];
        team2 = pairPool[1];
      }
    }

    if (!team1 || !team2) {
      team1 = findBestPair(available, used, history, playType);
      if (!team1) break;

      const remaining = available.filter((p) => p.id !== team1![0] && p.id !== team1![1]);
      team2 = findBestPair(remaining, used, history, playType);
      if (!team2) break;
    }

    used.add(team1[0]);
    used.add(team1[1]);
    used.add(team2[0]);
    used.add(team2[1]);

    const assignment: MatchAssignment = {
      courtNumber: c + 1,
      team1: [team1[0], team1[1]],
      team2: [team2[0], team2[1]],
      sittingOut: c === 0 ? sitting : [],
    };
    courts.push(assignment);
    updateHistory(assignment, history, true);
  }

  return courts;
}

// ── Rating-aware matchmaking ──────────────────────────────────────────────────

function repeatCount(a: string, b: string, map: Map<string, Set<string>>): number {
  return map.get(a)?.has(b) ? 1 : 0;
}

function badnessScore(
  teamA: Player[],
  teamB: Player[],
  history: RotationHistory
): number {
  const avgA = teamA.reduce((s, p) => s + (p.rating ?? 400), 0) / teamA.length;
  const avgB = teamB.reduce((s, p) => s + (p.rating ?? 400), 0) / teamB.length;
  const teamGap = Math.abs(avgA - avgB);

  let score = teamGap;

  // Hard max penalty
  if (teamGap > 100) score += 1000;

  // Repeat partner penalties
  for (const a of teamA) {
    for (const b of teamA) {
      if (a.id !== b.id) score += repeatCount(a.id, b.id, history.partneredWith) * 20;
    }
  }
  for (const a of teamB) {
    for (const b of teamB) {
      if (a.id !== b.id) score += repeatCount(a.id, b.id, history.partneredWith) * 20;
    }
  }

  // Repeat opponent penalties
  for (const a of teamA) {
    for (const b of teamB) {
      score += repeatCount(a.id, b.id, history.playedAgainst) * 10;
    }
  }

  // Off-level penalty: partner is >1 level away
  const offLevelPenalty = (team: Player[]) => {
    if (team.length < 2) return 0;
    const [p1, p2] = team;
    const r1 = p1.rating ?? 400;
    const r2 = p2.rating ?? 400;
    const l1 = LEVEL_ORDER.indexOf(getRawLevel(r1));
    const l2 = LEVEL_ORDER.indexOf(getRawLevel(r2));
    return Math.abs(l1 - l2) > 1 ? 15 : 0;
  };
  score += offLevelPenalty(teamA);
  score += offLevelPenalty(teamB);

  return score;
}

/**
 * Rating-aware doubles round:
 * - Groups players into courts by rating (top ratings → court 1)
 * - Within each court evaluates all 3 pairings by badness score
 * - Falls back to original algorithm if players lack ratings
 */
export function generateRatingAwareDoublesRound(
  players: Player[],
  numCourts: number,
  history: RotationHistory,
  playType: "doubles" | "mixed_doubles" | "open_doubles"
): MatchAssignment[] {
  const hasRatings = players.some((p) => p.rating !== undefined);

  if (!hasRatings) {
    return generateDoublesRound(players, numCourts, history, "rotating", playType);
  }

  // Sort by fewest games first (fairness), break ties by rating desc
  const sorted = [...players].sort((a, b) => {
    const countDiff = (history.matchCount.get(a.id) ?? 0) - (history.matchCount.get(b.id) ?? 0);
    if (countDiff !== 0) return countDiff;
    return (b.rating ?? 400) - (a.rating ?? 400);
  });

  // Determine how many players can play (multiples of 4)
  const courtsToFill = Math.min(numCourts, Math.floor(sorted.length / 4));
  const activePlayers = sorted.slice(0, courtsToFill * 4);

  // Sort active players by rating desc for court grouping
  const byRating = [...activePlayers].sort((a, b) => (b.rating ?? 400) - (a.rating ?? 400));

  // Court grouping: for each court, pick 4 players that minimise shared-court repeats
  // while staying within a reasonable rating window.
  // Strategy: anchor on the highest-rated unassigned player, then pick 3 companions
  // from the nearest rating neighbours, preferring those they haven't shared a court with.
  function sharedCourtCount(a: string, b: string): number {
    return history.sharedCourtWith.get(a)?.has(b) ? 1 : 0;
  }

  function groupBadness(group: Player[]): number {
    let score = 0;
    // Rating spread penalty (keep courts balanced)
    const ratings = group.map((p) => p.rating ?? 400);
    const spread = Math.max(...ratings) - Math.min(...ratings);
    score += spread;
    if (spread > 200) score += 500; // hard penalty for extreme mismatch
    // Shared-court-repeat penalty (the main new signal)
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        score += sharedCourtCount(group[i].id, group[j].id) * 60;
      }
    }
    return score;
  }

  // Build court groups greedily, one court at a time
  const assigned = new Set<string>();
  const courtGroups: Player[][] = [];

  for (let c = 0; c < courtsToFill; c++) {
    const pool = byRating.filter((p) => !assigned.has(p.id));
    if (pool.length < 4) break;

    // Anchor = highest-rated unassigned player
    const anchor = pool[0];
    // Candidates = rest of pool (already sorted by rating desc, so neighbours are close)
    const candidates = pool.slice(1);

    // Try all combinations of 3 from candidates (capped at first 8 to stay fast)
    const searchPool = candidates.slice(0, 8);
    let bestGroup: Player[] = [anchor, ...searchPool.slice(0, 3)];
    let bestScore = groupBadness(bestGroup);

    for (let i = 0; i < searchPool.length; i++) {
      for (let j = i + 1; j < searchPool.length; j++) {
        for (let k = j + 1; k < searchPool.length; k++) {
          const group = [anchor, searchPool[i], searchPool[j], searchPool[k]];
          const score = groupBadness(group);
          if (score < bestScore) { bestScore = score; bestGroup = group; }
        }
      }
    }

    courtGroups.push(bestGroup);
    for (const p of bestGroup) assigned.add(p.id);
  }

  const courts: MatchAssignment[] = [];

  for (let c = 0; c < courtGroups.length; c++) {
    const group = courtGroups[c];
    if (group.length < 4) break;

    // For mixed doubles: validate group has at least 1M + 1F
    let validGroup = group;
    if (playType === "mixed_doubles") {
      const hasMale   = group.some((p) => p.gender === "male");
      const hasFemale = group.some((p) => p.gender === "female");
      if (!hasMale || !hasFemale) {
        // Fall back: pick any 4 that work from remaining players
        const remaining = byRating.filter((p) => !group.find((g) => g.id === p.id));
        const anyMale   = remaining.find((p) => p.gender === "male");
        const anyFemale = remaining.find((p) => p.gender === "female");
        if (anyMale && !hasMale)   validGroup = [...group.slice(0, 3), anyMale];
        if (anyFemale && !hasFemale) validGroup = [...group.slice(0, 3), anyFemale];
      }
    }

    // Evaluate all 3 possible splits: (01 vs 23), (02 vs 13), (03 vs 12)
    const splits: Array<[Player[], Player[]]> = [
      [[validGroup[0], validGroup[1]], [validGroup[2], validGroup[3]]],
      [[validGroup[0], validGroup[2]], [validGroup[1], validGroup[3]]],
      [[validGroup[0], validGroup[3]], [validGroup[1], validGroup[2]]],
    ];

    // For mixed doubles: filter to valid splits (1M+1F per team)
    const candidateSplits = playType === "mixed_doubles"
      ? splits.filter(([teamA, teamB]) => {
          const aValid = teamA.some((p) => p.gender === "male") && teamA.some((p) => p.gender === "female");
          const bValid = teamB.some((p) => p.gender === "male") && teamB.some((p) => p.gender === "female");
          return aValid && bValid;
        })
      : splits;

    const evalSplits = candidateSplits.length > 0 ? candidateSplits : splits;

    let bestSplit = evalSplits[0];
    let bestBadness = badnessScore(evalSplits[0][0], evalSplits[0][1], history);

    for (const split of evalSplits.slice(1)) {
      const b = badnessScore(split[0], split[1], history);
      if (b < bestBadness) {
        bestBadness = b;
        bestSplit = split;
      }
    }

    const [teamA, teamB] = bestSplit;
    const avgA = teamA.reduce((s, p) => s + (p.rating ?? 400), 0) / teamA.length;
    const avgB = teamB.reduce((s, p) => s + (p.rating ?? 400), 0) / teamB.length;
    const ratingWarning = Math.abs(avgA - avgB) > 50;

    const assignment: MatchAssignment = {
      courtNumber: c + 1,
      team1: [teamA[0].id, teamA[1].id],
      team2: [teamB[0].id, teamB[1].id],
      sittingOut: c === 0 ? sorted.filter((p) => !assigned.has(p.id)).map((p) => p.id) : [],
      ratingWarning,
    };
    courts.push(assignment);
    updateHistory(assignment, history, true);
  }

  return courts;
}

function findBestPair(
  available: Player[],
  used: Set<string>,
  history: RotationHistory,
  playType: string
): [string, string] | null {
  const pool = available.filter((p) => !used.has(p.id));
  if (pool.length < 2) return null;

  let best: [string, string] | null = null;
  let bestScore = -1;

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];

      if (playType === "mixed_doubles") {
        const isValidMixed =
          (a.gender === "male" && b.gender === "female") ||
          (a.gender === "female" && b.gender === "male");
        if (!isValidMixed) continue;
      }

      const score = pairingScore(a.id, b.id, history, "partner");
      if (score > bestScore) {
        bestScore = score;
        best = [a.id, b.id];
      }
    }
  }

  if (!best) best = [pool[0].id, pool[1].id];

  return best;
}
