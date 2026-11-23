/**
 * Fair court rotation algorithm for FreakingBall open play sessions.
 *
 * Goals:
 * 1. Every player gets equal playing time (±1 match difference max)
 * 2. Players face different opponents each round when possible
 * 3. Players have different partners each round when possible
 * 4. No team faces an opponent team more than 1 skill level apart
 * 5. Courts rotate — same 4 players should not share a court every round
 */

export const LEVEL_ORDER = ["beginner", "novice", "intermediate", "advanced", "expert"] as const;
type SkillLevel = typeof LEVEL_ORDER[number];

export interface Player {
  id: string;
  gender?: "male" | "female" | "other";
  rating?: number;
  skill_level?: string;
}

export interface MatchAssignment {
  courtNumber: number;
  team1: [string, string | null];
  team2: [string, string | null];
  sittingOut: string[];
  levelWarning?: boolean;
}

export interface RotationHistory {
  partneredWith: Map<string, Set<string>>;
  playedAgainst: Map<string, Set<string>>;
  sharedCourtWith: Map<string, Set<string>>;
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

function levelIndex(p: Player): number {
  const idx = LEVEL_ORDER.indexOf((p.skill_level ?? "beginner") as SkillLevel);
  return idx === -1 ? 0 : idx;
}

function updateHistory(assignment: MatchAssignment, history: RotationHistory, isDoubles: boolean) {
  const [t1p1, t1p2] = assignment.team1;
  const [t2p1, t2p2] = assignment.team2;

  const inc = (id: string) => history.matchCount.set(id, (history.matchCount.get(id) ?? 0) + 1);
  const addPartner = (a: string, b: string | null) => {
    if (!b) return;
    history.partneredWith.get(a)?.add(b);
    history.partneredWith.get(b)?.add(a);
  };
  const addOpponent = (a: string, b: string) => {
    history.playedAgainst.get(a)?.add(b);
    history.playedAgainst.get(b)?.add(a);
  };

  [t1p1, t1p2, t2p1, t2p2].forEach((p) => p && inc(p));

  if (isDoubles && t1p2 && t2p2) {
    addPartner(t1p1, t1p2);
    addPartner(t2p1, t2p2);
    [t1p1, t1p2].forEach((a) => [t2p1, t2p2].forEach((b) => addOpponent(a, b)));
  } else {
    addOpponent(t1p1, t2p1);
  }

  const courtPlayers = [t1p1, t1p2, t2p1, t2p2].filter(Boolean) as string[];
  for (const a of courtPlayers)
    for (const b of courtPlayers)
      if (a !== b) history.sharedCourtWith.get(a)?.add(b);
}

/** Singles rotation */
export function generateSinglesRound(
  players: Player[],
  numCourts: number,
  history: RotationHistory
): MatchAssignment[] {
  const sorted = [...players].sort(
    (a, b) => (history.matchCount.get(a.id) ?? 0) - (history.matchCount.get(b.id) ?? 0)
  );
  const used = new Set<string>();
  const courts: MatchAssignment[] = [];

  for (let c = 0; c < numCourts; c++) {
    const available = sorted.filter((p) => !used.has(p.id));
    if (available.length < 2) break;

    let best: [string, string] = [available[0].id, available[1].id];
    let bestScore = -1;
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const hasPlayed = history.playedAgainst.get(available[i].id)?.has(available[j].id) ? 0 : 1;
        if (hasPlayed > bestScore) { bestScore = hasPlayed; best = [available[i].id, available[j].id]; }
      }
    }

    used.add(best[0]); used.add(best[1]);
    const assignment: MatchAssignment = {
      courtNumber: c + 1,
      team1: [best[0], null],
      team2: [best[1], null],
      sittingOut: c === 0 ? sorted.filter((p) => !used.has(p.id) && available.indexOf(p) === -1).map((p) => p.id) : [],
    };
    courts.push(assignment);
    updateHistory(assignment, history, false);
  }
  return courts;
}

/** Doubles rotation — no-ratings fallback */
export function generateDoublesRound(
  players: Player[],
  numCourts: number,
  history: RotationHistory,
  partnerMode: "fixed" | "rotating",
  playType: "doubles" | "mixed_doubles" | "open_doubles",
  fixedPartners?: Map<string, string>
): MatchAssignment[] {
  return generateSkillAwareDoublesRound(players, numCourts, history, playType);
}

// ── Skill-level-aware matchmaking ─────────────────────────────────────────────

/**
 * Scores a group of 4 players for court assignment.
 * Lower = better.
 * Priority order:
 *  1. Minimize shared-court repeats (200pts each) — main diversity driver
 *  2. Minimize level spread within the group (soft constraint)
 *  3. All else equal, prefer players with fewer matches (fairness)
 */
function groupScore(group: Player[], history: RotationHistory): number {
  let score = 0;

  // Shared-court repeat penalty — dominant signal
  for (let i = 0; i < group.length; i++)
    for (let j = i + 1; j < group.length; j++)
      if (history.sharedCourtWith.get(group[i].id)?.has(group[j].id)) score += 200;

  // Level spread penalty (soft — allows mixing but prefers balanced groups)
  const levels = group.map(levelIndex);
  const spread = Math.max(...levels) - Math.min(...levels);
  score += spread * 30; // 30pts per level gap within the group

  return score;
}

/**
 * Scores a team split within a court group.
 * Lower = better.
 * Rules:
 *  1. Teams whose avg level differs by >1 get a hard penalty (600pts)
 *  2. Repeat partner penalty (150pts each)
 *  3. Repeat opponent penalty (80pts each)
 */
