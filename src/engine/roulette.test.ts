import { describe, it, expect } from 'vitest';
import type { Player } from '@/types';
import { REEL_LENGTH, REEL_WINNER_INDEX, ROULETTE_SPINS } from '@/config/economy';
import { createRng } from './rng';
import { spinRoulette } from './roulette';

function makePool(): Player[] {
  const pool: Player[] = [];
  for (let ovr = 60; ovr <= 95; ovr += 1) {
    pool.push({
      id: `p${ovr}`,
      name: `P${ovr}`,
      clubId: 'x',
      pos: 'FW',
      subPos: 'ST',
      ovr,
      pot: ovr,
      age: 24,
      value: ovr * 100_000,
      form: 0,
    });
  }
  return pool;
}

describe('spinRoulette', () => {
  it('monta a fita com o vencedor no índice esperado', () => {
    const result = spinRoulette(makePool(), ROULETTE_SPINS.comum!, createRng(1), 0);
    expect(result).not.toBeNull();
    expect(result!.reel).toHaveLength(REEL_LENGTH);
    expect(result!.winnerIndex).toBe(REEL_WINNER_INDEX);
    expect(result!.reel[REEL_WINNER_INDEX]!.id).toBe(result!.winner.id);
  });

  it('é determinística: mesma seed → mesmo vencedor', () => {
    const a = spinRoulette(makePool(), ROULETTE_SPINS.comum!, createRng(7), 0);
    const b = spinRoulette(makePool(), ROULETTE_SPINS.comum!, createRng(7), 0);
    expect(a!.winner.id).toBe(b!.winner.id);
  });

  it('pity: garante item alto e zera o contador', () => {
    const pity = ROULETTE_SPINS.comum!.pityEvery! - 1;
    const result = spinRoulette(makePool(), ROULETTE_SPINS.comum!, createRng(2), pity);
    expect(result!.isHigh).toBe(true);
    expect(result!.winner.ovr).toBeGreaterThanOrEqual(ROULETTE_SPINS.comum!.highOvr);
    expect(result!.newPity).toBe(0);
  });
});
