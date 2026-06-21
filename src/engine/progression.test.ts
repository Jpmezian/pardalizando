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
  it('avança a temporada e mantém o clube do jogador intacto', () => {
    const result = progressSeason(makeGame(), createRng(1));
    expect(result.currentSeason).toBe(2);
    expect(result.clubs.me!.squad).toHaveLength(11);
    expect(result.players.me0!.age).toBe(26);
  });

  it('a IA aposenta veteranos e repõe com crias', () => {
    const result = progressSeason(makeGame(), createRng(1));
    expect(result.players.aiOld).toBeUndefined();
    expect(result.clubs.ai!.squad).toHaveLength(11);
    expect(result.clubs.ai!.squad.some((id) => id.startsWith('regen-'))).toBe(true);
  });
});
