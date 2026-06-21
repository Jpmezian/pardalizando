import { describe, it, expect } from 'vitest';
import type { SectorStrength } from './ratings';
import { createRng } from './rng';
import { simulateKnockout, type CupEntrant } from './cup';

function entrant(id: string, ovr: number): CupEntrant {
  const strength: SectorStrength = { atk: ovr, mid: ovr, def: ovr };
  return { clubId: id, strength };
}

describe('simulateKnockout', () => {
  it('produz um campeão entre os participantes', () => {
    const entrants = Array.from({ length: 8 }, (_, i) => entrant(`c${i}`, 70 + i));
    const result = simulateKnockout(entrants, createRng(1));
    expect(result.championId).not.toBeNull();
    expect(entrants.some((e) => e.clubId === result.championId)).toBe(true);
  });

  it('chave de potência de 2 reduz pela metade a cada rodada e termina na Final', () => {
    const entrants = Array.from({ length: 8 }, (_, i) => entrant(`c${i}`, 75));
    const result = simulateKnockout(entrants, createRng(3));
    expect(result.rounds.map((round) => round.ties.length)).toEqual([4, 2, 1]);
    expect(result.rounds[result.rounds.length - 1]!.name).toBe('Final');
  });

  it('lida com número ímpar de participantes (byes)', () => {
    const entrants = Array.from({ length: 6 }, (_, i) => entrant(`c${i}`, 75));
    const result = simulateKnockout(entrants, createRng(5));
    expect(result.championId).not.toBeNull();
  });

  it('é determinística: mesma seed → mesmo campeão', () => {
    const entrants = Array.from({ length: 8 }, (_, i) => entrant(`c${i}`, 70 + i));
    const a = simulateKnockout(entrants, createRng(9));
    const b = simulateKnockout(entrants, createRng(9));
    expect(a.championId).toBe(b.championId);
  });
});
