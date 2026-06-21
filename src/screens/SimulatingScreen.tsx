import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

const SIMULATION_MS = 6500;
const TEXT_INTERVAL_MS = 1300;

const HYPE_TEXTS = [
  'Bola rolando…',
  'Apitando os jogos…',
  'Apurando a artilharia…',
  'Subindo e descendo a tabela…',
  'Tirando o pó da taça…',
];

export function SimulatingScreen(): JSX.Element {
  const finishSimulating = useGameStore((state) => state.finishSimulating);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const done = setTimeout(() => finishSimulating(), SIMULATION_MS);
    const cycle = setInterval(() => {
      setTextIndex((index) => (index + 1) % HYPE_TEXTS.length);
    }, TEXT_INTERVAL_MS);
    return () => {
      clearTimeout(done);
      clearInterval(cycle);
    };
  }, [finishSimulating]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-5 text-ink">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div
          className="blob absolute h-40 w-40 opacity-90"
          style={{ backgroundColor: 'var(--c-accent)', filter: 'blur(2px)' }}
          aria-hidden="true"
        />
        <span className="signal-dot relative font-display text-2xl font-extrabold uppercase tracking-broadcast text-accent-ink">
          AO VIVO
        </span>
      </div>

      <p className="mt-10 h-6 font-display text-2xl font-bold uppercase tracking-wide">
        {HYPE_TEXTS[textIndex]}
      </p>
      <p className="mt-2 font-sans text-xs uppercase tracking-broadcast text-ink-faint">
        Simulando a temporada
      </p>

      <button
        type="button"
        onClick={finishSimulating}
        className="mt-10 border border-line px-5 py-2 font-sans text-sm font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:border-ink-faint hover:text-ink"
      >
        Pular
      </button>
    </div>
  );
}
