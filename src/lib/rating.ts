import type { SkillLevel } from "@/types/database";

export { type SkillLevel };

// ── Level definitions ────────────────────────────────────────────────────────

export const SKILL_LEVELS: Record<SkillLevel, { min: number; max: number; start: number; label: string }> = {
  beginner:     { min: 100, max: 299, start: 200, label: "Beginner" },
  novice:       { min: 300, max: 449, start: 375, label: "Novice" },
  intermediate: { min: 450, max: 599, start: 525, label: "Intermediate" },
  advanced:     { min: 600, max: 749, start: 675, label: "Advanced" },
  expert:       { min: 750, max: 1000, start: 800, label: "Expert" },
};

export const LEVEL_ORDER: SkillLevel[] = ["beginner", "novice", "intermediate", "advanced", "expert"];

export const RATING_FLOOR = 100;
export const RATING_CEILING = 1000;
const LEVEL_BUFFER = 10;
const ELO_DIVIDER = 200;

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getStartingRating(level: SkillLevel): number {
  return SKILL_LEVELS[level].start;
}

/** Returns the strict level band for a rating (no buffer — used for matchmaking). */
export function getRawLevel(rating: number): SkillLevel {
  if (rating >= 750) return "expert";
  if (rating >= 600) return "advanced";
  if (rating >= 450) return "intermediate";
  if (rating >= 300) return "novice";
  return "beginner";
}

/**
 * Returns the displayed level, applying a 10-point buffer at each boundary
 * to prevent flickering when a player hovers near a level edge.
 * Always pass the player's current stored skill_level as `current`.
 */
export function getDisplayLevel(rating: number, current: SkillLevel): SkillLevel {
  const currentIdx = LEVEL_ORDER.indexOf(current);
  const nextLevel = LEVEL_ORDER[currentIdx + 1] as SkillLevel | undefined;
  const prevLevel = LEVEL_ORDER[currentIdx - 1] as SkillLevel | undefined;

  // Level up: must be BUFFER points past the next level's min
  if (nextLevel && rating >= SKILL_LEVELS[nextLevel].min + LEVEL_BUFFER) {
    return nextLevel;
  }
  // Level down: must be BUFFER points below the current level's min
  if (prevLevel && rating < SKILL_LEVELS[current].min - LEVEL_BUFFER) {
    return prevLevel;
  }
  return current;
}

export function kFactor(totalRatedGames: number): number {
  return totalRatedGames < 10 ? 40 : 25;
}

export function scoreMultiplier(winnerScore: number, loserScore: number): number {
  const margin = winnerScore - loserScore;
  if (margin <= 3) return 0.8;
  if (margin <= 6) return 1.0;
  return 1.2;
}

export function winProbability(ownAvg: number, opponentAvg: number): number {
  return 1 / (1 + Math.pow(10, (opponentAvg - ownAvg) / ELO_DIVIDER));
}

// ── Core computation ─────────────────────────────────────────────────────────

export interface RatingPlayer {
  memberId: string;
  rating: number;
  totalRatedGames: number;
  currentLevel: SkillLevel;
}

export interface RatingChange {
  memberId: string;
  ratingBefore: number;
  ratingAfter: number;
  change: number;
  newSkillLevel: SkillLevel;
}

export function computeRatingChanges(params: {
  team1: RatingPlayer[];
  team2: RatingPlayer[];
  winnerTeam: 1 | 2;
  team1Score: number;
  team2Score: number;
}): RatingChange[] {
  const { team1, team2, winnerTeam, team1Score, team2Score } = params;

  const winners = winnerTeam === 1 ? team1 : team2;
  const losers  = winnerTeam === 1 ? team2 : team1;
  const winnerScore = winnerTeam === 1 ? team1Score : team2Score;
  const loserScore  = winnerTeam === 1 ? team2Score : team1Score;

  const winnerAvg = winners.reduce((s, p) => s + p.rating, 0) / winners.length;
  const loserAvg  = losers.reduce((s, p) => s + p.rating, 0) / losers.length;

  const winProb = winProbability(winnerAvg, loserAvg);
  const multiplier = scoreMultiplier(winnerScore, loserScore);

  const changes: RatingChange[] = [];

  for (const player of winners) {
    const k = kFactor(player.totalRatedGames);
    const delta = Math.round(k * (1 - winProb) * multiplier);
    const ratingAfter = Math.min(RATING_CEILING, Math.max(RATING_FLOOR, player.rating + delta));
    changes.push({
      memberId: player.memberId,
      ratingBefore: player.rating,
      ratingAfter,
      change: ratingAfter - player.rating,
      newSkillLevel: getDisplayLevel(ratingAfter, player.currentLevel),
    });
  }

  for (const player of losers) {
    const k = kFactor(player.totalRatedGames);
    const delta = Math.round(k * (0 - (1 - winProb)) * multiplier);
    const ratingAfter = Math.min(RATING_CEILING, Math.max(RATING_FLOOR, player.rating + delta));
    changes.push({
      memberId: player.memberId,
      ratingBefore: player.rating,
      ratingAfter,
      change: ratingAfter - player.rating,
      newSkillLevel: getDisplayLevel(ratingAfter, player.currentLevel),
    });
  }

  return changes;
}
