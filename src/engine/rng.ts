/**
 * Gerador de números pseudoaleatórios seedado (mulberry32).
 * Determinístico: mesma seed → mesma sequência. É a base de toda a
 * simulação reproduzível (mesma temporada bate com o replay).
 *
 * O motor (`/engine`) é TypeScript puro, sem React, e testável (spec §2.2).
 */

export interface Rng {
  /** Próximo float em [0, 1). */
  next(): number;
  /** Inteiro em [min, max] inclusivo. */
  int(min: number, max: number): number;
  /** Float em [min, max). */
  range(min: number, max: number): number;
  /** Estado atual (uint32) — permite serializar e retomar a sequência. */
  state(): number;
}

/**
 * Cria um RNG a partir de uma seed inteira (uint32).
 * Implementação mulberry32: rápida, sem dependências, distribuição decente.
 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    range(min, max) {
      return min + next() * (max - min);
    },
    state() {
      return a >>> 0;
    },
  };
}

/**
 * Deriva uma seed uint32 de uma string (hash FNV-1a 32 bits).
 * Útil pra gerar seeds estáveis a partir de nomes/ids.
 */
export function seedFromString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
