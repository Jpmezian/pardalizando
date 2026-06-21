import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { simulateMatch } from './match';
import type { SectorStrength } from './ratings';

const strong: SectorStrength = { atk: 85, mid: 85, def: 85 };
const weak: SectorStrength = { atk: 70, mid: 70, def: 70 };
const even: SectorStrength = { atk: 78, mid: 78, def: 78 };

describe('simulateMatch', () => {
  it('é determinístico: mesma seed → mesmo placar', () => {
    expect(simulateMatch(strong, weak, createRng(42))).toEqual(
      simulateMatch(strong, weak, createRng(42)),
    );
  });

  it('sanidade estatística: favorito claro vence a maioria, mas não sempre (10k jogos)', () => {
    const rng = createRng(2024);
    const total = 10000;
    let favWins = 0;
    let goalsSum = 0;
    for (let i = 0; i < total; i += 1) {
      const result = simulateMatch(strong, weak, rng);
      if (result.homeGoals > result.awayGoals) favWins += 1;
      goalsSum += result.homeGoals + result.awayGoals;
    }
    const winRate = favWins / total;
    expect(winRate).toBeGreaterThan(0.6);
    expect(winRate).toBeLessThan(0.99); // zebra ainda acontece

    const avgGoals = goalsSum / total;
    expect(avgGoals).toBeGreaterThan(1);
    expect(avgGoals).toBeLessThan(5);
  });

  it('times iguais: o mandante leva leve vantagem (mando de campo)', () => {
    const rng = createRng(7);
    const total = 10000;
    let homeWins = 0;
    let awayWins = 0;
    for (let i = 0; i < total; i += 1) {
      const result = simulateMatch(even, even, rng);
      if (result.homeGoals > result.awayGoals) homeWins += 1;
      else if (result.homeGoals < result.awayGoals) awayWins += 1;
    }
    expect(homeWins).toBeGreaterThan(awayWins);
    const homeRate = homeWins / total;
    expect(homeRate).toBeGreaterThan(0.33);
    expect(homeRate).toBeLessThan(0.62);
  });
});
