/**
 * Constantes de balanceamento da simulação (spec §5.3 / §6.5).
 * Centralizadas e nomeadas pra facilitar a calibração (teste de sanidade de 10k jogos).
 */

/** Pesos dos setores na força do time (somam 1.0). */
export const SECTOR_WEIGHTS = { atk: 0.4, mid: 0.35, def: 0.25 } as const;

/** Vantagem de jogar em casa, somada à força do mandante. */
export const HOME_ADVANTAGE = 2.5;

/** Gols esperados base por time num confronto equilibrado. */
export const BASE_GOALS = 1.35;

/**
 * Escala que converte diferença de força em gols esperados. Maior = jogos mais parelhos.
 * Calibrado (teste de 10k): favorito com +15 de força vence ~90%, mas zebra acontece.
 */
export const SCALE = 18;

export const MIN_LAMBDA = 0.2;
export const MAX_LAMBDA = 5.0;

/** O goleiro pesa mais no cálculo da defesa. */
export const GK_DEF_WEIGHT = 1.6;

/** Cada ponto de forma (-3..+3) altera o OVR efetivo em 2%. */
export const FORM_PER_STEP = 0.02;

/**
 * Quanto o MELHOR jogador de cada setor puxa a força acima da média (0 = média pura).
 * Faz o craque pesar de verdade: um monstro num setor vale mais que a média mandaria,
 * então puxar/comprar um jogador foda muda o resultado (alinha a coleção com a simulação).
 */
export const STAR_BONUS = 0.45;
