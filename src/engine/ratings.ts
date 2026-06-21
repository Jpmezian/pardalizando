import type { Player, SubPos } from '@/types';
import { FORM_PER_STEP, GK_DEF_WEIGHT } from '@/config/balance';
import { positionPenalty, sectorsOf, type Sector } from './positions';

export interface SectorStrength {
  atk: number;
  mid: number;
  def: number;
}

export const ALL_SUBPOS: SubPos[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'];

export interface PositionFit {
  subPos: SubPos;
  ovr: number;
  penalty: number;
}

/** OVR efetivo do jogador em cada posição, da melhor pra pior. */
export function playerPositionFits(player: Player): PositionFit[] {
  return ALL_SUBPOS.map((subPos) => ({
    subPos,
    ovr: Math.round(effectiveOvr(player, subPos)),
    penalty: positionPenalty(player.subPos, subPos),
  })).sort((a, b) => b.ovr - a.ovr);
}

/** OVR efetivo do jogador num slot: ovr × penalidade de posição × fator de forma (spec §5.1). */
export function effectiveOvr(player: Player, slot: SubPos): number {
  return player.ovr * positionPenalty(player.subPos, slot) * (1 + player.form * FORM_PER_STEP);
}

export interface FilledSlot {
  subPos: SubPos;
  player: Player;
}

/** Força por setor (atk/mid/def) a partir dos 11 escalados. Goleiro pesa mais na defesa. */
export function teamStrength(slots: FilledSlot[]): SectorStrength {
  const acc: Record<Sector, { sum: number; weight: number }> = {
    atk: { sum: 0, weight: 0 },
    mid: { sum: 0, weight: 0 },
    def: { sum: 0, weight: 0 },
  };

  for (const { subPos, player } of slots) {
    const eff = effectiveOvr(player, subPos);
    const weight = subPos === 'GK' ? GK_DEF_WEIGHT : 1;
    for (const sector of sectorsOf(subPos)) {
      const w = sector === 'def' ? weight : 1;
      acc[sector].sum += eff * w;
      acc[sector].weight += w;
    }
  }

  return {
    atk: acc.atk.weight > 0 ? acc.atk.sum / acc.atk.weight : 0,
    mid: acc.mid.weight > 0 ? acc.mid.sum / acc.mid.weight : 0,
    def: acc.def.weight > 0 ? acc.def.sum / acc.def.weight : 0,
  };
}

/** Escolhe o melhor XI (guloso por slot) de um elenco para uma lista de posições. */
export function pickBestXI(players: Player[], slotPositions: SubPos[]): FilledSlot[] {
  const used = new Set<string>();
  const filled: FilledSlot[] = [];

  for (const subPos of slotPositions) {
    let best: Player | null = null;
    let bestScore = -Infinity;
    for (const player of players) {
      if (used.has(player.id)) continue;
      const score = effectiveOvr(player, subPos);
      if (score > bestScore) {
        bestScore = score;
        best = player;
      }
    }
    if (best) {
      used.add(best.id);
      filled.push({ subPos, player: best });
    }
  }

  return filled;
}
