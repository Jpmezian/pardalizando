import type { Rng } from './rng';
import type { SectorStrength } from './ratings';
import { simulateMatch } from './match';
import type { CupEntrant, CupRound, CupTie } from './cup';

export interface GroupRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface GroupMatch {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface CompetitionGroup {
  name: string;
  table: GroupRow[];
  matches: GroupMatch[];
}

export interface CompetitionResult {
  groups: CompetitionGroup[];
  knockout: CupRound[];
  championId: string | null;
}

const GROUP_SIZE = 4;
const MAX_GROUPS = 8;
const BYE = '__bye__';

function force(strength: SectorStrength): number {
  return strength.atk + strength.mid + strength.def;
}

function emptyRow(clubId: string): GroupRow {
  return { clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

function applyMatch(home: GroupRow, away: GroupRow, homeGoals: number, awayGoals: number): void {
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

function rankGroup(rows: GroupRow[]): GroupRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.clubId.localeCompare(b.clubId),
  );
}

function playGroup(teams: CupEntrant[], rng: Rng): CompetitionGroup {
  const table = new Map(teams.map((team) => [team.clubId, emptyRow(team.clubId)]));
  const matches: GroupMatch[] = [];

  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      const home = teams[i]!;
      const away = teams[j]!;
      const result = simulateMatch(home.strength, away.strength, rng);
      applyMatch(table.get(home.clubId)!, table.get(away.clubId)!, result.homeGoals, result.awayGoals);
      matches.push({
        homeId: home.clubId,
        awayId: away.clubId,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
      });
    }
  }

  return { name: '', table: rankGroup([...table.values()]), matches };
}

function roundName(teamsInRound: number): string {
  switch (teamsInRound) {
    case 2:
      return 'Final';
    case 4:
      return 'Semifinal';
    case 8:
      return 'Quartas de final';
    case 16:
      return 'Oitavas de final';
    default:
      return `Fase de ${teamsInRound}`;
  }
}

function nextPowerOfTwo(n: number): number {
  let power = 1;
  while (power < n) power *= 2;
  return power;
}

/** Mata-mata preservando a ordem do chaveamento (sem sorteio). */
function runBracket(seeded: CupEntrant[], rng: Rng): { rounds: CupRound[]; championId: string | null } {
  if (seeded.length === 0) return { rounds: [], championId: null };

  const noStrength: SectorStrength = { atk: 0, mid: 0, def: 0 };
  let alive = [...seeded];
  const target = Math.max(2, nextPowerOfTwo(alive.length));
  while (alive.length < target) alive.push({ clubId: BYE, strength: noStrength });

  const rounds: CupRound[] = [];
  while (alive.length > 1) {
    const ties: CupTie[] = [];
    const advancing: CupEntrant[] = [];
    for (let i = 0; i < alive.length; i += 2) {
      const home = alive[i]!;
      const away = alive[i + 1]!;
      if (home.clubId === BYE || away.clubId === BYE) {
        advancing.push(home.clubId === BYE ? away : home);
        continue;
      }
      const result = simulateMatch(home.strength, away.strength, rng);
      let winner = home;
      let penalties = false;
      if (result.homeGoals > result.awayGoals) winner = home;
      else if (result.homeGoals < result.awayGoals) winner = away;
      else {
        penalties = true;
        const homeForce = force(home.strength);
        const awayForce = force(away.strength);
        winner = rng.next() < homeForce / (homeForce + awayForce || 1) ? home : away;
      }
      ties.push({
        homeId: home.clubId,
        awayId: away.clubId,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
        winnerId: winner.clubId,
        penalties,
        bye: false,
      });
      advancing.push(winner);
    }
    rounds.push({ name: roundName(alive.length), ties });
    alive = advancing;
  }

  return { rounds, championId: alive[0]?.clubId ?? null };
}

/**
 * Competição continental: fase de grupos (grupos de 4, pontos corridos) → os 2
 * melhores de cada grupo avançam pro mata-mata. Como Champions / Libertadores.
 */
export function simulateCompetition(entrants: CupEntrant[], rng: Rng): CompetitionResult {
  const sorted = [...entrants].sort((a, b) => force(b.strength) - force(a.strength));
  const groupCount = Math.min(MAX_GROUPS, Math.floor(sorted.length / GROUP_SIZE));

  if (groupCount < 2) {
    const bracket = runBracket(sorted.slice(0, 16), rng);
    return { groups: [], knockout: bracket.rounds, championId: bracket.championId };
  }

  const field = sorted.slice(0, groupCount * GROUP_SIZE);
  const groupTeams: CupEntrant[][] = Array.from({ length: groupCount }, () => []);
  field.forEach((entrant, index) => {
    groupTeams[index % groupCount]!.push(entrant);
  });

  const groups: CompetitionGroup[] = [];
  const winners: CupEntrant[] = [];
  const runners: CupEntrant[] = [];

  groupTeams.forEach((teams, index) => {
    const group = playGroup(teams, rng);
    group.name = `Grupo ${String.fromCharCode(65 + index)}`;
    groups.push(group);
    const first = teams.find((team) => team.clubId === group.table[0]?.clubId);
    const second = teams.find((team) => team.clubId === group.table[1]?.clubId);
    if (first) winners.push(first);
    if (second) runners.push(second);
  });

  const bracketTeams: CupEntrant[] = [];
  for (let i = 0; i < winners.length; i += 1) {
    bracketTeams.push(winners[i]!);
    const runner = runners[(i + 1) % runners.length];
    if (runner) bracketTeams.push(runner);
  }

  const bracket = runBracket(bracketTeams, rng);
  return { groups, knockout: bracket.rounds, championId: bracket.championId };
}
