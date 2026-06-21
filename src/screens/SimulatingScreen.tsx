import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AdSlot } from '@/components/AdSlot';

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
    <div className="flex min-h-screen flex-col bg-bg px-5 text-ink">
      <div className="flex flex-1 flex-col items-center justify-center">
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

        <AdSlot
          format="Patrocínio da transmissão"
          size="728×90"
          className="mt-10 h-20 w-full max-w-xl"
        />
      </div>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-3 pb-6 sm:grid-cols-4">
        {['Sua marca', 'Anuncie aqui', 'Sua marca', 'Anuncie aqui'].map((label, index) => (
          <AdSlot key={index} format="Placa LED" label={label} className="h-20" />
        ))}
      </div>
    </div>
  );
}
