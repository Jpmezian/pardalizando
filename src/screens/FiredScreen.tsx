import { useGameStore } from '@/store/gameStore';
import { BroadcastButton } from '@/components/BroadcastButton';

export function FiredScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const restartCareer = useGameStore((state) => state.restartCareer);

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  const seasons = game ? game.history.length : 0;
  const titles = game ? game.history.filter((record) => record.champion).length : 0;
  const cups = game
    ? game.history.filter(
        (record) => record.nationalCupWon || record.championsWon || record.libertadoresWon,
      ).length
    : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-5 text-ink">
      <main className="w-full max-w-lg">
        <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-live">
          Comunicado da diretoria
        </p>
        <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none tracking-tight text-live lg:text-6xl">
          Você foi demitido
        </h1>
        <p className="mt-5 font-sans text-lg leading-relaxed text-ink-muted">
          A diretoria do <span className="text-ink">{managedClub?.name ?? 'clube'}</span> perdeu a
          confiança nos resultados e encerrou o seu ciclo. Acabou — mas toda carreira merece um
          recomeço.
        </p>

        <div className="mt-7 grid grid-cols-3 gap-3 border-y border-line py-5 text-center">
          <Stat label="Temporadas" value={seasons} />
          <Stat label="Títulos de liga" value={titles} />
          <Stat label="Copas" value={cups} />
        </div>

        <div className="mt-7">
          <BroadcastButton variant="primary" onClick={restartCareer}>
            Começar nova carreira
          </BroadcastButton>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div>
      <p className="font-display text-4xl font-extrabold leading-none tabular-nums text-accent">
        {value}
      </p>
      <p className="mt-1 font-sans text-xs uppercase tracking-broadcast text-ink-faint">{label}</p>
    </div>
  );
}
