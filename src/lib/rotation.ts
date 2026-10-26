/**
 * Fair court rotation algorithm for FreakingBall open play sessions.
 *
 * Goals:
 * 1. Every player gets equal playing time (±1 match difference max)
 * 2. Players face different opponents each round when possible
 * 3. Players have different partners each round when possible
 * 4. All courts run simultaneously per round
 *
 * Strategy: Weighted round-robin with pair tracking.
 * We score each candidate matchup by how "fresh" the pairings are,
 * then greedily assign the best pairings to courts.
 */

export interface Player {
  id: string;
  gender?: "male" | "female" | "other";
}

export interface MatchAssignment {
  courtNumber: number;
  team1: [string, string | null];  // [player1, player2 | null for singles]
  team2: [string, string | null];
  sittingOut: string[];
}

export interface RotationHistory {
  partneredWith: Map<string, Set<string>>;    // playerId -> Set of past partner IDs
  playedAgainst: Map<string, Set<string>>;    // playerId -> Set of past opponent IDs
  matchCount: Map<string, number>;            // playerId -> number of matches played
}

export function createHistory(playerIds: string[]): RotationHistory {
  return {
    partneredWith: new Map(playerIds.map((id) => [id, new Set()])),
    playedAgainst: new Map(playerIds.map((id) => [id, new Set()])),
    matchCount: new Map(playerIds.map((id) => [id, 0])),
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
  return hasPaired ? 0 : 1; // 1 = fresh pairing, 0 = repeat
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

  // Use all available players — rotation fairness comes from matchCount sort
  const active = sorted;
  const sitting: string[] = [];

  // Build best matchups by minimizing repeat opponents
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

    if (!best) {
      best = [available[0].id, available[1].id];
    }

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

/** Doubles rotation — 4 players per court */
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

  // Use all available players — rotation fairness comes from matchCount sort
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
      // Use fixed partners, just find best opponents
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
      // Rotating: find 4 players with best fresh pairings
      team1 = findBestPair(available, used, history, playType);
      if (!team1) break;

      const remaining = available.filter(
        (p) => p.id !== team1![0] && p.id !== team1![1]
      );
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

      // Mixed doubles: must be 1M + 1F
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

  // Fallback: ignore gender constraints if no valid pair found
  if (!best) {
    best = [pool[0].id, pool[1].id];
  }

  return best;
}
