import { describe, it, expect } from 'vitest';
import type { Player, Position, SubPos } from '@/types';
import { effectiveOvr, pickBestXI, teamStrength, type FilledSlot } from './ratings';
import { formationSubPositions } from './formations';

const POS_OF: Record<SubPos, Position> = {
  GK: 'GK',
  CB: 'DF',
  LB: 'DF',
  RB: 'DF',
  DM: 'MF',
  CM: 'MF',
  AM: 'MF',
  LW: 'FW',
  RW: 'FW',
  ST: 'FW',
};

function makePlayer(id: string, subPos: SubPos, ovr: number): Player {
  return {
    id,
    name: id,
    clubId: 'club',
    pos: POS_OF[subPos],
    subPos,
    ovr,
    pot: ovr,
    age: 25,
    value: 0,
    form: 0,
  };
}

function squadAllAt(ovr: number): Player[] {
  const positions: SubPos[] = ['GK', 'GK', 'CB', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST', 'ST'];
  return positions.map((subPos, index) => makePlayer(`${subPos}-${index}-${ovr}`, subPos, ovr));
}

describe('effectiveOvr', () => {
  it('na posição natural mantém o OVR', () => {
    expect(effectiveOvr(makePlayer('a', 'CM', 80), 'CM')).toBe(80);
  });

  it('fora de posição aplica a penalidade', () => {
    expect(effectiveOvr(makePlayer('a', 'CM', 80), 'ST')).toBe(60); // 80 × 0.75
  });
});

describe('pickBestXI', () => {
  it('preenche os 11 slots com jogadores distintos', () => {
    const xi = pickBestXI(squadAllAt(75), formationSubPositions('4-3-3'));
    expect(xi).toHaveLength(11);
    expect(new Set(xi.map((slot) => slot.player.id)).size).toBe(11);
  });
});

describe('teamStrength', () => {
  it('elenco mais forte tem todos os setores maiores', () => {
    const slots4231 = formationSubPositions('4-2-3-1');
    const strong: FilledSlot[] = pickBestXI(squadAllAt(85), slots4231);
    const weak: FilledSlot[] = pickBestXI(squadAllAt(70), slots4231);

    const strongStrength = teamStrength(strong);
    const weakStrength = teamStrength(weak);

    expect(strongStrength.atk).toBeGreaterThan(weakStrength.atk);
    expect(strongStrength.mid).toBeGreaterThan(weakStrength.mid);
    expect(strongStrength.def).toBeGreaterThan(weakStrength.def);
  });
});
