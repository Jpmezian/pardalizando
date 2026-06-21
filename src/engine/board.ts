/**
 * Diretoria & stakes: cada temporada tem um objetivo (pela reputação do clube) e
 * uma confiança que sobe quando você cumpre e despenca quando falha. Zerou = demissão.
 * Dá o "medo de dar errado" que faltava ao loop.
 */

export const BOARD_START = 55;
export const BOARD_MAX = 100;

export interface SeasonObjective {
  /** Pior posição final aceitável (terminou em <= target → cumpriu). */
  target: number;
  label: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Objetivo da diretoria pela reputação (1–5) e tamanho da liga. */
export function seasonObjective(reputation: number, clubCount: number): SeasonObjective {
  const r = clamp(Math.round(reputation), 1, 5);
  if (r >= 5) return { target: 1, label: 'Ser campeão da liga' };
  if (r === 4) {
    const top = Math.max(2, Math.round(clubCount * 0.2));
    return { target: top, label: `Terminar entre os ${top} primeiros` };
  }
  if (r === 3) {
    const half = Math.max(1, Math.floor(clubCount / 2));
    return { target: half, label: 'Terminar na primeira metade da tabela' };
  }
  if (r === 2) {
    const safe = Math.max(1, clubCount - 4);
    return { target: safe, label: 'Escapar das 4 últimas posições' };
  }
  const notLast = Math.max(1, clubCount - 1);
  return { target: notLast, label: 'Não terminar em último' };
}

export interface BoardVerdict {
  objective: SeasonObjective;
  position: number;
  met: boolean;
  delta: number;
  confidenceBefore: number;
  confidenceAfter: number;
  fired: boolean;
}

/**
 * Avalia a temporada: cumpriu o alvo → confiança sobe (bônus por superar);
 * falhou → cai mais quanto mais longe ficou do alvo. Confiança em 0 = demitido.
 */
export function evaluateBoard(
  reputation: number,
  clubCount: number,
  position: number,
  confidence: number,
): BoardVerdict {
  const objective = seasonObjective(reputation, clubCount);
  const margin = objective.target - position; // >= 0 cumpriu/superou
  const met = margin >= 0;
  const delta = met ? Math.min(25, 10 + margin * 3) : Math.max(-55, -12 + margin * 10);
  const confidenceAfter = clamp(confidence + delta, 0, BOARD_MAX);
  return {
    objective,
    position,
    met,
    delta,
    confidenceBefore: confidence,
    confidenceAfter,
    fired: confidenceAfter <= 0,
  };
}
