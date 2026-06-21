import type { Player, PlayerSeasonStats } from '@/types';

export interface AwardWinner {
  playerId: string;
  value: number;
}

export interface SeasonAwards {
  /** Melhor da temporada (pontuação composta). */
  mvp: AwardWinner | null;
  topScorer: AwardWinner | null;
  topAssist: AwardWinner | null;
  /** Goleiro com mais jogos sem sofrer gol. */
  goldenGlove: AwardWinner | null;
  /** Melhor jogador até 21 anos. */
  youngPlayer: AwardWinner | null;
}

/** Pontuação de temporada que pondera gols, assistências, clean sheets e nota. */
export function seasonScore(stats: PlayerSeasonStats): number {
  const avgRating = stats.apps > 0 ? stats.ratingSum / stats.apps : 0;
  return stats.goals * 4 + stats.assists * 3 + stats.cleanSheets * 1.5 + (avgRating - 6) * stats.apps * 0.6;
}

export function computeSeasonAwards(
  players: Record<string, Player>,
  stats: Record<string, PlayerSeasonStats>,
): SeasonAwards {
  let mvp: AwardWinner | null = null;
  let topScorer: AwardWinner | null = null;
  let topAssist: AwardWinner | null = null;
  let goldenGlove: AwardWinner | null = null;
  let youngPlayer: AwardWinner | null = null;

  for (const [playerId, playerStats] of Object.entries(stats)) {
    const player = players[playerId];
    if (!player || playerStats.apps === 0) continue;

    const score = seasonScore(playerStats);
    if (!mvp || score > mvp.value) mvp = { playerId, value: score };
    if (!topScorer || playerStats.goals > topScorer.value) {
      topScorer = { playerId, value: playerStats.goals };
    }
    if (!topAssist || playerStats.assists > topAssist.value) {
      topAssist = { playerId, value: playerStats.assists };
    }
    if (player.pos === 'GK' && (!goldenGlove || playerStats.cleanSheets > goldenGlove.value)) {
      goldenGlove = { playerId, value: playerStats.cleanSheets };
    }
    if (player.age <= 21 && (!youngPlayer || score > youngPlayer.value)) {
      youngPlayer = { playerId, value: score };
    }
  }

  return { mvp, topScorer, topAssist, goldenGlove, youngPlayer };
}
