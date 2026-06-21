import { describe, it, expect } from 'vitest';
import type { GameState, Player } from '@/types';
import { createRng } from './rng';
import { progressPlayer, progressSeason } from './progression';

function mk(id: string, clubId: string, age: number, ovr: number, pot: number): Player {
  return { id, name: id, clubId, pos: 'MF', subPos: 'CM', ovr, pot, age, value: 1_000_000, form: 0 };
}

function makeGame(): GameState {
  const players: Record<string, Player> = {};
  const mySquad: string[] = [];
  const aiSquad: string[] = [];
  for (let i = 0; i < 11; i += 1) {
    const id = `me${i}`;
    players[id] = mk(id, 'me', 25, 80, 85);
    mySquad.push(id);
  }
  for (let i = 0; i < 10; i += 1) {
    const id = `ai${i}`;
    players[id] = mk(id, 'ai', 25, 75, 80);
    aiSquad.push(id);
  }
  players.aiOld = mk('aiOld', 'ai', 36, 70, 70);
  aiSquad.push('aiOld');

  return {
    seed: 1,
    dataVersion: 'test',
    managedClubId: 'me',
    currentSeason: 1,
    phase: 'lineup',
    lineup: null,
    clubs: {
      me: { id: 'me', name: 'Me', leagueId: 'premier-league', squad: mySquad, budget: 0, reputation: 4 },
      ai: { id: 'ai', name: 'AI', leagueId: 'premier-league', squad: aiSquad, budget: 0, reputation: 3 },
    },
    players,
    history: [],
    packs: { goldenTickets: 0, goldPity: 0 },
  };
}

describe('progressPlayer', () => {
  it('envelhece e limpa os stats da temporada', () => {
    const next = progressPlayer(mk('p', 'c', 25, 80, 85), createRng(1));
    expect(next.age).toBe(26);
    expect(next.seasonStats).toBeUndefined();
    expect(next.ovr).toBeGreaterThanOrEqual(40);
    expect(next.ovr).toBeLessThanOrEqual(99);
  });

  it('jovem abaixo do potencial não regride', () => {
    const young = progressPlayer(mk('p', 'c', 19, 75, 88), createRng(3));
    expect(young.ovr).toBeGreaterThanOrEqual(75);
  });

  it('veterano declina', () => {
    const veteran = progressPlayer(mk('p', 'c', 34, 80, 80), createRng(3));
    expect(veteran.ovr).toBeLessThanOrEqual(80);
  });
});

describe('progressSeason', () => {
  it('avança a temporada, preserva os jogadores do clube e traz 1 joia da base', () => {
    const result = progressSeason(makeGame(), createRng(1));
    expect(result.currentSeason).toBe(2);
    // 11 originais preservados + 1 joia da academia.
    expect(result.clubs.me!.squad).toHaveLength(12);
    expect(result.clubs.me!.squad.some((id) => id.startsWith('youth-'))).toBe(true);
    expect(result.players.me0!.age).toBe(26);
  });

  it('a IA aposenta veteranos e repõe com crias', () => {
    const result = progressSeason(makeGame(), createRng(1));
    expect(result.players.aiOld).toBeUndefined();
    expect(result.clubs.ai!.squad).toHaveLength(11);
    expect(result.clubs.ai!.squad.some((id) => id.startsWith('regen-'))).toBe(true);
  });

  it('a IA movimenta o mercado entre seus clubes', () => {
    const players: Record<string, Player> = {};
    const squads: Record<string, string[]> = { me: [], ai1: [], ai2: [] };
    for (const club of ['me', 'ai1', 'ai2']) {
      for (let i = 0; i < 13; i += 1) {
        const id = `${club}-${i}`;
        players[id] = mk(id, club, 25, 75, 80);
        squads[club]!.push(id);
      }
    }
    const game: GameState = {
      seed: 7,
      dataVersion: 'test',
      managedClubId: 'me',
      currentSeason: 1,
      phase: 'lineup',
      lineup: null,
      clubs: {
        me: { id: 'me', name: 'Me', leagueId: 'premier-league', squad: squads.me!, budget: 0, reputation: 4 },
        ai1: { id: 'ai1', name: 'AI1', leagueId: 'premier-league', squad: squads.ai1!, budget: 0, reputation: 3 },
        ai2: { id: 'ai2', name: 'AI2', leagueId: 'premier-league', squad: squads.ai2!, budget: 0, reputation: 3 },
      },
      players,
      history: [],
      packs: { goldenTickets: 0, goldPity: 0 },
    };

    const result = progressSeason(game, createRng(5));
    const ai1HasForeign = result.clubs.ai1!.squad.some((id) => id.startsWith('ai2-'));
    const ai2HasForeign = result.clubs.ai2!.squad.some((id) => id.startsWith('ai1-'));
    expect(ai1HasForeign || ai2HasForeign).toBe(true);
  });
});
