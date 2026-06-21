import { describe, it, expect } from 'vitest';
import { createRng, seedFromString } from './rng';

describe('createRng (mulberry32)', () => {
  it('é determinístico: mesma seed produz a mesma sequência', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 8 }, () => a.next());
    const seqB = Array.from({ length: 8 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('seeds diferentes divergem', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it('next() fica sempre em [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int() respeita os limites inclusivos', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.int(3, 6);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(6);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe('seedFromString (FNV-1a)', () => {
  it('é estável pra mesma string', () => {
    expect(seedFromString('flamengo')).toEqual(seedFromString('flamengo'));
  });

  it('retorna um uint32 não-negativo', () => {
    const seed = seedFromString('arsenal');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});
