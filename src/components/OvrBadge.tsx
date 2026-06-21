interface OvrBadgeProps {
  ovr: number;
}

/** Selo de overall com hierarquia por faixa — o número que manda (spec, pilar 2). */
export function OvrBadge({ ovr }: OvrBadgeProps): JSX.Element {
  const tierClasses =
    ovr >= 85
      ? 'bg-accent text-accent-ink'
      : ovr >= 78
        ? 'bg-surface-raised text-accent'
        : 'bg-surface-raised text-ink-muted';

  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center font-display text-xl font-bold tabular-nums ${tierClasses}`}
    >
      {ovr}
    </span>
  );
}
