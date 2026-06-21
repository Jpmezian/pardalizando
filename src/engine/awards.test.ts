import { describe, it, expect } from 'vitest';
import type { Player, PlayerSeasonStats, Position, SubPos } from '@/types';
import { computeSeasonAwards } from './awards';

function player(id: string, pos: Position, subPos: SubPos, age: number): Player {
  return { id, name: id, clubId: 'c', pos, subPos, ovr: 80, pot: 85, age, value: 0, form: 0 };
}

function stats(goals: number, assists: number, cleanSheets: number, apps = 30): PlayerSeasonStats {
  return { apps, goals, assists, ratingSum: apps * 7, cleanSheets };
}

describe('computeSeasonAwards', () => {
  const players: Record<string, Player> = {
    striker: player('striker', 'FW', 'ST', 27),
    winger: player('winger', 'FW', 'RW', 24),
    keeper: player('keeper', 'GK', 'GK', 29),
    kid: player('kid', 'MF', 'AM', 19),
  };
  const seasonStats: Record<string, PlayerSeasonStats> = {
    striker: stats(25, 5, 0),
    winger: stats(8, 18, 0),
    keeper: stats(0, 0, 16),
    kid: stats(12, 6, 0),
  };

  it('escolhe artilheiro, garçom e luva de ouro corretamente', () => {
    const awards = computeSeasonAwards(players, seasonStats);
    expect(awards.topScorer?.playerId).toBe('striker');
    expect(awards.topAssist?.playerId).toBe('winger');
    expect(awards.goldenGlove?.playerId).toBe('keeper');
  });

  it('joia da temporada respeita o limite de idade', () => {
    const awards = computeSeasonAwards(players, seasonStats);
    expect(awards.youngPlayer?.playerId).toBe('kid');
  });

  it('ignora quem não entrou em campo', () => {
    const awards = computeSeasonAwards(
      { striker: players.striker! },
      { striker: stats(0, 0, 0, 0) },
    );
    expect(awards.mvp).toBeNull();
  });
});
