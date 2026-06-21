import { describe, it, expect } from 'vitest';
import type { GameState, LeagueId } from '@/types';
import { sliceLeague } from '@/data/dataset';
import { createRng } from './rng';
import { generateSchedule, simulateSeason, standingsFromRounds } from './season';

function gameFromLeague(leagueId: LeagueId): GameState {
  const { clubs, players } = sliceLeague(leagueId);
  return {
    seed: 1,
    dataVersion: 'test',
    managedClubId: Object.keys(clubs)[0]!,
    currentSeason: 1,
    phase: 'season',
    lineup: null,
    clubs,
    players,
    history: [],
    packs: { goldenTickets: 0, goldPity: 0 },
  };
}

describe('generateSchedule', () => {
  it('par: todos contra todos, ida e volta, mando equilibrado', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const fixtures = generateSchedule(ids);
    expect(fixtures).toHaveLength(12); // N*(N-1)

    const games: Record<string, number> = {};
    const homeGames: Record<string, number> = {};
    for (const [home, away] of fixtures) {
      games[home] = (games[home] ?? 0) + 1;
      games[away] = (games[away] ?? 0) + 1;
      homeGames[home] = (homeGames[home] ?? 0) + 1;
    }
    for (const id of ids) {
      expect(games[id]).toBe(6); // 2*(N-1)
      expect(homeGames[id]).toBe(3);
    }
  });

  it('ímpar: ninguém fica sem jogar (bye some)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const fixtures = generateSchedule(ids);
    expect(fixtures).toHaveLength(20); // 5*4
    const games: Record<string, number> = {};
    for (const [home, away] of fixtures) {
      games[home] = (games[home] ?? 0) + 1;
      games[away] = (games[away] ?? 0) + 1;
    }
    for (const id of ids) expect(games[id]).toBe(8);
  });
});

describe('simulateSeason', () => {
  it('é determinística: mesma seed → mesma tabela e stats', () => {
    const game = gameFromLeague('ligue-1');
    const a = simulateSeason(game, null, createRng(123));
    const b = simulateSeason(game, null, createRng(123));
    expect(a.table).toEqual(b.table);
    expect(a.stats).toEqual(b.stats);
  });

  it('tabela coerente: gols batem, todos jogam, pontos conferem', () => {
    const game = gameFromLeague('ligue-1');
    const clubCount = Object.keys(game.clubs).length;
    const outcome = simulateSeason(game, null, createRng(7));

    expect(outcome.table).toHaveLength(clubCount);

    const totalFor = outcome.table.reduce((sum, row) => sum + row.goalsFor, 0);
    const totalAgainst = outcome.table.reduce((sum, row) => sum + row.goalsAgainst, 0);
    expect(totalFor).toBe(totalAgainst);

    for (const row of outcome.table) {
      expect(row.played).toBe(2 * (clubCount - 1));
      expect(row.points).toBe(row.won * 3 + row.drawn);
      expect(row.won + row.drawn + row.lost).toBe(row.played);
    }
  });

  it('sanidade: o time mais forte termina perto do topo na média (dados reais)', () => {
    const game = gameFromLeague('la-liga');
    const seasons = 5;
    let positionSum = 0;
    for (let s = 0; s < seasons; s += 1) {
      const outcome = simulateSeason(game, null, createRng(100 + s));
      const position = outcome.table.findIndex((row) => row.clubId === 'real-madrid') + 1;
      expect(position).toBeGreaterThan(0); // Real Madrid existe na tabela
      positionSum += position;
    }
    expect(positionSum / seasons).toBeLessThanOrEqual(6);
  });

  it('replay: a tabela reconstruída das rodadas bate com a final', () => {
    const game = gameFromLeague('ligue-1');
    const clubIds = Object.keys(game.clubs);
    const outcome = simulateSeason(game, null, createRng(9));

    expect(outcome.rounds).toHaveLength(2 * (clubIds.length - 1));
    expect(standingsFromRounds(outcome.rounds, clubIds)).toEqual(outcome.table);
  });
});
