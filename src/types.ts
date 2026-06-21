/**
 * Modelo de dados do jogo (spec §4.1).
 * Tudo aqui é dado puro e serializável — entra inteiro no save (IndexedDB).
 */

export type LeagueId =
  | 'premier-league'
  | 'la-liga'
  | 'serie-a'
  | 'bundesliga'
  | 'ligue-1'
  | 'eredivisie'
  | 'primeira-liga'
  | 'super-lig'
  | 'allsvenskan'
  | 'super-league-gr'
  | 'brasileirao'
  | 'liga-argentina'
  | 'primera-uruguay'
  | 'primera-chile'
  | 'primera-venezuela'
  | 'primera-colombia'
  | 'primera-paraguay';

export type Continent = 'europe' | 'south-america';

export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export type SubPos =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'DM'
  | 'CM'
  | 'AM'
  | 'LW'
  | 'RW'
  | 'ST';

export type FormationId = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2';

export type GamePhase = 'lineup' | 'season' | 'results' | 'market';

export type Rarity = 'bronze' | 'prata' | 'ouro' | 'lendario';

export interface PlayerSeasonStats {
  apps: number;
  goals: number;
  assists: number;
  /** Soma de notas; média = ratingSum / apps. */
  ratingSum: number;
  cleanSheets: number;
}

export interface Player {
  id: string;
  name: string;
  clubId: string;
  /** País do jogador (ex.: "Brazil"), quando disponível no dataset. */
  nationality?: string;
  pos: Position;
  subPos: SubPos;
  /** Overall 40–99 (número próprio do jogo, não "oficial"). */
  ovr: number;
  /** Potencial: teto de evolução. */
  pot: number;
  age: number;
  /** Valor de mercado, derivado de ovr + idade. */
  value: number;
  /** Forma -3..+3, re-sorteada por temporada. */
  form: number;
  /** Temporadas fora por lesão (> 0 = indisponível). */
  injuredSeasons?: number;
  seasonStats?: PlayerSeasonStats;
}

export interface Club {
  id: string;
  name: string;
  leagueId: LeagueId;
  /** ids de jogadores. */
  squad: string[];
  budget: number;
  /** Reputação 1–5: afeta scouting e preços. */
  reputation: number;
}

export interface League {
  id: LeagueId;
  name: string;
  clubIds: string[];
}

/** Slot da formação: posição ideal + (opcional) jogador escalado. */
export interface LineupSlot {
  subPos: SubPos;
  playerId: string | null;
}

export interface Lineup {
  formation: FormationId;
  slots: LineupSlot[];
  /** Banco de reservas (ids de jogadores fora do XI). */
  bench: string[];
}

export interface SeasonRecord {
  season: number;
  leagueId: LeagueId;
  finalPosition: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  champion: boolean;
  nationalCupWon?: boolean;
  championsWon?: boolean;
  libertadoresWon?: boolean;
}

/** Inventário do mercado: moeda dupla (spec §6.1). */
export interface PackInventory {
  /** Moeda premium fictícia ganha por conquistas. */
  goldenTickets: number;
  /** Aberturas de pacote Ouro sem item alto — alimenta o pity timer. */
  goldPity: number;
}

export interface GameState {
  seed: number;
  dataVersion: string;
  managedClubId: string | null;
  currentSeason: number;
  phase: GamePhase;
  lineup: Lineup | null;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  history: SeasonRecord[];
  packs: PackInventory;
  /** Confiança da diretoria (0–100). Zerou = demitido. Default 55 em saves antigos. */
  boardConfidence?: number;
  /** Ids (do dataset) de jogadores que vieram pro seu time e saíram do clube original. */
  transferredOut?: string[];
}
