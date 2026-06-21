export type CupKey =
  | 'champions'
  | 'europa'
  | 'conference'
  | 'libertadores'
  | 'sudamericana'
  | 'mundial'
  | 'national';

export type CupMotif = 'star' | 'shield' | 'globe' | 'cup';

/**
 * Identidade visual de cada competição — cores que evocam o visual real (sem usar
 * logos/marcas). Tudo em OKLCH. Aplicado no cinematic do jogo de copa.
 */
export interface CupTheme {
  label: string;
  /** Cor de fundo dominante da competição. */
  bg: string;
  /** Acento/destaque da competição. */
  accent: string;
  /** Texto sobre o acento. */
  accentInk: string;
  motif: CupMotif;
}

export const CUP_THEMES: Record<CupKey, CupTheme> = {
  // Champions: azul-noite estrelado.
  champions: {
    label: 'Champions',
    bg: 'oklch(0.22 0.09 265)',
    accent: 'oklch(0.86 0.06 255)',
    accentInk: 'oklch(0.2 0.08 265)',
    motif: 'star',
  },
  // Europa League: laranja sobre preto.
  europa: {
    label: 'Europa League',
    bg: 'oklch(0.2 0.02 60)',
    accent: 'oklch(0.74 0.18 55)',
    accentInk: 'oklch(0.18 0.04 60)',
    motif: 'star',
  },
  // Conference League: verde elétrico.
  conference: {
    label: 'Conference League',
    bg: 'oklch(0.24 0.06 165)',
    accent: 'oklch(0.82 0.18 160)',
    accentInk: 'oklch(0.2 0.05 165)',
    motif: 'shield',
  },
  // Libertadores: dourado/glória sul-americana.
  libertadores: {
    label: 'Libertadores',
    bg: 'oklch(0.24 0.05 95)',
    accent: 'oklch(0.83 0.16 92)',
    accentInk: 'oklch(0.2 0.05 95)',
    motif: 'cup',
  },
  // Sudamericana: laranja-avermelhado.
  sudamericana: {
    label: 'Sudamericana',
    bg: 'oklch(0.22 0.04 40)',
    accent: 'oklch(0.72 0.19 40)',
    accentInk: 'oklch(0.18 0.04 40)',
    motif: 'shield',
  },
  // Mundial de Clubes: ouro sobre carvão.
  mundial: {
    label: 'Mundial de Clubes',
    bg: 'oklch(0.2 0.03 90)',
    accent: 'oklch(0.85 0.15 90)',
    accentInk: 'oklch(0.18 0.04 90)',
    motif: 'globe',
  },
  // Copa Nacional: identidade de transmissão (verde-gramado).
  national: {
    label: 'Copa Nacional',
    bg: 'oklch(0.2 0.014 255)',
    accent: 'oklch(0.86 0.19 128)',
    accentInk: 'oklch(0.22 0.06 132)',
    motif: 'cup',
  },
};
