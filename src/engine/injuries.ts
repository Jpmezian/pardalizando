import type { Player } from '@/types';
import type { Rng } from './rng';

export const INJURY_CHANCE = 0.06;

export interface InjuryEvent {
  playerId: string;
  playerName: string;
  /** Jogos fora dentro da temporada (flavor). */
  matches: number;
  /** Temporadas indisponível a partir da próxima (0 = volta já). 99 = carreira encerrada. */
  seasonsOut: number;
  /** Grave (>= 1 temporada) — ganha pôster/animação. */
  serious: boolean;
  headline: string;
}

type ShortTemplate = (name: string, matches: number) => string;
type LongTemplate = (name: string, seasons: number) => string;
type EndTemplate = (name: string) => string;

const MINOR: ShortTemplate[] = [
  (n, m) => `${n} sentiu a coxa e desfalca por ${m} jogos.`,
  (n, m) => `${n} torceu o tornozelo — fora por ${m} jogos.`,
  (n, m) => `${n} com fadiga muscular; ${m} jogos no departamento médico.`,
  (n, m) => `${n} levou uma pancada feia e fica de fora por ${m} jogos.`,
];

const MODERATE: ShortTemplate[] = [
  (n, m) => `${n} estirou a posterior e some por ${m} jogos.`,
  (n, m) => `${n} machucou o joelho — ${m} jogos parado.`,
];

const SERIOUS: LongTemplate[] = [
  (n) => `GRAVE: ${n} rompeu o ligamento e perde a próxima temporada inteira.`,
  (n, s) => `${n} fraturou a perna — fora por ${s} temporada(s).`,
  (n, s) => `${n} sofreu lesão séria no joelho; só volta daqui a ${s} temporada(s).`,
];

const CAREER: EndTemplate[] = [
  (n) => `${n} sofreu uma lesão devastadora e pendura as chuteiras de vez.`,
  (n) => `${n} não resiste à lesão e encerra a carreira mais cedo.`,
];

function pick<T>(items: T[], rng: Rng): T {
  return items[rng.int(0, items.length - 1)]!;
}

/** Sorteia lesões da temporada para um elenco. Raras; ~90% não passam de 1 temporada. */
export function generateSeasonInjuries(
  squad: Player[],
  rng: Rng,
  chance = INJURY_CHANCE,
): InjuryEvent[] {
  const events: InjuryEvent[] = [];

  for (const player of squad) {
    if (rng.next() > chance) continue;

    const roll = rng.next();
    let matches: number;
    let seasonsOut: number;
    let serious: boolean;
    let headline: string;

    if (roll < 0.8) {
      matches = rng.int(2, 8);
      seasonsOut = 0;
      serious = false;
      headline = pick(MINOR, rng)(player.name, matches);
    } else if (roll < 0.92) {
      matches = rng.int(9, 20);
      seasonsOut = 0;
      serious = false;
      headline = pick(MODERATE, rng)(player.name, matches);
    } else if (roll < 0.985) {
      matches = 38;
      seasonsOut = 1;
      serious = true;
      headline = pick(SERIOUS, rng)(player.name, 1);
    } else if (rng.next() < 0.5) {
      matches = 38;
      seasonsOut = 99;
      serious = true;
      headline = pick(CAREER, rng)(player.name);
    } else {
      matches = 38;
      seasonsOut = rng.int(2, 3);
      serious = true;
      headline = pick(SERIOUS, rng)(player.name, seasonsOut);
    }

    events.push({ playerId: player.id, playerName: player.name, matches, seasonsOut, serious, headline });
  }

  return events;
}
