interface ReputationPipsProps {
  value: number;
}

/** Reputação 1–5 do clube como barras (sem depender só de cor: tem aria-label). */
export function ReputationPips({ value }: ReputationPipsProps): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Reputação ${value} de 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={`pip-${index}`}
          className={`h-3.5 w-1.5 ${index < value ? 'bg-accent' : 'bg-line'}`}
        />
      ))}
    </span>
  );
}
