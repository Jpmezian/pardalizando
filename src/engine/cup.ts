import type { Rng } from './rng';
import type { SectorStrength } from './ratings';
import { simulateMatch } from './match';

export interface CupEntrant {
  clubId: string;
  strength: SectorStrength;
}

export interface CupTie {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  winnerId: string;
  /** Decidido nos pênaltis (empate no tempo normal). */
  penalties: boolean;
  /** Passou direto (adversário fictício de chave ímpar). */
  bye: boolean;
}

export interface CupRound {
  name: string;
  ties: CupTie[];
}

export interface CupResult {
  championId: string | null;
  rounds: CupRound[];
}

const BYE = '__bye__';

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
    case 32:
      return 'Fase de 32';
    default:
      return `Fase de ${teamsInRound}`;
  }
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

function nextPowerOfTwo(n: number): number {
  let power = 1;
  while (power < n) power *= 2;
  return power;
}

const NO_STRENGTH: SectorStrength = { atk: 0, mid: 0, def: 0 };

/** Mata-mata de eliminação simples. Empate vai pra pênaltis (moeda levemente puxada pela força). */
export function simulateKnockout(entrants: CupEntrant[], rng: Rng): CupResult {
  if (entrants.length < 2) {
    return { championId: entrants[0]?.clubId ?? null, rounds: [] };
  }

  const padded: CupEntrant[] = [...entrants];
  const target = nextPowerOfTwo(entrants.length);
  while (padded.length < target) {
    padded.push({ clubId: BYE, strength: NO_STRENGTH });
  }

  let alive = shuffle(padded, rng);
  const rounds: CupRound[] = [];

  while (alive.length > 1) {
    const ties: CupTie[] = [];
    const advancing: CupEntrant[] = [];

    for (let i = 0; i < alive.length; i += 2) {
      const home = alive[i]!;
      const away = alive[i + 1]!;

      if (home.clubId === BYE || away.clubId === BYE) {
        const real = home.clubId === BYE ? away : home;
        advancing.push(real);
        if (real.clubId !== BYE) {
          ties.push({
            homeId: home.clubId,
            awayId: away.clubId,
            homeGoals: 0,
            awayGoals: 0,
            winnerId: real.clubId,
            penalties: false,
            bye: true,
          });
        }
        continue;
      }

      const match = simulateMatch(home.strength, away.strength, rng);
      let winner = home;
      let penalties = false;
      if (match.homeGoals > match.awayGoals) {
        winner = home;
      } else if (match.homeGoals < match.awayGoals) {
        winner = away;
      } else {
        penalties = true;
        const homeForce = home.strength.atk + home.strength.mid + home.strength.def;
        const awayForce = away.strength.atk + away.strength.mid + away.strength.def;
        const homeChance = homeForce / (homeForce + awayForce || 1);
        winner = rng.next() < homeChance ? home : away;
      }

      ties.push({
        homeId: home.clubId,
        awayId: away.clubId,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        winnerId: winner.clubId,
        penalties,
        bye: false,
      });
      advancing.push(winner);
    }

    rounds.push({ name: roundName(alive.length), ties });
    alive = advancing;
  }

  return { championId: alive[0]?.clubId ?? null, rounds };
}
