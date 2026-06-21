/**
 * Cor de time determinística — os clubes não têm cor no dataset, então derivamos
 * uma a partir do id (estável entre sessões). Usada nas setas de ataque do cinematic.
 */
function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function teamHue(seed: string): number {
  return hashString(seed) % 360;
}

/** Tira o hue da faixa do verde-gramado (~110–175) pra cor do time não sumir no campo. */
function avoidGrass(hue: number): number {
  if (hue >= 110 && hue <= 175) return hue < 145 ? 100 : 185;
  return hue;
}

export function colorFromHue(hue: number): string {
  // Vivo e claro o suficiente pra contrastar com o gramado e entre si.
  return `oklch(0.67 0.21 ${hue})`;
}

/**
 * Par de cores contrastantes pra casa/visitante: vivas, fora do verde-gramado e
 * com ≥80° de diferença de matiz (gira o visitante se ficar perto).
 */
export function teamColorPair(homeSeed: string, awaySeed: string): { home: string; away: string } {
  const homeHue = avoidGrass(teamHue(homeSeed));
  let awayHue = avoidGrass(teamHue(awaySeed));
  let gap = Math.abs(homeHue - awayHue);
  if (gap > 180) gap = 360 - gap;
  if (gap < 80) awayHue = avoidGrass((homeHue + 150) % 360);
  return { home: colorFromHue(homeHue), away: colorFromHue(awayHue) };
}
