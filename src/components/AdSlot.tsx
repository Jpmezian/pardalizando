interface AdSlotProps {
  /** Tipo do espaço (ex.: "Leaderboard", "Box", "Patrocínio"). */
  format?: string;
  /** Dimensão sugerida (ex.: "728×90"). */
  size?: string;
  /** Texto central do placeholder. */
  label?: string;
  className?: string;
}

/**
 * Espaço publicitário vago — placeholder no estilo placa de patrocínio de transmissão.
 * Borda tracejada + tag "Publicidade" sinalizam inventário disponível pra marcas.
 */
export function AdSlot({
  format = 'Publicidade',
  size,
  label = 'Seu anúncio aqui',
  className = '',
}: AdSlotProps): JSX.Element {
  const meta = [format, size].filter(Boolean).join(' · ');

  return (
    <div
      aria-label="Espaço publicitário disponível"
      className={`relative flex flex-col items-center justify-center gap-1 border border-dashed border-line bg-surface px-4 py-4 text-center ${className}`}
    >
      <span className="absolute left-2 top-2 flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-broadcast text-ink-faint">
        <span className="h-2.5 w-1 bg-accent" aria-hidden="true" />
        Publicidade
      </span>
      <span className="font-display text-lg font-bold uppercase leading-none tracking-wide text-ink-muted">
        {label}
      </span>
      {meta ? <span className="font-sans text-xs text-ink-faint">{meta}</span> : null}
    </div>
  );
}
