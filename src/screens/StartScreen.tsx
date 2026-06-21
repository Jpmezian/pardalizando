import { useRef, type ChangeEvent } from 'react';
import { useGameStore } from '@/store/gameStore';
import { LEAGUES } from '@/data/loaders';
import { exportSaveToFile, importSaveFromFile } from '@/save/transfer';
import { BroadcastButton } from '@/components/BroadcastButton';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { AdSlot } from '@/components/AdSlot';

export function StartScreen(): JSX.Element {
  const hasSave = useGameStore((state) => state.hasSave);
  const saveChecked = useGameStore((state) => state.saveChecked);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const continueGame = useGameStore((state) => state.continueGame);

  const handleStartNewGame = (): void => {
    void startNewGame();
  };

  const handleContinue = (): void => {
    void continueGame();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (): void => {
    void exportSaveToFile();
  };

  const handleImportChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const imported = await importSaveFromFile(file);
    if (imported) await continueGame();
  };

  const saveStatusLabel = !saveChecked
    ? 'Verificando save neste navegador…'
    : hasSave
      ? 'Save encontrado — dá pra continuar de onde parou.'
      : 'Nenhuma temporada salva ainda.';

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar rightLabel="Temporada 25/26" />

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-8 px-5 py-6 lg:grid-cols-[1.5fr_1fr] lg:gap-0 lg:px-8">
        <section className="lg:pr-12">
          <p className="mb-6 flex items-center gap-3 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
            <span className="signal-dot h-2.5 w-2.5 bg-accent" aria-hidden="true" />
            Temporada 25/26 · Modo carreira
          </p>

          <h1 className="font-display font-extrabold uppercase leading-none tracking-tight">
            <span className="block whitespace-nowrap text-[clamp(2.25rem,12vw,7rem)] text-accent">
              Pardalizando
            </span>
          </h1>

          <p className="mt-7 max-w-md font-sans text-lg leading-relaxed text-ink-muted">
            Erga um clube à glória ou construa um <span className="text-ink">reinado</span> com um
            gigante. Liga, copa e continental — conquiste do seu jeito, uma temporada de cada vez.
          </p>

          <AdSlot format="Patrocínio" size="468×60" className="mt-9 h-20 w-full max-w-md" />
        </section>

        <aside className="border-t border-line bg-surface lg:border-l lg:border-t-0">
          <div className="border-b border-line px-6 py-4">
            <h2 className="flex items-center gap-3 font-display text-xl font-bold uppercase tracking-wide">
              <span className="h-5 w-1.5 bg-accent" aria-hidden="true" />
              Iniciar
            </h2>
          </div>

          <div className="flex flex-col gap-3 px-6 py-6">
            <BroadcastButton variant="primary" onClick={handleStartNewGame}>
              Novo jogo
            </BroadcastButton>
            <BroadcastButton variant="ghost" onClick={handleContinue} disabled={!hasSave}>
              Continuar
            </BroadcastButton>
            <p className="mt-1 font-sans text-sm text-ink-faint">{saveStatusLabel}</p>

            <div className="mt-2 flex gap-4 border-t border-line pt-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={!hasSave}
                className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Exportar save
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:text-ink"
              >
                Importar save
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="border-t border-line p-4">
            <AdSlot format="Box" size="300×250" className="h-44 w-full" />
          </div>
        </aside>
      </main>

      <div className="mx-auto w-full max-w-6xl px-5 pb-8 lg:px-8">
        <AdSlot format="Leaderboard" size="728×90" className="h-24 w-full" />
      </div>

      <LeagueRail />
    </div>
  );
}

function LeagueRail(): JSX.Element {
  return (
    <footer className="border-t border-line px-5 py-4 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3">
        <span className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
          Ligas disponíveis
        </span>
        <ul className="flex flex-wrap gap-2">
          {LEAGUES.map((league) => (
            <li
              key={league.id}
              className="flex items-center gap-2 border border-line px-2.5 py-1"
            >
              <span className="font-display text-sm font-bold tracking-wide text-accent">
                {league.code}
              </span>
              <span className="font-sans text-sm text-ink-muted">{league.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
