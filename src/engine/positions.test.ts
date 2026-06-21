import { describe, it, expect } from 'vitest';
import type { SubPos } from '@/types';
import { positionPenalty, sectorsOf } from './positions';

const ALL_SUBPOS: SubPos[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'];

describe('positionPenalty', () => {
  it('mesma posição não penaliza', () => {
    expect(positionPenalty('CM', 'CM')).toBe(1.0);
  });

  it('posição adjacente penaliza pouco (CM↔DM)', () => {
    expect(positionPenalty('CM', 'DM')).toBe(0.92);
  });

  it('posição distante de linha penaliza médio (CB→ST)', () => {
    expect(positionPenalty('CB', 'ST')).toBe(0.75);
  });

  it('envolver o goleiro penaliza forte', () => {
    expect(positionPenalty('GK', 'CB')).toBe(0.5);
    expect(positionPenalty('ST', 'GK')).toBe(0.5);
  });

  it('é simétrica para todos os pares', () => {
    for (const a of ALL_SUBPOS) {
      for (const b of ALL_SUBPOS) {
        expect(positionPenalty(a, b)).toBe(positionPenalty(b, a));
      }
    }
  });
});

describe('sectorsOf', () => {
  it('AM conta no meio e no ataque', () => {
    expect(sectorsOf('AM')).toContain('mid');
    expect(sectorsOf('AM')).toContain('atk');
  });

  it('goleiro é só defesa', () => {
    expect(sectorsOf('GK')).toEqual(['def']);
  });
});
