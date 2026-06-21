import { describe, it, expect } from 'vitest';
import type { SectorStrength } from './ratings';
import type { CupEntrant } from './cup';
import { createRng } from './rng';
import { simulateCompetition } from './competition';

function entrant(id: string, ovr: number): CupEntrant {
  const strength: SectorStrength = { atk: ovr, mid: ovr, def: ovr };
  return { clubId: id, strength };
}

describe('simulateCompetition', () => {
  const entrants = Array.from({ length: 36 }, (_, i) => entrant(`c${i}`, 70 + (i % 20)));

  it('fase de liga única (modelo suíço): 36 times, cada um joga 8 jogos', () => {
    const result = simulateCompetition(entrants, createRng(1));
    expect(result.groups).toHaveLength(1);
    const phase = result.groups[0]!;
    expect(phase.table).toHaveLength(36);
    for (const row of phase.table) expect(row.played).toBe(8);
  });

  it('tem playoff antes das oitavas (9º–24º)', () => {
    const result = simulateCompetition(entrants, createRng(1));
    expect(result.knockout[0]?.name).toBe('Playoff');
  });

  it('produz um campeão e termina o mata-mata na Final', () => {
    const result = simulateCompetition(entrants, createRng(2));
    expect(result.championId).not.toBeNull();
    expect(entrants.some((e) => e.clubId === result.championId)).toBe(true);
    expect(result.knockout[result.knockout.length - 1]?.name).toBe('Final');
  });

  it('é determinística: mesma seed → mesmo campeão', () => {
    const a = simulateCompetition(entrants, createRng(9));
    const b = simulateCompetition(entrants, createRng(9));
    expect(a.championId).toBe(b.championId);
  });
});
