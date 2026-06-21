import { describe, it, expect } from 'vitest';
import type { Player, PlayerSeasonStats, Position, SubPos } from '@/types';
import type { CompetitionResult } from './competition';
import { computeSeasonAwards } from './awards';

function player(id: string, pos: Position, subPos: SubPos, age: number): Player {
  return { id, name: id, clubId: 'c', pos, subPos, ovr: 80, pot: 85, age, value: 0, form: 0 };
}

function stats(goals: number, assists: number, cleanSheets: number, apps = 30): PlayerSeasonStats {
  return { apps, goals, assists, ratingSum: apps * 7, cleanSheets };
}

describe('computeSeasonAwards', () => {
  const players: Player[] = [
    player('striker', 'FW', 'ST', 27),
    player('winger', 'FW', 'RW', 24),
    player('keeper', 'GK', 'GK', 29),
    player('kid', 'MF', 'AM', 19),
  ];
  const seasonStats: Record<string, PlayerSeasonStats> = {
    striker: stats(25, 5, 0),
    winger: stats(8, 18, 0),
    keeper: stats(0, 0, 16),
    kid: stats(12, 6, 0),
  };

  it('escolhe artilheiro, garçom e luva de ouro corretamente', () => {
    const awards = computeSeasonAwards(players, seasonStats);
    expect(awards.topScorer?.player.id).toBe('striker');
    expect(awards.topAssist?.player.id).toBe('winger');
    expect(awards.goldenGlove?.player.id).toBe('keeper');
  });

  it('joia da temporada respeita o limite de idade', () => {
    const awards = computeSeasonAwards(players, seasonStats);
    expect(awards.youngPlayer?.player.id).toBe('kid');
  });

  it('ignora quem não entrou em campo', () => {
    const awards = computeSeasonAwards([players[0]!], { striker: stats(0, 0, 0, 0) });
    expect(awards.mvp).toBeNull();
  });

  it('Bola de Ouro vai pro craque do campeão da Champions, não pro artilheiro da liga local', () => {
    const local = player('local-striker', 'FW', 'ST', 27);
    const star = player('ucl-star', 'FW', 'ST', 27);
    star.clubId = 'bigclub';
    star.ovr = 91;
    const champions: CompetitionResult = {
      groups: [],
      knockout: [
        {
          name: 'Final',
          ties: [
            {
              homeId: 'bigclub',
              awayId: 'other',
              homeGoals: 2,
              awayGoals: 1,
              winnerId: 'bigclub',
              penalties: false,
              bye: false,
            },
          ],
        },
      ],
      championId: 'bigclub',
    };
    const awards = computeSeasonAwards(
      [local, star],
      { 'local-striker': stats(25, 5, 0) },
      champions,
      null,
    );
    expect(awards.mvp?.player.id).toBe('ucl-star');
    expect(awards.mvp?.estimated).toBe(true);
  });
});
