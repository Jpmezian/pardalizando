import { describe, it, expect } from 'vitest';
import { LEAGUES } from './loaders';
import {
  getClubPlayers,
  getClubsByLeague,
  getLeagueSummaries,
  sliceLeague,
} from './dataset';

describe('dataset embarcado', () => {
  it('tem todas as ligas configuradas, com clubes', () => {
    const summaries = getLeagueSummaries();
    expect(summaries).toHaveLength(LEAGUES.length);
    for (const league of summaries) {
      expect(league.clubCount).toBeGreaterThan(0);
      expect(league.avgOvr).toBeGreaterThan(0);
    }
  });

  it('todo clube tem elenco jogável (>= 11) e referências íntegras', () => {
    for (const league of getLeagueSummaries()) {
      for (const club of getClubsByLeague(league.id)) {
        const players = getClubPlayers(club);
        expect(players.length).toBeGreaterThanOrEqual(11);
        expect(players.length).toBe(club.squad.length);
      }
    }
  });

  it('sliceLeague resolve todos os jogadores de cada clube da liga', () => {
    const { clubs, players } = sliceLeague('brasileirao');
    const clubIds = Object.keys(clubs);
    expect(clubIds.length).toBeGreaterThan(1);
    for (const clubId of clubIds) {
      for (const playerId of clubs[clubId]!.squad) {
        expect(players[playerId]).toBeDefined();
      }
    }
  });
});
