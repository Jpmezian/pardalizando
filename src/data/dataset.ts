import type { Club, LeagueId, Player } from '@/types';
import { LEAGUES } from '@/data/loaders';
import clubsJson from './generated/clubs.json';
import playersJson from './generated/players.json';
import metaJson from './generated/meta.json';

/**
 * Dataset embarcado: clubes/jogadores gerados por `scripts/build-data.mjs`.
 * O JSON é fronteira de confiança — o script garante o formato; aqui só
 * validamos a forma de leve e tratamos como tipos do domínio.
 */
const ALL_CLUBS = clubsJson as unknown as Club[];
const ALL_PLAYERS = playersJson as unknown as Player[];

export const DATA_VERSION: string = (metaJson as { dataVersion: string }).dataVersion;
export const DATA_SOURCE: string = (metaJson as { source: string }).source;

const CLUBS_BY_ID = new Map<string, Club>(ALL_CLUBS.map((club) => [club.id, club]));
const PLAYERS_BY_ID = new Map<string, Player>(ALL_PLAYERS.map((player) => [player.id, player]));

(function assertDatasetShape(): void {
  const sampleClub = ALL_CLUBS[0];
  const samplePlayer = ALL_PLAYERS[0];
  if (!sampleClub || !samplePlayer || !Array.isArray(sampleClub.squad) || typeof samplePlayer.ovr !== 'number') {
    throw new Error('Dataset inválido. Rode `npm run data:fixture` (ou `npm run data:build <csv>`).');
  }
})();

export interface LeagueSummary {
  id: LeagueId;
  name: string;
  code: string;
  clubCount: number;
  avgOvr: number;
}

export function getClub(clubId: string): Club | undefined {
  return CLUBS_BY_ID.get(clubId);
}

/** Pool global (todas as ligas) — usado pelo mercado pra sortear jogadores nos pacotes. */
export function getAllPlayers(): Player[] {
  return ALL_PLAYERS;
}

export function getClubsByLeague(leagueId: LeagueId): Club[] {
  return ALL_CLUBS.filter((club) => club.leagueId === leagueId);
}

export function getClubPlayers(club: Club): Player[] {
  return club.squad
    .map((playerId) => PLAYERS_BY_ID.get(playerId))
    .filter((player): player is Player => player !== undefined)
    .sort((a, b) => b.ovr - a.ovr);
}

export function clubAverageOvr(club: Club): number {
  const players = getClubPlayers(club);
  if (players.length === 0) return 0;
  return Math.round(players.reduce((sum, player) => sum + player.ovr, 0) / players.length);
}

export function getLeagueSummaries(): LeagueSummary[] {
  return LEAGUES.map((league) => {
    const clubs = getClubsByLeague(league.id);
    const ovrs = clubs.flatMap((club) => getClubPlayers(club)).map((player) => player.ovr);
    const avgOvr =
      ovrs.length > 0 ? Math.round(ovrs.reduce((sum, ovr) => sum + ovr, 0) / ovrs.length) : 0;
    return {
      id: league.id,
      name: league.name,
      code: league.code,
      clubCount: clubs.length,
      avgOvr,
    };
  });
}

/** Recorta uma liga inteira (clubes + jogadores) pra montar um novo jogo. */
export function sliceLeague(leagueId: LeagueId): {
  clubs: Record<string, Club>;
  players: Record<string, Player>;
} {
  const clubs: Record<string, Club> = {};
  const players: Record<string, Player> = {};
  for (const club of getClubsByLeague(leagueId)) {
    clubs[club.id] = club;
    for (const player of getClubPlayers(club)) {
      players[player.id] = player;
    }
  }
  return { clubs, players };
}
