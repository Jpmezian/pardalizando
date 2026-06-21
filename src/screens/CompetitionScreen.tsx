import type { CupResult } from '@/engine/cup';
import type { CompetitionResult } from '@/engine/competition';
import { useGameStore } from '@/store/gameStore';
import { getClub } from '@/data/dataset';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { ClubLink } from '@/components/ClubLink';

const TITLES: Record<string, string> = {
  national: 'Copa Nacional',
  champions: 'Champions',
  europa: 'Europa League',
  conference: 'Conference League',
  libertadores: 'Libertadores',
  sudamericana: 'Sudamericana',
};

export function CompetitionScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const cups = useGameStore((state) => state.lastCups);
  const viewed = useGameStore((state) => state.viewedCompetition);
  const backToSeasonResults = useGameStore((state) => state.backToSeasonResults);

  if (!game || !cups || !viewed) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <BroadcastTopBar onBack={backToSeasonResults} backLabel="Resultados" />
        <main className="flex flex-1 items-center justify-center px-5">
          <p className="font-sans text-ink-muted">Nenhuma competição pra mostrar.</p>
        </main>
      </div>
    );
  }

  const groups = viewed === 'national' ? [] : (cups[viewed] as CompetitionResult).groups;
  const knockout =
    viewed === 'national' ? (cups.national as CupResult).rounds : (cups[viewed] as CompetitionResult).knockout;
  const championId = cups[viewed].championId;

  const name = (id: string): string => game.clubs[id]?.name ?? getClub(id)?.name ?? id;
  const managedId = game.managedClubId;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backToSeasonResults} backLabel="Resultados" rightLabel={TITLES[viewed]} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 lg:px-8">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight lg:text-5xl">
          {TITLES[viewed]}
        </h1>
        <p className="mt-1 flex items-center gap-1 font-sans text-sm text-ink-muted">
          Campeão:{' '}
          {championId ? (
            <ClubLink clubId={championId} name={name(championId)} className="font-bold text-accent" />
          ) : (
            '—'
          )}
        </p>

        {groups.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Fase de grupos
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {groups.map((group) => (
                <div key={group.name} className="border border-line bg-surface p-3">
                  <p className="mb-2 font-display text-lg font-bold uppercase">{group.name}</p>
                  <ul>
                    {group.table.map((row, index) => {
                      const qualified = index < 2;
                      const isManaged = row.clubId === managedId;
                      return (
                        <li
                          key={row.clubId}
                          className={`flex items-center justify-between gap-2 py-0.5 text-sm ${
                            isManaged ? 'font-bold text-accent' : qualified ? 'text-ink' : 'text-ink-faint'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-3 text-ink-faint">{index + 1}</span>
                            <ClubLink clubId={row.clubId} name={name(row.clubId)} className="truncate" />
                          </span>
                          <span className="font-display font-bold tabular-nums">{row.points}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
            Mata-mata
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {knockout.map((round) => (
              <div key={round.name} className="min-w-[220px] flex-1">
                <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
                  {round.name}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {round.ties
                    .filter((tie) => !tie.bye)
                    .map((tie) => {
                      const homeWon = tie.winnerId === tie.homeId;
                      const involvesManaged = tie.homeId === managedId || tie.awayId === managedId;
                      return (
                        <li
                          key={`${tie.homeId}-${tie.awayId}`}
                          className={`border border-line px-2 py-1.5 text-sm ${
                            involvesManaged ? 'border-l-2 border-l-accent bg-surface-raised' : ''
                          }`}
                        >
                          <div className={`flex justify-between gap-2 ${homeWon ? 'font-bold' : 'text-ink-muted'}`}>
                            <ClubLink clubId={tie.homeId} name={name(tie.homeId)} className="truncate" />
                            <span className="tabular-nums">{tie.homeGoals}</span>
                          </div>
                          <div className={`flex justify-between gap-2 ${!homeWon ? 'font-bold' : 'text-ink-muted'}`}>
                            <ClubLink clubId={tie.awayId} name={name(tie.awayId)} className="truncate" />
                            <span className="tabular-nums">{tie.awayGoals}</span>
                          </div>
                          {tie.penalties ? (
                            <p className="text-right text-[10px] uppercase tracking-broadcast text-ink-faint">
                              pênaltis
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
