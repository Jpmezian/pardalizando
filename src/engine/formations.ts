import type { FormationId, SubPos } from '@/types';

/** Slot de uma formação: posição ideal + coordenadas no campo (0–100, vertical). */
export interface FormationSlot {
  subPos: SubPos;
  x: number; // 0 = esquerda, 100 = direita
  y: number; // 12 = ataque (topo), 90 = goleiro (base)
}

export const FORMATIONS: Record<FormationId, FormationSlot[]> = {
  '4-4-2': [
    { subPos: 'GK', x: 50, y: 90 },
    { subPos: 'LB', x: 18, y: 70 },
    { subPos: 'CB', x: 39, y: 72 },
    { subPos: 'CB', x: 61, y: 72 },
    { subPos: 'RB', x: 82, y: 70 },
    { subPos: 'CM', x: 17, y: 46 },
    { subPos: 'CM', x: 40, y: 48 },
    { subPos: 'CM', x: 60, y: 48 },
    { subPos: 'CM', x: 83, y: 46 },
    { subPos: 'ST', x: 40, y: 16 },
    { subPos: 'ST', x: 60, y: 16 },
  ],
  '4-3-3': [
    { subPos: 'GK', x: 50, y: 90 },
    { subPos: 'LB', x: 18, y: 70 },
    { subPos: 'CB', x: 39, y: 72 },
    { subPos: 'CB', x: 61, y: 72 },
    { subPos: 'RB', x: 82, y: 70 },
    { subPos: 'DM', x: 50, y: 56 },
    { subPos: 'CM', x: 32, y: 46 },
    { subPos: 'CM', x: 68, y: 46 },
    { subPos: 'LW', x: 18, y: 22 },
    { subPos: 'ST', x: 50, y: 15 },
    { subPos: 'RW', x: 82, y: 22 },
  ],
  '4-2-3-1': [
    { subPos: 'GK', x: 50, y: 90 },
    { subPos: 'LB', x: 18, y: 70 },
    { subPos: 'CB', x: 39, y: 72 },
    { subPos: 'CB', x: 61, y: 72 },
    { subPos: 'RB', x: 82, y: 70 },
    { subPos: 'DM', x: 38, y: 58 },
    { subPos: 'DM', x: 62, y: 58 },
    { subPos: 'LW', x: 18, y: 34 },
    { subPos: 'AM', x: 50, y: 36 },
    { subPos: 'RW', x: 82, y: 34 },
    { subPos: 'ST', x: 50, y: 14 },
  ],
  '3-5-2': [
    { subPos: 'GK', x: 50, y: 90 },
    { subPos: 'CB', x: 32, y: 72 },
    { subPos: 'CB', x: 50, y: 73 },
    { subPos: 'CB', x: 68, y: 72 },
    { subPos: 'LB', x: 12, y: 52 },
    { subPos: 'CM', x: 35, y: 50 },
    { subPos: 'CM', x: 50, y: 52 },
    { subPos: 'CM', x: 65, y: 50 },
    { subPos: 'RB', x: 88, y: 52 },
    { subPos: 'ST', x: 40, y: 16 },
    { subPos: 'ST', x: 60, y: 16 },
  ],
  '5-3-2': [
    { subPos: 'GK', x: 50, y: 90 },
    { subPos: 'LB', x: 14, y: 68 },
    { subPos: 'CB', x: 33, y: 72 },
    { subPos: 'CB', x: 50, y: 73 },
    { subPos: 'CB', x: 67, y: 72 },
    { subPos: 'RB', x: 86, y: 68 },
    { subPos: 'CM', x: 32, y: 48 },
    { subPos: 'CM', x: 50, y: 50 },
    { subPos: 'CM', x: 68, y: 48 },
    { subPos: 'ST', x: 40, y: 18 },
    { subPos: 'ST', x: 60, y: 18 },
  ],
};

export const FORMATION_IDS: FormationId[] = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2'];

export function formationSubPositions(id: FormationId): SubPos[] {
  return FORMATIONS[id].map((slot) => slot.subPos);
}

/** Multiplicadores de força por setor: cada formação é um trade-off (mais ataque = menos defesa). */
export interface FormationBias {
  atk: number;
  mid: number;
  def: number;
}

export const FORMATION_BIAS: Record<FormationId, FormationBias> = {
  '4-4-2': { atk: 1.0, mid: 1.0, def: 1.0 }, // equilíbrio
  '4-3-3': { atk: 1.07, mid: 1.0, def: 0.93 }, // ofensiva pelos lados
  '4-2-3-1': { atk: 1.05, mid: 1.03, def: 0.94 }, // ofensiva com meio armado
  '3-5-2': { atk: 1.02, mid: 1.07, def: 0.93 }, // domina o meio, frágil atrás
  '5-3-2': { atk: 0.92, mid: 0.99, def: 1.1 }, // defensiva / retranca
};

/** Rótulo curto do estilo de cada formação (pra UI). */
export const FORMATION_STYLE: Record<FormationId, string> = {
  '4-4-2': 'Equilibrada',
  '4-3-3': 'Ofensiva',
  '4-2-3-1': 'Ofensiva',
  '3-5-2': 'Meio forte',
  '5-3-2': 'Defensiva',
};

export function formationBias(id: FormationId): FormationBias {
  return FORMATION_BIAS[id];
}
