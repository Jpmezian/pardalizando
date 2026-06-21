import type { GameState, LeagueId, Lineup, Player, PlayerSeasonStats, SubPos } from '@/types';
import type { Rng } from './rng';
import {
  applySectorBias,
  effectiveOvr,
  pickBestXI,
  teamStrength,
  type FilledSlot,
  type SectorStrength,
} from './ratings';
import { formationBias, formationSubPositions } from './formations';
import { lineupFilledSlots } from './lineup';
import { simulateMatch } from './match';

export interface TableRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface MatchResultRow {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  /** Ids dos jogadores que marcaram (pra artilharia ao vivo no replay). */
  homeScorers: string[];
  awayScorers: string[];
  /** Ids de quem deu assistência. */
  homeAssisters: string[];
  awayAssisters: string[];
}

export type RoundResult = MatchResultRow[];

export interface SeasonOutcome {
  season: number;
  leagueId: LeagueId;
  /** Tabela final ordenada — a posição é o índice + 1. */
  table: TableRow[];
  /** Resultados rodada a rodada (pro replay). */
  rounds: RoundResult[];
  /** Stats da temporada por jogador que entrou em campo. */
  stats: Record<string, PlayerSeasonStats>;
}

// Pesos de quem marca / dá assistência, por posição no XI (× OVR efetivo).
const SCORER_WEIGHT: Record<SubPos, number> = {
  ST: 1.0, LW: 0.8, RW: 0.8, AM: 0.65, CM: 0.32, DM: 0.12, LB: 0.08, RB: 0.08, CB: 0.05, GK: 0,
};
const ASSIST_WEIGHT: Record<SubPos, number> = {
  AM: 1.0, LW: 0.95, RW: 0.95, CM: 0.8, ST: 0.55, DM: 0.45, LB: 0.5, RB: 0.5, CB: 0.15, GK: 0.02,
};

interface WeightedPick {
  playerId: string;
  weight: number;
}

interface ClubEntry {
  clubId: string;
  strength: SectorStrength;
  xi: FilledSlot[];
  scorerPicker: WeightedPick[];
  assistPicker: WeightedPick[];
}

function isDefensive(subPos: SubPos): boolean {
  return subPos === 'GK' || subPos === 'CB' || subPos === 'LB' || subPos === 'RB';
}

function buildEntry(clubId: string, xi: FilledSlot[], bias?: SectorStrength): ClubEntry {
  const base = teamStrength(xi);
  return {
    clubId,
    strength: bias ? applySectorBias(base, bias) : base,
    xi,
    scorerPicker: xi.map((slot) => ({
      playerId: slot.player.id,
      weight: SCORER_WEIGHT[slot.subPos] * effectiveOvr(slot.player, slot.subPos) ** 2,
    })),
    assistPicker: xi.map((slot) => ({
      playerId: slot.player.id,
      weight: ASSIST_WEIGHT[slot.subPos] * effectiveOvr(slot.player, slot.subPos),
    })),
  };
}

function weightedPick(items: WeightedPick[], rng: Rng, exclude?: string): string | null {
  let total = 0;
  for (const item of items) if (item.playerId !== exclude) total += item.weight;
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const item of items) {
    if (item.playerId === exclude) continue;
    r -= item.weight;
    if (r <= 0) return item.playerId;
  }
  return null;
}

function emptyStats(): PlayerSeasonStats {
  return { apps: 0, goals: 0, assists: 0, ratingSum: 0, cleanSheets: 0 };
}