function splitScore(
  teamA: Player[],
  teamB: Player[],
  history: RotationHistory
): number {
  let score = 0;

  // Avg level gap between teams — the core fairness rule
  const avgA = teamA.reduce((s, p) => s + levelIndex(p), 0) / teamA.length;
  const avgB = teamB.reduce((s, p) => s + levelIndex(p), 0) / teamB.length;
  const levelGap = Math.abs(avgA - avgB);
  if (levelGap > 1) score += 600; // hard penalty: teams >1 level apart

  // Repeat partner penalty
  for (let i = 0; i < teamA.length; i++)
    for (let j = i + 1; j < teamA.length; j++)
      if (history.partneredWith.get(teamA[i].id)?.has(teamA[j].id)) score += 150;
  for (let i = 0; i < teamB.length; i++)
    for (let j = i + 1; j < teamB.length; j++)
      if (history.partneredWith.get(teamB[i].id)?.has(teamB[j].id)) score += 150;

  // Repeat opponent penalty
  for (const a of teamA)
    for (const b of teamB)
      if (history.playedAgainst.get(a.id)?.has(b.id)) score += 80;

  return score;
}

export function generateSkillAwareDoublesRound(
  players: Player[],
  numCourts: number,
  history: RotationHistory,
  playType: "doubles" | "mixed_doubles" | "open_doubles"
): MatchAssignment[] {
  // Sort by fewest matches first (fairness), break ties by level desc
  const sorted = [...players].sort((a, b) => {
    const countDiff = (history.matchCount.get(a.id) ?? 0) - (history.matchCount.get(b.id) ?? 0);
    if (countDiff !== 0) return countDiff;
    return levelIndex(b) - levelIndex(a);
  });

  const courtsToFill = Math.min(numCourts, Math.floor(sorted.length / 4));
  const activePlayers = sorted.slice(0, courtsToFill * 4);
  const sittingOut = sorted.slice(courtsToFill * 4).map((p) => p.id);

  // ── Court grouping ────────────────────────────────────────────
  // For each court, greedily pick the best group of 4 from remaining players.
  // Evaluate all C(remaining, 3) combos anchored on the player with fewest matches.
  const assigned = new Set<string>();
  const courtGroups: Player[][] = [];

  for (let c = 0; c < courtsToFill; c++) {
    const pool = activePlayers.filter((p) => !assigned.has(p.id));
    if (pool.length < 4) break;

    const anchor = pool[0]; // fewest matches (already sorted)
    const candidates = pool.slice(1, 11); // cap search at 10 for performance

    let bestGroup = [anchor, candidates[0], candidates[1], candidates[2]];
    let bestScore = groupScore(bestGroup, history);

    for (let i = 0; i < candidates.length; i++)
      for (let j = i + 1; j < candidates.length; j++)
        for (let k = j + 1; k < candidates.length; k++) {
          const group = [anchor, candidates[i], candidates[j], candidates[k]];
          const s = groupScore(group, history);
          if (s < bestScore) { bestScore = s; bestGroup = group; }
        }

    courtGroups.push(bestGroup);
    for (const p of bestGroup) assigned.add(p.id);
  }

  // ── Team splitting within each court ─────────────────────────
  const courts: MatchAssignment[] = [];

  for (let c = 0; c < courtGroups.length; c++) {
    const g = courtGroups[c];

    // All 3 possible splits of 4 players into 2 teams of 2
    const splits: Array<[Player[], Player[]]> = [
      [[g[0], g[1]], [g[2], g[3]]],
      [[g[0], g[2]], [g[1], g[3]]],
      [[g[0], g[3]], [g[1], g[2]]],
    ];

    // For mixed doubles: only keep splits with 1M+1F per team
    const validSplits = playType === "mixed_doubles"
      ? splits.filter(([a, b]) =>
          a.some((p) => p.gender === "male") && a.some((p) => p.gender === "female") &&
          b.some((p) => p.gender === "male") && b.some((p) => p.gender === "female")
        )
      : splits;

    const evalSplits = validSplits.length > 0 ? validSplits : splits;

    let bestSplit = evalSplits[0];
    let bestSplitScore = splitScore(evalSplits[0][0], evalSplits[0][1], history);
    for (const split of evalSplits.slice(1)) {
      const s = splitScore(split[0], split[1], history);
      if (s < bestSplitScore) { bestSplitScore = s; bestSplit = split; }
    }

    const [teamA, teamB] = bestSplit;
    const avgA = teamA.reduce((s, p) => s + levelIndex(p), 0) / teamA.length;
    const avgB = teamB.reduce((s, p) => s + levelIndex(p), 0) / teamB.length;

    const assignment: MatchAssignment = {
      courtNumber: c + 1,
      team1: [teamA[0].id, teamA[1].id],
      team2: [teamB[0].id, teamB[1].id],
      sittingOut: c === 0 ? sittingOut : [],
      levelWarning: Math.abs(avgA - avgB) > 1,
    };
    courts.push(assignment);
    updateHistory(assignment, history, true);
  }

  return courts;
}

// Keep old export name pointing to new implementation
export function generateRatingAwareDoublesRound(
  players: Player[],
  numCourts: number,
  history: RotationHistory,
  playType: "doubles" | "mixed_doubles" | "open_doubles"
): MatchAssignment[] {
  return generateSkillAwareDoublesRound(players, numCourts, history, playType);
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
      const a = pool[i], b = pool[j];
      if (playType === "mixed_doubles") {
        const valid = (a.gender === "male" && b.gender === "female") ||
                      (a.gender === "female" && b.gender === "male");
        if (!valid) continue;
      }
      const score = history.partneredWith.get(a.id)?.has(b.id) ? 0 : 1;
      if (score > bestScore) { bestScore = score; best = [a.id, b.id]; }
    }
  }

  return best ?? [pool[0].id, pool[1].id];
}
