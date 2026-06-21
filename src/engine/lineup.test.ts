import { describe, it, expect } from 'vitest';
import type { GameState, LeagueId } from '@/types';
import { sliceLeague } from '@/data/dataset';
import { buildLineup, clubStrength, lineupStrength } from './lineup';
import { simulateMatch } from './match';
import { createRng } from './rng';

function gameFromLeague(leagueId: LeagueId): GameState {
  const { clubs, players } = sliceLeague(leagueId);
  const managedClubId = Object.keys(clubs)[0]!;
  return {
    seed: 1,
    dataVersion: 'test',
    managedClubId,
    currentSeason: 1,
    phase: 'lineup',
    lineup: null,
    clubs,
    players,
    history: [],
    packs: { goldenTickets: 0, goldPity: 0 },
  };
}

describe('fluxo de partida com dados reais', () => {
  it('monta o XI, calcula a força e simula um placar válido', () => {
    const game = gameFromLeague('la-liga');
    const clubIds = Object.keys(game.clubs);

    const lineup = buildLineup(game, game.managedClubId!, '4-3-3');
    expect(lineup.slots).toHaveLength(11);

    const myStrength = lineupStrength(game, lineup);
    expect(myStrength.atk).toBeGreaterThan(40);
    expect(myStrength.def).toBeGreaterThan(40);

    const opponent = game.clubs[clubIds[1]!]!;
    const result = simulateMatch(myStrength, clubStrength(game, opponent), createRng(1));

    expect(Number.isInteger(result.homeGoals)).toBe(true);
    expect(Number.isInteger(result.awayGoals)).toBe(true);
    expect(result.homeGoals).toBeGreaterThanOrEqual(0);
    expect(result.awayGoals).toBeGreaterThanOrEqual(0);
  });
});
