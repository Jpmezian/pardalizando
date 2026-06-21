import type { Player, Rarity } from '@/types';
import type { Rng } from './rng';
import { PACKS, SELL_FACTOR, type PackConfig, type PackTier } from '@/config/economy';

export interface PackResult {
  /** Jogador-modelo sorteado do pool (o store clona pro elenco). */
  template: Player;
  rarity: Rarity;
  /** Caiu um "item alto" (≥ highOvr do pacote)? */
  isHigh: boolean;
}

export interface OpenPackOutput {
  result: PackResult | null;
  newPityCount: number;
}

/** Sorteia o tier de OVR do pacote pelas probabilidades exibidas. */
export function rollPackTier(config: PackConfig, rng: Rng, forceTop: boolean): PackTier {
  const top = config.tiers[config.tiers.length - 1]!;
  if (forceTop) return top;
  let r = rng.next();
  for (const tier of config.tiers) {
    r -= tier.p;
    if (r <= 0) return tier;
  }
  return top;
}

export function pickInBand(pool: Player[], tier: PackTier, rng: Rng): Player | null {
  const inBand = pool.filter((player) => player.ovr >= tier.min && player.ovr <= tier.max);
  if (inBand.length > 0) return inBand[rng.int(0, inBand.length - 1)] ?? null;

  // Fallback: o mais próximo do meio da faixa (raríssimo de precisar).
  const mid = (tier.min + tier.max) / 2;
  let best: Player | null = null;
  let bestDistance = Infinity;
  for (const player of pool) {
    const distance = Math.abs(player.ovr - mid);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = player;
    }
  }
  return best;
}

/**
 * Abre um pacote: sorteia um tier e tira um jogador do pool naquela faixa de OVR.
 * Pity timer: a cada `pityEvery` aberturas sem item alto, garante o tier de cima.
 */
export function openPack(
  pool: Player[],
  rarity: Rarity,
  rng: Rng,
  pityCount: number,
): OpenPackOutput {
  const config = PACKS[rarity];
  const forceTop = config.pityEvery !== undefined && pityCount >= config.pityEvery - 1;
  const tier = rollPackTier(config, rng, forceTop);
  const template = pickInBand(pool, tier, rng);
  if (!template) return { result: null, newPityCount: pityCount };

  const isHigh = template.ovr >= config.highOvr;
  const newPityCount =
    config.pityEvery === undefined ? pityCount : isHigh ? 0 : pityCount + 1;

  return { result: { template, rarity, isHigh }, newPityCount };
}

/** Valor recebido ao vender um jogador (fração do valor de mercado). */
export function sellValue(player: Player): number {
  return Math.round(player.value * SELL_FACTOR);
}
