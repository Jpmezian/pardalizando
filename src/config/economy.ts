import type { Rarity } from '@/types';

/**
 * Economia do mercado (spec §6.5). Constantes nomeadas e fáceis de tunar.
 * As probabilidades dos pacotes são EXIBIDAS na UI — transparência é regra.
 */

/** Limite de elenco: força decisões (pra abrir pacote às vezes precisa vender). */
export const ROSTER_LIMIT = 30;
/** Não dá pra vender abaixo de um time. */
export const MIN_ROSTER = 11;
/**
 * Fração do valor de mercado recebida ao vender (estilo "quick-sell").
 * Baixa de propósito: evita arbitragem (abrir pacote barato e vender no lucro).
 * Com 0.4, o valor esperado de revender um pacote Ouro fica < custo do pacote.
 */
export const SELL_FACTOR = 0.4;
/** Fichas douradas iniciais (no MVP; no jogo completo vêm de conquistas). */
export const STARTING_TICKETS = 2;

export interface PackTier {
  min: number;
  max: number;
  /** Probabilidade (0–1) — soma 1 por pacote. */
  p: number;
}

export interface PackConfig {
  label: string;
  cost: number;
  currency: 'budget' | 'tickets';
  tiers: PackTier[];
  /** OVR a partir do qual conta como "item alto" (pro pity). */
  highOvr: number;
  /** A cada N aberturas sem item alto, garante o tier de cima. */
  pityEvery?: number;
}

export const PACKS: Record<Rarity, PackConfig> = {
  bronze: {
    label: 'Bronze',
    cost: 2_000_000,
    currency: 'budget',
    highOvr: 74,
    tiers: [
      { min: 60, max: 66, p: 0.62 },
      { min: 67, max: 71, p: 0.3 },
      { min: 72, max: 77, p: 0.08 },
    ],
  },
  prata: {
    label: 'Prata',
    cost: 6_000_000,
    currency: 'budget',
    highOvr: 80,
    tiers: [
      { min: 68, max: 73, p: 0.55 },
      { min: 74, max: 78, p: 0.36 },
      { min: 79, max: 84, p: 0.09 },
    ],
  },
  ouro: {
    label: 'Ouro',
    cost: 16_000_000,
    currency: 'budget',
    highOvr: 86,
    pityEvery: 5,
    tiers: [
      { min: 76, max: 81, p: 0.56 },
      { min: 82, max: 85, p: 0.34 },
      { min: 86, max: 91, p: 0.1 },
    ],
  },
  lendario: {
    label: 'Lendário',
    cost: 3,
    currency: 'tickets',
    highOvr: 90,
    tiers: [
      { min: 84, max: 87, p: 0.52 },
      { min: 88, max: 90, p: 0.34 },
      { min: 91, max: 95, p: 0.14 },
    ],
  },
};

export const RARITY_ORDER: Rarity[] = ['bronze', 'prata', 'ouro', 'lendario'];

// --- Roleta (gacha com near-miss; substitui o scouting) ---
// Reusa a forma de PackConfig: tiers com probabilidades transparentes + pity.
export const ROULETTE_SPINS: Record<string, PackConfig> = {
  comum: {
    label: 'Giro Comum',
    cost: 10_000_000,
    currency: 'budget',
    highOvr: 84,
    pityEvery: 6,
    tiers: [
      { min: 72, max: 78, p: 0.55 },
      { min: 79, max: 83, p: 0.35 },
      { min: 84, max: 89, p: 0.1 },
    ],
  },
  premium: {
    label: 'Giro de Ouro',
    cost: 3,
    currency: 'tickets',
    highOvr: 90,
    tiers: [
      { min: 80, max: 85, p: 0.5 },
      { min: 86, max: 89, p: 0.35 },
      { min: 90, max: 95, p: 0.15 },
    ],
  },
};

export const ROULETTE_SPIN_IDS = ['comum', 'premium'];
/** Tamanho da fita da roleta e onde o vencedor para (perto do fim, pra desacelerar). */
export const REEL_LENGTH = 40;
export const REEL_WINNER_INDEX = 34;

// --- Recompensas de fim de temporada (spec §6.5) ---
export interface SeasonReward {
  budget: number;
  tickets: number;
}

/** Receita + fichas pela posição final (alimenta a temporada seguinte). */
export function seasonReward(position: number, clubCount: number): SeasonReward {
  if (position === 1) return { budget: 60_000_000, tickets: 3 };
  if (position <= 4) return { budget: 30_000_000, tickets: 1 };
  if (position <= clubCount / 2) return { budget: 15_000_000, tickets: 0 };
  return { budget: 8_000_000, tickets: 0 };
}

