import { useGameStore } from '@/store/gameStore';
import { getLeagueSummaries } from '@/data/dataset';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { LeagueFlag, LeagueName } from '@/components/LeagueBadge';

export function LeagueSelectScreen(): JSX.Element {
  const selectLeague = useGameStore((state) => state.selectLeague);
  const backToStart = useGameStore((state) => state.backToStart);
  const summaries = getLeagueSummaries();

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backToStart} backLabel="Início" rightLabel="Novo jogo · 1 / 2" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 lg:px-8">
        <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-accent">
          Passo 1 de 2
        </p>
        <h1 className="mt-2 font-display text-5xl font-extrabold uppercase tracking-tight lg:text-6xl">
          Escolha a liga
        </h1>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((league) => (
            <li key={league.id}>
              <button
                type="button"
                onClick={() => selectLeague(league.id)}
                className="w-full border border-line bg-surface p-5 text-left transition-[border-color,background-color] duration-150 hover:border-accent hover:bg-surface-raised"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <LeagueFlag leagueId={league.id} className="h-5 w-7" />
                    <span className="font-display text-3xl font-extrabold tracking-wide text-accent">
                      {league.code}
                    </span>
                  </span>
                  <span className="font-sans text-xs uppercase tracking-broadcast text-ink-faint">
                    Média {league.avgOvr}
                  </span>
                </div>
                <LeagueName
                  leagueId={league.id}
                  name={league.name}
                  className="mt-4 block font-display text-2xl font-bold uppercase leading-none"
                />
                <div className="mt-1 font-sans text-sm text-ink-muted">
                  {league.clubCount} clubes
                </div>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
