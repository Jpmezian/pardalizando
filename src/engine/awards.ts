import type { Player, PlayerSeasonStats, SubPos } from '@/types';
import type { CompetitionResult } from './competition';

export interface AwardEntry {
  player: Player;
  stats: PlayerSeasonStats;
  /** true = stats estimadas (jogador de fora da sua liga); false = stats reais simuladas. */
  estimated: boolean;
}

export interface SeasonAwards {
  /** Bola de Ouro: melhor do mundo, com peso forte pra quem foi bem na Champions/Liberta. */
  mvp: AwardEntry | null;
  topScorer: AwardEntry | null;
  topAssist: AwardEntry | null;
  goldenGlove: AwardEntry | null;
  youngPlayer: AwardEntry | null;
}

/** Pontuação de temporada que pondera gols, assistências, clean sheets e nota. */
export function seasonScore(stats: PlayerSeasonStats): number {
  const avgRating = stats.apps > 0 ? stats.ratingSum / stats.apps : 0;
  return stats.goals * 4 + stats.assists * 3 + stats.cleanSheets * 1.5 + (avgRating - 6) * stats.apps * 0.6;
}

// Quanto cada posição costuma contribuir em gols / assistências (pra estimar quem não é da sua liga).
const ATTACK_WEIGHT: Record<SubPos, number> = {
  ST: 1.0, LW: 0.78, RW: 0.78, AM: 0.6, CM: 0.32, DM: 0.16, LB: 0.14, RB: 0.14, CB: 0.08, GK: 0,
};
const ASSIST_WEIGHT: Record<SubPos, number> = {
  AM: 0.9, LW: 0.72, RW: 0.72, CM: 0.6, LB: 0.5, RB: 0.5, DM: 0.4, ST: 0.4, CB: 0.12, GK: 0,
};

/** Prestígio do clube pela campanha continental (1.0 = base; campeão = 1.6). */
function runFactorMap(result: CompetitionResult | null | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!result) return map;
  for (const group of result.groups) {
    for (const row of group.table) map.set(row.clubId, 1.0);
  }
  const roundFactor: Record<string, number> = {
    'Oitavas de final': 1.06,
    'Quartas de final': 1.12,
    Semifinal: 1.22,
    Final: 1.35,
  };
  for (const round of result.knockout) {
    const factor = roundFactor[round.name] ?? 1.05;
    for (const tie of round.ties) {
      if (tie.bye) continue;
      map.set(tie.homeId, Math.max(map.get(tie.homeId) ?? 1, factor));
      map.set(tie.awayId, Math.max(map.get(tie.awayId) ?? 1, factor));
    }
  }
  if (result.championId) map.set(result.championId, 1.6);
  return map;
}

/** Estima a linha de stats de um jogador fora da sua liga, por OVR × posição × campanha continental. */
function estimateStats(player: Player, runFactor: number): PlayerSeasonStats {
  const quality = Math.max(0, player.ovr - 62);
  const apps = 30;
  const goals = Math.min(38, Math.round(quality * 0.75 * (ATTACK_WEIGHT[player.subPos] ?? 0) * runFactor));
  const assists = Math.min(24, Math.round(quality * 0.5 * (ASSIST_WEIGHT[player.subPos] ?? 0) * runFactor));
  const cleanSheets = player.subPos === 'GK' ? Math.max(0, Math.round((quality * 0.25 + 4) * runFactor)) : 0;
  const avgRating = 6.3 + quality * 0.06 + (runFactor - 1) * 0.6;
  return { apps, goals, assists, cleanSheets, ratingSum: avgRating * apps };
}

/**
 * Premiações do mundo inteiro (spec §9). Usa stats REAIS da sua liga e ESTIMADAS pro resto,
 * com peso pesado pra campanha na Champions/Libertadores — assim a Bola de Ouro vai pro melhor
 * do mundo (em geral o craque do campeão continental), não pro artilheiro da sua liga.
 */
export function computeSeasonAwards(
  worldPlayers: Player[],
  leagueStats: Record<string, PlayerSeasonStats>,
  champions?: CompetitionResult | null,
  libertadores?: CompetitionResult | null,
): SeasonAwards {
  const champRun = runFactorMap(champions);
  const libRun = runFactorMap(libertadores);

  let mvp: { entry: AwardEntry; score: number } | null = null;
  let young: { entry: AwardEntry; score: number } | null = null;
  let topScorer: AwardEntry | null = null;
  let topAssist: AwardEntry | null = null;
  let goldenGlove: AwardEntry | null = null;

  for (const player of worldPlayers) {
    if (player.injuredSeasons && player.injuredSeasons >= 99) continue; // carreira encerrada

    const real = leagueStats[player.id];
    const runFactor = Math.max(champRun.get(player.clubId) ?? 1, libRun.get(player.clubId) ?? 1);
    const stats = real ?? estimateStats(player, runFactor);
    if (stats.apps === 0) continue;

    const entry: AwardEntry = { player, stats, estimated: !real };
    const mvpScore = seasonScore(stats) + (runFactor - 1) * 60 + player.ovr * 0.05;

    if (!mvp || mvpScore > mvp.score) mvp = { entry, score: mvpScore };

    const goalScore = stats.goals * 100 + player.ovr;
    if (!topScorer || goalScore > topScorer.stats.goals * 100 + topScorer.player.ovr) topScorer = entry;

    const assistScore = stats.assists * 100 + player.ovr;
    if (!topAssist || assistScore > topAssist.stats.assists * 100 + topAssist.player.ovr) topAssist = entry;

    if (player.subPos === 'GK') {
      const gloveScore = stats.cleanSheets * 100 + player.ovr;
      if (!goldenGlove || gloveScore > goldenGlove.stats.cleanSheets * 100 + goldenGlove.player.ovr) {
        goldenGlove = entry;
      }
    }

    if (player.age <= 21 && (!young || mvpScore > young.score)) young = { entry, score: mvpScore };
  }

  return {
    mvp: mvp?.entry ?? null,
    topScorer,
    topAssist,
    goldenGlove,
    youngPlayer: young?.entry ?? null,
  };
}
