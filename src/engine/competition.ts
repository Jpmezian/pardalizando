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

const LEAGUE_PHASE_ROUNDS = 8; // cada time joga 8 jogos (modelo suíço atual da Champions)
const LEAGUE_PHASE_SIZE = 36;

/** Fase de liga (modelo suíço): tabela ÚNICA; cada time joga N adversários distintos. */
function leaguePhase(field: CupEntrant[], rng: Rng): { table: GroupRow[]; matches: GroupMatch[] } {
  const table = new Map(field.map((team) => [team.clubId, emptyRow(team.clubId)]));
  const strengthOf = new Map(field.map((team) => [team.clubId, team.strength]));
  const matches: GroupMatch[] = [];

  // Calendário pelo método do círculo, pegando só os primeiros N rounds.
  const ids = field.map((team) => team.clubId);
  if (ids.length % 2 !== 0) ids.push(BYE);
  const n = ids.length;
  const arr = [...ids];
  const rounds = Math.min(LEAGUE_PHASE_ROUNDS, n - 1);
  for (let r = 0; r < rounds; r += 1) {
    for (let i = 0; i < n / 2; i += 1) {
      const homeId = arr[i]!;
      const awayId = arr[n - 1 - i]!;
      if (homeId === BYE || awayId === BYE) continue;
      const result = simulateMatch(strengthOf.get(homeId)!, strengthOf.get(awayId)!, rng);
      applyMatch(table.get(homeId)!, table.get(awayId)!, result.homeGoals, result.awayGoals);
      matches.push({ homeId, awayId, homeGoals: result.homeGoals, awayGoals: result.awayGoals });
    }
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, arr[0]!, ...rest);
  }

  return { table: rankGroup([...table.values()]), matches };
}

/**
 * Competição continental no formato ATUAL (Champions 2024+): fase de liga (modelo
 * suíço — 36 times, 8 jogos, tabela única) → top 8 vão direto às oitavas, 9º–24º
 * jogam um playoff, 25º–36º eliminados → mata-mata até a final.
 */
export function simulateCompetition(entrants: CupEntrant[], rng: Rng): CompetitionResult {
  const sorted = [...entrants].sort((a, b) => force(b.strength) - force(a.strength));

  if (sorted.length < 8) {
    const bracket = runBracket(sorted.slice(0, 16), rng);
    return { groups: [], knockout: bracket.rounds, championId: bracket.championId };
  }

  const field = sorted.slice(0, LEAGUE_PHASE_SIZE);
  const phase = leaguePhase(field, rng);
  const byId = new Map(field.map((team) => [team.clubId, team]));
  const ranked = phase.table
    .map((row) => byId.get(row.clubId))
    .filter((team): team is CupEntrant => team !== undefined);

  const top = ranked.slice(0, 8); // direto às oitavas
  const playoffSeeds = ranked.slice(8, 24); // 9º–24º disputam o playoff
  const knockout: CupRound[] = [];

  // Playoff: 9º vs 24º, 10º vs 23º, ...
  const playoffWinners: CupEntrant[] = [];
  if (playoffSeeds.length >= 2) {
    const ties: CupTie[] = [];
    const half = Math.floor(playoffSeeds.length / 2);
    for (let i = 0; i < half; i += 1) {
      const home = playoffSeeds[i]!;
      const away = playoffSeeds[playoffSeeds.length - 1 - i]!;
      const result = simulateMatch(home.strength, away.strength, rng);
      let winner = home;
      let penalties = false;
      if (result.homeGoals > result.awayGoals) winner = home;
      else if (result.homeGoals < result.awayGoals) winner = away;
      else {
        penalties = true;
        const hf = force(home.strength);
        const af = force(away.strength);
        winner = rng.next() < hf / (hf + af || 1) ? home : away;
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
      playoffWinners.push(winner);
    }
    knockout.push({ name: 'Playoff', ties });
  }

  // Oitavas em diante: top 8 + vencedores do playoff (intercalados: seed vs playoff).
  const bracketTeams: CupEntrant[] = [];
  const maxLen = Math.max(top.length, playoffWinners.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (top[i]) bracketTeams.push(top[i]!);
    if (playoffWinners[i]) bracketTeams.push(playoffWinners[i]!);
  }

  const bracket = runBracket(bracketTeams, rng);
  const group: CompetitionGroup = {
    name: 'Fase de liga',
    table: phase.table,
    matches: phase.matches,
  };
  return {
    groups: [group],
    knockout: [...knockout, ...bracket.rounds],
    championId: bracket.championId,
  };
}
