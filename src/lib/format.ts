import type { Player, Position } from '@/types';

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

/** Ordem de exibição setor a setor (do gol pro ataque). */
export const POSITION_ORDER: Record<Position, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Goleiros',
  DF: 'Defesa',
  MF: 'Meio-campo',
  FW: 'Ataque',
};

/** Rótulo de adaptação a uma posição, a partir da penalidade (1.0 → ideal). */
export function fitLabel(penalty: number): string {
  if (penalty >= 1) return 'Ideal';
  if (penalty >= 0.92) return 'Bom';
  if (penalty >= 0.75) return 'Adaptado';
  return 'Ruim';
}

export function fitColorClass(penalty: number): string {
  if (penalty >= 1) return 'text-accent';
  if (penalty >= 0.92) return 'text-ink';
  if (penalty >= 0.75) return 'text-ink-muted';
  return 'text-live';
}

/** Ano-base da primeira temporada (alinhado ao dataset FC 26). */
export const BASE_SEASON_YEAR = 2025;

/** Rótulo de ano da temporada, ex.: temporada 1 → "2025/26". */
export function seasonYearLabel(season: number): string {
  const start = BASE_SEASON_YEAR + Math.max(0, season - 1);
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Capitão = jogador de maior OVR do elenco. */
export function findCaptainId(squad: string[], players: Record<string, Player>): string | null {
  let captainId: string | null = null;
  let bestOvr = -1;
  for (const playerId of squad) {
    const player = players[playerId];
    if (player && player.ovr > bestOvr) {
      bestOvr = player.ovr;
      captainId = playerId;
    }
  }
  return captainId;
}

const SHORT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Data fictícia de uma rodada, espalhada de ago a mai da temporada. */
export function roundDateLabel(roundIndex: number, totalRounds: number, season: number): string {
  const startYear = BASE_SEASON_YEAR + Math.max(0, season - 1);
  const calendar = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5];
  const fraction = totalRounds > 1 ? roundIndex / (totalRounds - 1) : 0;
  const month = calendar[Math.min(calendar.length - 1, Math.floor(fraction * calendar.length))]!;
  const day = 1 + (roundIndex % 4) * 7;
  const year = month >= 8 ? startYear : startYear + 1;
  return `${day} ${SHORT_MONTHS[month - 1]} ${year}`;
}
