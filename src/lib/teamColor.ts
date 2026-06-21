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

export function colorFromHue(hue: number): string {
  return `oklch(0.64 0.2 ${hue})`;
}

/** Par de cores contrastantes pra casa/visitante (gira o visitante se colidir). */
export function teamColorPair(homeSeed: string, awaySeed: string): { home: string; away: string } {
  const homeHue = teamHue(homeSeed);
  let awayHue = teamHue(awaySeed);
  let gap = Math.abs(homeHue - awayHue);
  if (gap > 180) gap = 360 - gap;
  if (gap < 55) awayHue = (homeHue + 150) % 360;
  return { home: colorFromHue(homeHue), away: colorFromHue(awayHue) };
}
