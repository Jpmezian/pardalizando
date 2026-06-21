import type { Rng } from './rng';

export type ShotOutcome = 'goal' | 'save' | 'miss';
export type Side = 'home' | 'away';

/** Pool de finalizadores de um time (pesos por posição × overall). */
export interface PlayTeam {
  name: string;
  scorers: { name: string; weight: number }[];
}

export interface ShotMoment {
  minute: number;
  team: Side;
  shooter: string;
  outcome: ShotOutcome;
  scoreHome: number;
  scoreAway: number;
}

export interface MatchPlay {
  homeName: string;
  awayName: string;
  finalHome: number;
  finalAway: number;
  shots: ShotMoment[];
}

function pickShooter(team: PlayTeam, rng: Rng): string {
  const total = team.scorers.reduce((sum, s) => sum + s.weight, 0);
  if (total <= 0) return team.scorers[0]?.name ?? '—';
  let r = rng.next() * total;
  for (const scorer of team.scorers) {
    r -= scorer.weight;
    if (r <= 0) return scorer.name;
  }
  return team.scorers[team.scorers.length - 1]?.name ?? '—';
}

interface RawShot {
  minute: number;
  team: Side;
  shooter: string;
  outcome: ShotOutcome;
}

/**
 * Constrói a narração jogada-a-jogada de uma partida a partir do PLACAR FINAL.
 * Os gols são exatamente o placar; somam-se chutes sem gol (defesa/fora) pra dar
 * tensão. Determinístico pelo rng — re-assistir dá o mesmo jogo.
 */
export function buildMatchPlay(
  home: PlayTeam,
  away: PlayTeam,
  homeGoals: number,
  awayGoals: number,
  rng: Rng,
): MatchPlay {
  const shots: RawShot[] = [];

  const addGoals = (team: PlayTeam, side: Side, goals: number): void => {
    for (let g = 0; g < goals; g += 1) {
      shots.push({ minute: rng.int(1, 90), team: side, shooter: pickShooter(team, rng), outcome: 'goal' });
    }
  };
  const addMisses = (team: PlayTeam, side: Side, goals: number): void => {
    // Mais gols → mais chances criadas → mais chutes perdidos também.
    const extra = 2 + rng.int(0, 2) + Math.min(3, goals);
    for (let s = 0; s < extra; s += 1) {
      const outcome: ShotOutcome = rng.next() < 0.5 ? 'save' : 'miss';
      shots.push({ minute: rng.int(1, 90), team: side, shooter: pickShooter(team, rng), outcome });
    }
  };

  addGoals(home, 'home', homeGoals);
  addGoals(away, 'away', awayGoals);
  addMisses(home, 'home', homeGoals);
  addMisses(away, 'away', awayGoals);

  shots.sort((a, b) => a.minute - b.minute);

  // Placar correndo conforme os gols acontecem em ordem de minuto.
  let scoreHome = 0;
  let scoreAway = 0;
  const moments: ShotMoment[] = shots.map((shot) => {
    if (shot.outcome === 'goal') {
      if (shot.team === 'home') scoreHome += 1;
      else scoreAway += 1;
    }
    return {
      minute: shot.minute,
      team: shot.team,
      shooter: shot.shooter,
      outcome: shot.outcome,
      scoreHome,
      scoreAway,
    };
  });

  return {
    homeName: home.name,
    awayName: away.name,
    finalHome: homeGoals,
    finalAway: awayGoals,
    shots: moments,
  };
}

export interface ShootoutKick {
  team: Side;
  scored: boolean;
  /** Nome do batedor (atribuído na camada do store, que tem o elenco). */
  kicker?: string;
}

/**
 * Gera uma disputa de pênaltis plausível e determinística que termina com `winner`
 * vencendo. Melhor-de-5 + morte súbita, parando quando matematicamente decidido —
 * como na vida real. O placar é simétrico (mesma taxa de conversão), então mapeamos
 * o vencedor natural pro lado designado (troca os lados se preciso).
 */
export function buildShootout(winner: Side, rng: Rng): ShootoutKick[] {
  const MAKE_RATE = 0.75;
  const kicks: { team: Side; scored: boolean }[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let homeTaken = 0;
  let awayTaken = 0;

  const decided = (): boolean => {
    if (homeTaken <= 5 && awayTaken <= 5) {
      const homeLeft = 5 - homeTaken;
      const awayLeft = 5 - awayTaken;
      if (homeScore - awayScore > awayLeft) return true; // visitante não alcança
      if (awayScore - homeScore > homeLeft) return true; // mandante não alcança
      if (homeTaken === 5 && awayTaken === 5) return homeScore !== awayScore;
      return false;
    }
    // morte súbita: decide quando ambos bateram a mesma quantidade e diferem
    return homeTaken === awayTaken && homeScore !== awayScore;
  };

  let turn: Side = 'home';
  for (let i = 0; i < 40 && !decided(); i += 1) {
    const scored = rng.next() < MAKE_RATE;
    kicks.push({ team: turn, scored });
    if (turn === 'home') {
      homeTaken += 1;
      if (scored) homeScore += 1;
      turn = 'away';
    } else {
      awayTaken += 1;
      if (scored) awayScore += 1;
      turn = 'home';
    }
  }

  const naturalWinner: Side = homeScore >= awayScore ? 'home' : 'away';
  if (naturalWinner === winner) return kicks;
  return kicks.map((kick) => ({ team: kick.team === 'home' ? 'away' : 'home', scored: kick.scored }));
}
