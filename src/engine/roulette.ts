import type { Player } from '@/types';
import type { Rng } from './rng';
import { REEL_LENGTH, REEL_WINNER_INDEX, type PackConfig } from '@/config/economy';
import { pickInBand, rollPackTier } from './market';

export interface RouletteResult {
  /** Jogador-modelo vencedor (o store clona pro elenco). */
  winner: Player;
  /** Fita de cartas que rola na tela; o vencedor está em `winnerIndex`. */
  reel: Player[];
  winnerIndex: number;
  isHigh: boolean;
  newPity: number;
}

/**
 * Gira a roleta. O vencedor sai pelas probabilidades (com pity), e a fita é
 * montada com cartas de tier alto coladas no vencedor — quando a roleta
 * desacelera e para, dá a sensação de "quase!" (near-miss) que vicia.
 */
export function spinRoulette(
  pool: Player[],
  config: PackConfig,
  rng: Rng,
  pity: number,
): RouletteResult | null {
  const forceTop = config.pityEvery !== undefined && pity >= config.pityEvery - 1;
  const winnerTier = rollPackTier(config, rng, forceTop);
  const winner = pickInBand(pool, winnerTier, rng);
  if (!winner) return null;

  const isHigh = winner.ovr >= config.highOvr;
  const newPity = config.pityEvery === undefined ? pity : isHigh ? 0 : pity + 1;

  const topTier = config.tiers[config.tiers.length - 1]!;
  const reel: Player[] = [];
  for (let i = 0; i < REEL_LENGTH; i += 1) {
    if (i === REEL_WINNER_INDEX) {
      reel.push(winner);
      continue;
    }
    // Cartas vizinhas do vencedor são de tier alto → near-miss.
    const isNeighbor = Math.abs(i - REEL_WINNER_INDEX) === 1;
    const fillerTier = isNeighbor ? topTier : config.tiers[rng.int(0, config.tiers.length - 1)]!;
    reel.push(pickInBand(pool, fillerTier, rng) ?? winner);
  }

  return { winner, reel, winnerIndex: REEL_WINNER_INDEX, isHigh, newPity };
}
