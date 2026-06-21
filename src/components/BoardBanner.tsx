import { BOARD_MAX, seasonObjective } from '@/engine/board';

interface BoardBannerProps {
  reputation: number;
  clubCount: number;
  confidence: number;
}

function moodLabel(confidence: number): string {
  if (confidence >= 70) return 'Diretoria confiante';
  if (confidence >= 40) return 'Diretoria observando';
  if (confidence >= 20) return 'Pressão na cadeira';
  return 'Beira da demissão';
}

/** Faixa com o objetivo da temporada e a barra de confiança da diretoria. */
export function BoardBanner({ reputation, clubCount, confidence }: BoardBannerProps): JSX.Element {
  const objective = seasonObjective(reputation, clubCount);
  const pct = Math.max(0, Math.min(100, (confidence / BOARD_MAX) * 100));
  const safe = confidence >= 30;

  return (
    <div className="border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
            Objetivo da diretoria
          </p>
          <p className="mt-0.5 font-display text-lg font-bold uppercase leading-none">
            {objective.label}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`font-sans text-xs font-semibold uppercase tracking-broadcast ${safe ? 'text-ink-faint' : 'text-live'}`}
          >
            {moodLabel(confidence)}
          </p>
          <p className="font-display text-2xl font-extrabold leading-none tabular-nums">
            {Math.round(confidence)}
            <span className="text-sm text-ink-faint">/100</span>
          </p>
        </div>
      </div>
      <div className="mt-2 h-2 bg-surface-raised">
        <div className={`h-full ${safe ? 'bg-accent' : 'bg-live'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
