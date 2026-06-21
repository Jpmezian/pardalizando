import type { Rng } from './rng';

/**
 * Amostra um inteiro de uma distribuição de Poisson (algoritmo de Knuth),
 * usando o RNG seedado → reproduzível. Adequado para os λ pequenos (≤5) do jogo.
 */
export function samplePoisson(rng: Rng, lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let product = 1;
  do {
    k += 1;
    product *= rng.next();
  } while (product > limit);
  return k - 1;
}
