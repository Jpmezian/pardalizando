interface PosterProps {
  kicker: string;
  title: string;
  subtitle?: string;
}

/** Pôster comemorativo (troféu ou prêmio): brilho varrendo + entrada animada. */
export function Poster({ kicker, title, subtitle }: PosterProps): JSX.Element {
  return (
    <div
      className="poster-rise poster-shine relative overflow-hidden border border-accent bg-surface px-5 py-6 text-center"
      style={{ boxShadow: '0 0 40px -12px var(--c-accent)' }}
    >
      <p className="font-display text-xs font-bold uppercase tracking-broadcast text-accent">
        {kicker}
      </p>
      <p className="mt-3 font-display text-2xl font-extrabold uppercase leading-none">{title}</p>
      {subtitle ? <p className="mt-2 font-sans text-sm text-ink-muted">{subtitle}</p> : null}
    </div>
  );
}
