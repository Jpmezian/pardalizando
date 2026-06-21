import { describe, it, expect } from 'vitest';
import type { Player } from '@/types';
import { PACKS, SELL_FACTOR } from '@/config/economy';
import { createRng } from './rng';
import { openPack, rollPackTier, sellValue } from './market';

function makePool(): Player[] {
  const pool: Player[] = [];
  for (let ovr = 55; ovr <= 95; ovr += 1) {
    pool.push({
      id: `p${ovr}`,
      name: `P${ovr}`,
      clubId: 'x',
      pos: 'FW',
      subPos: 'ST',
      ovr,
      pot: ovr,
      age: 25,
      value: ovr * 100_000,
      form: 0,
    });
  }
  return pool;
}

describe('rollPackTier', () => {
  it('forceTop devolve o tier de cima', () => {
    const tier = rollPackTier(PACKS.ouro, createRng(1), true);
    expect(tier).toEqual(PACKS.ouro.tiers[PACKS.ouro.tiers.length - 1]);
  });
});

describe('openPack', () => {
  it('é determinístico: mesma seed e pool → mesmo jogador', () => {
    const a = openPack(makePool(), 'prata', createRng(5), 0);
    const b = openPack(makePool(), 'prata', createRng(5), 0);
    expect(a.result?.template.id).toBe(b.result?.template.id);
  });

  it('o jogador sorteado fica na faixa de OVR do pacote', () => {
    const out = openPack(makePool(), 'ouro', createRng(3), 0);
    expect(out.result).not.toBeNull();
    expect(out.result!.template.ovr).toBeGreaterThanOrEqual(76);
    expect(out.result!.template.ovr).toBeLessThanOrEqual(91);
  });

  it('pity: na última abertura sem item alto, garante item alto e zera o contador', () => {
    const out = openPack(makePool(), 'ouro', createRng(2), PACKS.ouro.pityEvery! - 1);
    expect(out.result!.isHigh).toBe(true);
    expect(out.result!.template.ovr).toBeGreaterThanOrEqual(PACKS.ouro.highOvr);
    expect(out.newPityCount).toBe(0);
  });
});

describe('sellValue', () => {
  it('aplica a fração de venda', () => {
    const player = makePool()[0]!;
    expect(sellValue(player)).toBe(Math.round(player.value * SELL_FACTOR));
  });
});