function emptyRow(clubId: string): TableRow {
  return { clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

/** Expande um mapa {jogador → gols} numa lista de ids (um por gol). */
function expandScorers(goalMap: Map<string, number>): string[] {
  const scorers: string[] = [];
  for (const [playerId, count] of goalMap) {
    for (let i = 0; i < count; i += 1) scorers.push(playerId);
  }
  return scorers;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function matchRating(
  subPos: SubPos,
  scored: number,
  conceded: number,
  goals: number,
  assists: number,
): number {
  let rating = 6;
  rating += scored > conceded ? 0.4 : scored < conceded ? -0.3 : 0;
  rating += goals * 0.9 + assists * 0.4;
  if (isDefensive(subPos)) {
    if (conceded === 0) rating += 0.5;
    else if (conceded >= 3) rating -= 0.4;
  }
  return clamp(rating, 4, 10);
}

function applyMatch(home: TableRow, away: TableRow, homeGoals: number, awayGoals: number): void {
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;
  if (homeGoals > awayGoals) {
    home.won += 1;
    home.points += 3;
    away.lost += 1;
  } else if (homeGoals < awayGoals) {
    away.won += 1;
    away.points += 3;
    home.lost += 1;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.points += 1;
    away.points += 1;
  }
}

function sortTable(rows: TableRow[]): TableRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.clubId.localeCompare(b.clubId),
  );
}

/** Calendário em rodadas (método do círculo): ida e volta, todos contra todos. */
export function scheduleRounds(clubIds: string[]): Array<Array<[string, string]>> {
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) teams.push('__bye__');
  const half = teams.length / 2;
  const rotation = [...teams];
  const firstLeg: Array<Array<[string, string]>> = [];

  for (let round = 0; round < teams.length - 1; round += 1) {
    const fixtures: Array<[string, string]> = [];
    for (let i = 0; i < half; i += 1) {
      const home = rotation[i]!;
      const away = rotation[teams.length - 1 - i]!;
      if (home !== '__bye__' && away !== '__bye__') {
        fixtures.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    firstLeg.push(fixtures);
    rotation.splice(1, 0, rotation.pop()!);
  }

  const secondLeg = firstLeg.map((fixtures) =>
    fixtures.map(([home, away]) => [away, home] as [string, string]),
  );
  return [...firstLeg, ...secondLeg];
}

export function generateSchedule(clubIds: string[]): Array<[string, string]> {
  return scheduleRounds(clubIds).flat();
}

/** Reconstrói a classificação a partir de um conjunto de rodadas (usado no replay). */
export function standingsFromRounds(rounds: RoundResult[], clubIds: string[]): TableRow[] {
  const table = new Map(clubIds.map((id) => [id, emptyRow(id)]));
  for (const round of rounds) {
    for (const match of round) {
      const home = table.get(match.homeId);
      const away = table.get(match.awayId);
      if (home && away) applyMatch(home, away, match.homeGoals, match.awayGoals);
    }
  }
  return sortTable([...table.values()]);
}

function buildXi(game: GameState, clubId: string, lineup: Lineup | null): FilledSlot[] {
  if (lineup && clubId === game.managedClubId) {
    return lineupFilledSlots(game, lineup);
  }
  const club = game.clubs[clubId];
  const players: Player[] = club
    ? club.squad
        .map((id) => game.players[id])
        .filter((player): player is Player => player !== undefined)
    : [];
  return pickBestXI(players, formationSubPositions('4-3-3'));
}

/** Simula a temporada inteira: força do XI vs adversário, rodada a rodada. */
export function simulateSeason(game: GameState, lineup: Lineup | null, rng: Rng): SeasonOutcome {
  const clubIds = Object.keys(game.clubs);
  const entries = new Map<string, ClubEntry>();
  const table = new Map<string, TableRow>();
  const stats = new Map<string, PlayerSeasonStats>();

  for (const clubId of clubIds) {
    const bias =
      lineup && clubId === game.managedClubId ? formationBias(lineup.formation) : undefined;
    entries.set(clubId, buildEntry(clubId, buildXi(game, clubId, lineup), bias));
    table.set(clubId, emptyRow(clubId));
  }

  const getStat = (playerId: string): PlayerSeasonStats => {
    let stat = stats.get(playerId);
    if (!stat) {
      stat = emptyStats();
      stats.set(playerId, stat);
    }
    return stat;
  };

  const recordSide = (
    entry: ClubEntry,
    scored: number,
    conceded: number,
    perMatchGoals: Map<string, number>,
    perMatchAssists: Map<string, number>,
  ): void => {
    for (const slot of entry.xi) {
      const stat = getStat(slot.player.id);
      const goals = perMatchGoals.get(slot.player.id) ?? 0;
      const assists = perMatchAssists.get(slot.player.id) ?? 0;
      stat.apps += 1;
      stat.goals += goals;
      stat.assists += assists;
      if (conceded === 0 && isDefensive(slot.subPos)) stat.cleanSheets += 1;
      stat.ratingSum += matchRating(slot.subPos, scored, conceded, goals, assists);
    }
  };

  const distribute = (entry: ClubEntry, goals: number): [Map<string, number>, Map<string, number>] => {
    const goalMap = new Map<string, number>();
    const assistMap = new Map<string, number>();
    for (let g = 0; g < goals; g += 1) {
      const scorer = weightedPick(entry.scorerPicker, rng);
      if (!scorer) continue;
      goalMap.set(scorer, (goalMap.get(scorer) ?? 0) + 1);
      if (rng.next() < 0.75) {
        const assister = weightedPick(entry.assistPicker, rng, scorer);
        if (assister) assistMap.set(assister, (assistMap.get(assister) ?? 0) + 1);
      }
    }
    return [goalMap, assistMap];
  };

  const rounds: RoundResult[] = [];
  for (const roundFixtures of scheduleRounds(clubIds)) {
    const roundResult: RoundResult = [];
    for (const [homeId, awayId] of roundFixtures) {
      const home = entries.get(homeId)!;
      const away = entries.get(awayId)!;
      const result = simulateMatch(home.strength, away.strength, rng);

      applyMatch(table.get(homeId)!, table.get(awayId)!, result.homeGoals, result.awayGoals);

      const [homeGoals, homeAssists] = distribute(home, result.homeGoals);
      const [awayGoals, awayAssists] = distribute(away, result.awayGoals);
      recordSide(home, result.homeGoals, result.awayGoals, homeGoals, homeAssists);
      recordSide(away, result.awayGoals, result.homeGoals, awayGoals, awayAssists);

      roundResult.push({
        homeId,
        awayId,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
        homeScorers: expandScorers(homeGoals),
        awayScorers: expandScorers(awayGoals),
        homeAssisters: expandScorers(homeAssists),
        awayAssisters: expandScorers(awayAssists),
      });
    }
    rounds.push(roundResult);
  }

  const managedClub = game.managedClubId ? game.clubs[game.managedClubId] : undefined;
  const fallbackClubId = clubIds[0];
  const leagueId: LeagueId =
    managedClub?.leagueId ??
    (fallbackClubId ? game.clubs[fallbackClubId]?.leagueId : undefined) ??
    'premier-league';

  return {
    season: game.currentSeason,
    leagueId,
    table: sortTable([...table.values()]),
    rounds,
    stats: Object.fromEntries(stats),
  };
}
