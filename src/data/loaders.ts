import type { Continent, LeagueId } from '@/types';

/**
 * Metadados estáticos das ligas — fatos, não dependem do dataset. Os elencos
 * reais (clubes/jogadores) vêm de `dataset.ts`, que lê os JSONs gerados por
 * `scripts/build-data.mjs`.
 */
export interface LeaguePreview {
  id: LeagueId;
  name: string;
  /** Código de 3 letras, estilo placar de transmissão. */
  code: string;
  /** Continente — define a copa continental (Champions x Libertadores). */
  continent: Continent;
}

export const LEAGUES: readonly LeaguePreview[] = [
  { id: 'premier-league', name: 'Premier League', code: 'ENG', continent: 'europe' },
  { id: 'la-liga', name: 'La Liga', code: 'ESP', continent: 'europe' },
  { id: 'serie-a', name: 'Serie A', code: 'ITA', continent: 'europe' },
  { id: 'bundesliga', name: 'Bundesliga', code: 'GER', continent: 'europe' },
  { id: 'ligue-1', name: 'Ligue 1', code: 'FRA', continent: 'europe' },
  { id: 'eredivisie', name: 'Eredivisie', code: 'NED', continent: 'europe' },
  { id: 'primeira-liga', name: 'Primeira Liga', code: 'POR', continent: 'europe' },
  { id: 'super-lig', name: 'Süper Lig', code: 'TUR', continent: 'europe' },
  { id: 'allsvenskan', name: 'Allsvenskan', code: 'SWE', continent: 'europe' },
  { id: 'super-league-gr', name: 'Super League', code: 'GRE', continent: 'europe' },
  { id: 'brasileirao', name: 'Brasileirão', code: 'BRA', continent: 'south-america' },
  { id: 'liga-argentina', name: 'Liga Argentina', code: 'ARG', continent: 'south-america' },
  { id: 'primera-uruguay', name: 'Primera Uruguai', code: 'URU', continent: 'south-america' },
  { id: 'primera-chile', name: 'Primera Chile', code: 'CHI', continent: 'south-america' },
  { id: 'primera-venezuela', name: 'Primera Venezuela', code: 'VEN', continent: 'south-america' },
  { id: 'primera-colombia', name: 'Primera A Colômbia', code: 'COL', continent: 'south-america' },
  { id: 'primera-paraguay', name: 'Primera Paraguai', code: 'PAR', continent: 'south-america' },
];

const CONTINENT_BY_LEAGUE = new Map<LeagueId, Continent>(
  LEAGUES.map((league) => [league.id, league.continent]),
);

export function continentOf(leagueId: LeagueId): Continent {
  return CONTINENT_BY_LEAGUE.get(leagueId) ?? 'europe';
}
