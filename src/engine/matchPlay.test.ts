import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { buildMatchPlay, buildShootout, type PlayTeam, type Side } from './matchPlay';

function team(name: string): PlayTeam {
  return {
    name,
    scorers: [
      { name: `${name}-ST`, weight: 100 },
      { name: `${name}-MF`, weight: 30 },
      { name: `${name}-DF`, weight: 5 },
    ],
  };
}

describe('buildMatchPlay', () => {
  it('os gols batem exatamente com o placar final', () => {
    const play = buildMatchPlay(team('A'), team('B'), 3, 1, createRng(1));
    expect(play.finalHome).toBe(3);
    expect(play.finalAway).toBe(1);
    const homeGoals = play.shots.filter((s) => s.team === 'home' && s.outcome === 'goal').length;
    const awayGoals = play.shots.filter((s) => s.team === 'away' && s.outcome === 'goal').length;
    expect(homeGoals).toBe(3);
    expect(awayGoals).toBe(1);
  });

  it('inclui chutes sem gol (defesa/fora) pra dar tensão', () => {
    const play = buildMatchPlay(team('A'), team('B'), 1, 0, createRng(2));
    expect(play.shots.some((s) => s.outcome === 'save' || s.outcome === 'miss')).toBe(true);
  });

  it('o placar corre em ordem de minuto e fecha no placar final', () => {
    const play = buildMatchPlay(team('A'), team('B'), 2, 2, createRng(3));
    for (let i = 1; i < play.shots.length; i += 1) {
      expect(play.shots[i]!.minute).toBeGreaterThanOrEqual(play.shots[i - 1]!.minute);
    }
    const last = play.shots[play.shots.length - 1]!;
    expect(last.scoreHome).toBe(2);
    expect(last.scoreAway).toBe(2);
  });

  it('é determinística: mesma seed → mesmos lances', () => {
    const a = buildMatchPlay(team('A'), team('B'), 2, 1, createRng(7));
    const b = buildMatchPlay(team('A'), team('B'), 2, 1, createRng(7));
    expect(a.shots).toEqual(b.shots);
  });
});

describe('buildShootout', () => {
  const tally = (kicks: { team: Side; scored: boolean }[], side: Side): number =>
    kicks.filter((k) => k.team === side && k.scored).length;

  it('o lado designado sempre vence a disputa', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const winner: Side = seed % 2 === 0 ? 'home' : 'away';
      const loser: Side = winner === 'home' ? 'away' : 'home';
      const kicks = buildShootout(winner, createRng(seed));
      expect(tally(kicks, winner)).toBeGreaterThan(tally(kicks, loser));
    }
  });

  it('é determinística: mesma seed → mesma disputa', () => {
    expect(buildShootout('home', createRng(3))).toEqual(buildShootout('home', createRng(3)));
  });

  it('para quando decidido (não passa de 5 cobranças por lado sem necessidade)', () => {
    const kicks = buildShootout('home', createRng(5));
    const homeTaken = kicks.filter((k) => k.team === 'home').length;
    const awayTaken = kicks.filter((k) => k.team === 'away').length;
    // morte súbita pode passar de 5, mas a diferença entre cobranças é no máximo 1.
    expect(Math.abs(homeTaken - awayTaken)).toBeLessThanOrEqual(1);
  });
});
