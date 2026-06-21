import type { Rng } from './rng';
import type { SectorStrength } from './ratings';
import {
  BASE_GOALS,
  HOME_ADVANTAGE,
  MAX_LAMBDA,
  MIN_LAMBDA,
  SCALE,
  SECTOR_WEIGHTS,
} from '@/config/balance';
import { samplePoisson } from './poisson';

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  /** Gols esperados (λ) de cada lado — útil pra explicar o placar. */
  lambdaHome: number;
  lambdaAway: number;
}

function teamForce(strength: SectorStrength): number {
  return (
    SECTOR_WEIGHTS.atk * strength.atk +
    SECTOR_WEIGHTS.mid * strength.mid +
    SECTOR_WEIGHTS.def * strength.def
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Simula uma partida (spec §5.3). Resultado vem da diferença de força + vantagem de
 * casa, convertida em gols esperados (λ) e amostrada via Poisson com o RNG seedado.
 */
export function simulateMatch(home: SectorStrength, away: SectorStrength, rng: Rng): MatchResult {
  const diff = teamForce(home) + HOME_ADVANTAGE - teamForce(away);
  const lambdaHome = clamp(BASE_GOALS * Math.exp(diff / SCALE), MIN_LAMBDA, MAX_LAMBDA);
  const lambdaAway = clamp(BASE_GOALS * Math.exp(-diff / SCALE), MIN_LAMBDA, MAX_LAMBDA);

  return {
    homeGoals: samplePoisson(rng, lambdaHome),
    awayGoals: samplePoisson(rng, lambdaAway),
    lambdaHome,
    lambdaAway,
  };
}
