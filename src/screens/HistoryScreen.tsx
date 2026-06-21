import { useGameStore } from '@/store/gameStore';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { MainNav } from '@/components/MainNav';
import { seasonYearLabel } from '@/lib/format';

export function HistoryScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const backToSquad = useGameStore((state) => state.backToSquad);

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  const history = game?.history ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backToSquad} backLabel="Elenco" rightLabel="Histórico" />
      <MainNav active="history" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-4 lg:px-8">
        <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
          {managedClub?.name ?? ''}
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight lg:text-4xl">
          Histórico
        </h1>

        {history.length === 0 ? (
          <p className="mt-8 font-sans text-ink-muted">
            Nenhuma temporada concluída ainda. Simule e avance uma temporada pra começar a escrever
            a história do clube.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse">
            <thead>
              <tr className="border-b border-line text-left font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
                <th className="py-2 pr-3 font-semibold">Temporada</th>
                <th className="py-2 pr-3 font-semibold">Posição</th>
                <th className="py-2 px-2 text-right font-semibold">V</th>
                <th className="py-2 px-2 text-right font-semibold">E</th>
                <th className="py-2 px-2 text-right font-semibold">D</th>
                <th className="py-2 px-2 text-right font-semibold">SG</th>
                <th className="py-2 px-2 text-right font-semibold">Pts</th>
                <th className="py-2 pl-2 font-semibold">Títulos</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((record) => (
                <tr key={record.season} className="border-b border-line tabular-nums">
                  <td className="py-2 pr-3 font-display font-bold">
                    {seasonYearLabel(record.season)}
                  </td>
                  <td className="py-2 pr-3 font-sans">
                    {record.champion ? (
                      <span className="font-bold text-accent">Campeão</span>
                    ) : (
                      `${record.finalPosition}º`
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-ink-muted">{record.won}</td>
                  <td className="py-2 px-2 text-right text-ink-muted">{record.drawn}</td>
                  <td className="py-2 px-2 text-right text-ink-muted">{record.lost}</td>
                  <td className="py-2 px-2 text-right text-ink-muted">
                    {record.goalsFor - record.goalsAgainst > 0
                      ? `+${record.goalsFor - record.goalsAgainst}`
                      : record.goalsFor - record.goalsAgainst}
                  </td>
                  <td className="py-2 px-2 text-right font-display text-lg font-bold">
                    {record.points}
                  </td>
                  <td className="py-2 pl-2">
                    <span className="flex flex-wrap gap-1">
                      {record.champion ? <TitleChip label="Liga" /> : null}
                      {record.nationalCupWon ? <TitleChip label="Copa" /> : null}
                      {record.championsWon ? <TitleChip label="Champ" /> : null}
                      {record.libertadoresWon ? <TitleChip label="Liberta" /> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </main>
    </div>
  );
}

function TitleChip({ label }: { label: string }): JSX.Element {
  return (
    <span className="border border-accent px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-accent">
      {label}
    </span>
  );
}
