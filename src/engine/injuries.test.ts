import { describe, it, expect } from 'vitest';
import type { Player } from '@/types';
import { createRng } from './rng';
import { generateSeasonInjuries } from './injuries';

function squadOf(size: number): Player[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `p${i}`,
    name: `Jogador ${i}`,
    clubId: 'c',
    pos: 'MF',
    subPos: 'CM',
    ovr: 80,
    pot: 85,
    age: 25,
    value: 0,
    form: 0,
  }));
}

describe('generateSeasonInjuries', () => {
  it('com chance 1, todo mundo se lesiona e os eventos são coerentes', () => {
    const squad = squadOf(10);
    const events = generateSeasonInjuries(squad, createRng(1), 1);
    expect(events).toHaveLength(10);
    for (const event of events) {
      expect(squad.some((p) => p.id === event.playerId)).toBe(true);
      expect(event.matches).toBeGreaterThanOrEqual(2);
      expect(event.seasonsOut).toBeGreaterThanOrEqual(0);
      expect(event.headline.length).toBeGreaterThan(0);
      expect(event.serious).toBe(event.seasonsOut >= 1);
    }
  });

  it('é determinística: mesma seed → mesmos eventos', () => {
    const a = generateSeasonInjuries(squadOf(20), createRng(7), 0.5);
    const b = generateSeasonInjuries(squadOf(20), createRng(7), 0.5);
    expect(a).toEqual(b);
  });

  it('com chance baixa, lesões são raras', () => {
    const events = generateSeasonInjuries(squadOf(25), createRng(3));
    expect(events.length).toBeLessThan(8);
  });
});
