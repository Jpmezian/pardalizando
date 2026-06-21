import { useEffect } from 'react';

interface TripleCrownOverlayProps {
  clubName: string;
  /** Nome da competição continental conquistada (ex.: "Champions"). */
  continentalLabel: string;
  onClose: () => void;
}

const GOLD = 'oklch(0.83 0.15 90)';
const CONFETTI = Array.from({ length: 16 }, (_, i) => i);

/**
 * Takeover de tela cheia ao conquistar a Tríplice Coroa (liga + copa + continental).
 * Pico emocional: revelação em crescendo + confete. Estética de transmissão.
 */
export function TripleCrownOverlay({
  clubName,
  continentalLabel,
  onClose,
}: TripleCrownOverlayProps): JSX.Element {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' || event.key === 'Enter') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trophies = [
    { kicker: 'Campeão da Liga', sub: 'Soberano em casa' },
    { kicker: 'Copa Nacional', sub: 'Mata-mata conquistado' },
    { kicker: continentalLabel, sub: 'Glória continental' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tríplice Coroa conquistada"
      className="fixed inset-0 z-[600] flex items-center justify-center overflow-hidden px-5"
      style={{ backgroundColor: 'oklch(0.12 0.02 255 / 0.97)' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 36%, oklch(0.86 0.19 128 / 0.16), transparent 62%)',
        }}
      />

      {CONFETTI.map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="confetti-piece absolute"
          style={{
            left: `${(i * 6.3 + 4) % 100}%`,
            animationDelay: `${(i % 6) * 0.32}s`,
            animationDuration: `${2.4 + (i % 4) * 0.45}s`,
            backgroundColor: i % 2 === 0 ? 'var(--c-accent)' : GOLD,
          }}
        />
      ))}

      <div className="relative w-full max-w-2xl text-center">
        <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-accent">
          Temporada histórica
        </p>
        <h1 className="tc-title mt-2 font-display text-6xl font-extrabold uppercase leading-[0.82] tracking-tight lg:text-8xl">
          Tríplice
          <br />
          Coroa
        </h1>
        <p className="mt-4 font-display text-2xl font-bold uppercase tracking-wide text-ink lg:text-3xl">
          {clubName}
        </p>
        <p className="mx-auto mt-2 max-w-md font-sans text-sm text-ink-muted">
          Liga, copa e continental na mesma temporada — só os maiores conseguem.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {trophies.map((trophy, index) => (
            <div
              key={trophy.kicker}
              className="poster-rise border border-line bg-surface p-4"
              style={{ animationDelay: `${0.2 + index * 0.18}s`, borderColor: GOLD }}
            >
              <p className="font-sans text-[10px] font-semibold uppercase tracking-broadcast text-accent">
                {trophy.kicker}
              </p>
              <p className="mt-1 font-display text-lg font-bold uppercase leading-none text-ink">
                {trophy.sub}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-9 border border-accent bg-accent px-8 py-3 font-display text-xl font-bold uppercase tracking-wide text-accent-ink transition-colors duration-150 hover:bg-accent-strong"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
