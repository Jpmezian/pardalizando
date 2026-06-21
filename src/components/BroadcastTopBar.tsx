interface BroadcastTopBarProps {
  rightLabel?: string;
  onBack?: () => void;
  backLabel?: string;
}

/** Faixa superior estilo lower-third, com voltar opcional. Reutilizada nas telas. */
export function BroadcastTopBar({
  rightLabel,
  onBack,
  backLabel = 'Voltar',
}: BroadcastTopBarProps): JSX.Element {
  return (
    <header className="flex items-center justify-between border-b border-line px-5 py-3 lg:px-8">
      <div className="flex items-center gap-5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:text-ink"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="square"
              aria-hidden="true"
            >
              <path d="M19 12H6M11 18l-6-6 6-6" />
            </svg>
            {backLabel}
          </button>
        ) : null}
        <span className="font-display text-lg font-extrabold uppercase tracking-wide">
          <span className="text-accent">Pardal</span>
          <span className="text-ink-muted">izando</span>
        </span>
      </div>
      {rightLabel ? (
        <span className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
          {rightLabel}
        </span>
      ) : null}
    </header>
  );
}
