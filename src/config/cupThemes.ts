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
 * Identidade visual de cada competição — cores/brasão que evocam o visual real
 * (sem usar logos/marcas). Tudo em OKLCH. Aplicado no cinematic do jogo de copa.
 */
export interface CupTheme {
  label: string;
  /** Subtítulo curto pra reforçar a identidade (ex.: "Glória eterna"). */
  tagline: string;
  /** Cor de fundo dominante (escura) da competição. */
  bg: string;
  /** Acento/destaque da competição. */
  accent: string;
  /** Texto sobre o acento. */
  accentInk: string;
  motif: CupMotif;
}

export const CUP_THEMES: Record<CupKey, CupTheme> = {
  // Champions League: azul-noite + prata (a "starball").
  champions: {
    label: 'UEFA Champions League',
    tagline: 'A noite mais alta da Europa',
    bg: 'oklch(0.19 0.07 264)',
    accent: 'oklch(0.91 0.03 250)',
    accentInk: 'oklch(0.19 0.07 264)',
    motif: 'star',
  },
  // Europa League: laranja vivo sobre preto.
  europa: {
    label: 'UEFA Europa League',
    tagline: 'Quinta-feira é dia de Europa',
    bg: 'oklch(0.17 0.02 48)',
    accent: 'oklch(0.72 0.19 50)',
    accentInk: 'oklch(0.17 0.03 48)',
    motif: 'star',
  },
  // Conference League: verde-limão elétrico.
  conference: {
    label: 'UEFA Conference League',
    tagline: 'O caminho começa aqui',
    bg: 'oklch(0.21 0.05 168)',
    accent: 'oklch(0.84 0.19 150)',
    accentInk: 'oklch(0.2 0.05 168)',
    motif: 'shield',
  },
  // Libertadores: PRETO + OURO, a glória eterna.
  libertadores: {
    label: 'CONMEBOL Libertadores',
    tagline: 'A glória eterna',
    bg: 'oklch(0.16 0.02 92)',
    accent: 'oklch(0.82 0.16 90)',
    accentInk: 'oklch(0.16 0.03 92)',
    motif: 'cup',
  },
  // Sudamericana: laranja-avermelhado sobre carvão.
  sudamericana: {
    label: 'CONMEBOL Sudamericana',
    tagline: 'A outra metade do continente',
    bg: 'oklch(0.18 0.04 38)',
    accent: 'oklch(0.71 0.2 38)',
    accentInk: 'oklch(0.17 0.04 38)',
    motif: 'shield',
  },
  // Mundial de Clubes: ouro sobre azul profundo.
  mundial: {
    label: 'Mundial de Clubes',
    tagline: 'O melhor do planeta',
    bg: 'oklch(0.19 0.06 252)',
    accent: 'oklch(0.84 0.15 88)',
    accentInk: 'oklch(0.18 0.05 252)',
    motif: 'globe',
  },
  // Copa nacional: vermelho-drama de mata-mata (o NOME muda por país).
  national: {
    label: 'Copa Nacional',
    tagline: 'Mata-mata: quem vacila, cai',
    bg: 'oklch(0.19 0.04 22)',
    accent: 'oklch(0.66 0.2 25)',
    accentInk: 'oklch(0.97 0.01 25)',
    motif: 'shield',
  },
};

/** Nome real da copa nacional por liga — pra não ficar tudo "Copa Nacional". */
const NATIONAL_CUP_NAMES: Record<string, string> = {
  'premier-league': 'FA Cup',
  'la-liga': 'Copa del Rey',
  'serie-a': 'Coppa Italia',
  bundesliga: 'DFB-Pokal',
  'ligue-1': 'Coupe de France',
  eredivisie: 'KNVB Beker',
  'primeira-liga': 'Taça de Portugal',
  'super-lig': 'Türkiye Kupası',
  allsvenskan: 'Svenska Cupen',
  'super-league-gr': 'Copa da Grécia',
  brasileirao: 'Copa do Brasil',
  'liga-argentina': 'Copa Argentina',
  'primera-uruguay': 'Copa Uruguay',
  'primera-chile': 'Copa Chile',
  'primera-venezuela': 'Copa Venezuela',
  'primera-colombia': 'Copa Colombia',
  'primera-paraguay': 'Copa Paraguay',
};

export function nationalCupName(leagueId: string | undefined): string {
  return (leagueId && NATIONAL_CUP_NAMES[leagueId]) || 'Copa Nacional';
}
