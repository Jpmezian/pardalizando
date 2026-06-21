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
  mundial: 'Mundial de Clubes',
};

export function CompetitionScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const cups = useGameStore((state) => state.lastCups);
  const viewed = useGameStore((state) => state.viewedCompetition);
  const backToSeasonResults = useGameStore((state) => state.backToSeasonResults);
  const watchCupMatch = useGameStore((state) => state.watchCupMatch);

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

  const isKnockoutOnly = viewed === 'national' || viewed === 'mundial';
  const groups = isKnockoutOnly ? [] : (cups[viewed] as CompetitionResult).groups;
  const knockout = isKnockoutOnly
    ? (cups[viewed] as CupResult).rounds
    : (cups[viewed] as CompetitionResult).knockout;
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
            <h2 className="mb-1 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Fase de liga
            </h2>
            <p className="mb-3 font-sans text-xs text-ink-faint">
              <span className="text-accent">1–8</span> vão direto às oitavas ·{' '}
              <span className="text-ink">9–24</span> jogam o playoff · 25+ eliminados
            </p>
            {groups.map((group) => (
              <ul key={group.name} className="gap-x-8 sm:columns-2 lg:columns-3">
                {group.table.map((row, index) => {
                  const isManaged = row.clubId === managedId;
                  const tone =
                    index < 8 ? 'text-accent' : index < 24 ? 'text-ink' : 'text-ink-faint';
                  return (
                    <li
                      key={row.clubId}
                      className={`flex items-center justify-between gap-2 break-inside-avoid border-b border-line py-1 text-sm ${
                        isManaged ? 'font-bold text-accent' : tone
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="w-5 text-right text-ink-faint">{index + 1}</span>
                        <ClubLink clubId={row.clubId} name={name(row.clubId)} className="truncate" />
                      </span>
                      <span className="font-display font-bold tabular-nums">{row.points}</span>
                    </li>
                  );
                })}
              </ul>
            ))}
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
                          {involvesManaged ? (
                            <button
                              type="button"
                              onClick={() =>
                                watchCupMatch(
                                  {
                                    homeId: tie.homeId,
                                    awayId: tie.awayId,
                                    homeGoals: tie.homeGoals,
                                    awayGoals: tie.awayGoals,
                                    penalties: tie.penalties,
                                    winnerId: tie.winnerId,
                                  },
                                  viewed,
                                  round.name,
                                )
                              }
                              className="mt-1 w-full border border-accent/50 py-1 font-sans text-[10px] font-bold uppercase tracking-broadcast text-accent transition-colors duration-150 hover:bg-accent hover:text-accent-ink"
                            >
                              ▶ Assistir
                            </button>
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
