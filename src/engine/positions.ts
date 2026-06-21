import type { SubPos } from '@/types';

/**
 * Familiaridade entre posições (spec §5.2). Jogar fora da posição penaliza o OVR.
 * Tiers: mesma ×1.0, adjacente ×0.92, outfield distante ×0.75, erro com goleiro ×0.5.
 */
const ADJACENT: Record<SubPos, SubPos[]> = {
  GK: [],
  CB: ['LB', 'RB', 'DM'],
  LB: ['CB', 'LW'],
  RB: ['CB', 'RW'],
  DM: ['CB', 'CM'],
  CM: ['DM', 'AM'],
  AM: ['CM', 'LW', 'RW', 'ST'],
  LW: ['AM', 'ST', 'LB'],
  RW: ['AM', 'ST', 'RB'],
  ST: ['AM', 'LW', 'RW'],
};

export function positionPenalty(natural: SubPos, slot: SubPos): number {
  if (natural === slot) return 1.0;
  if (natural === 'GK' || slot === 'GK') return 0.5;
  if (ADJACENT[slot].includes(natural)) return 0.92;
  return 0.75;
}

export type Sector = 'atk' | 'mid' | 'def';

/** A qual(is) setor(es) uma posição contribui (spec §5.1). AM conta no meio e no ataque. */
const SECTORS_OF: Record<SubPos, Sector[]> = {
  GK: ['def'],
  CB: ['def'],
  LB: ['def'],
  RB: ['def'],
  DM: ['mid'],
  CM: ['mid'],
  AM: ['mid', 'atk'],
  LW: ['atk'],
  RW: ['atk'],
  ST: ['atk'],
};

export function sectorsOf(subPos: SubPos): readonly Sector[] {
  return SECTORS_OF[subPos];
}
