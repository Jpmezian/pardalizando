import { useGameStore } from '@/store/gameStore';
import { clubAverageOvr, getClubsByLeague, getLeagueSummaries } from '@/data/dataset';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { LeagueFlag, LeagueName } from '@/components/LeagueBadge';
import { OvrBadge } from '@/components/OvrBadge';
import { ReputationPips } from '@/components/ReputationPips';
import { formatMoney } from '@/lib/format';

export function ClubSelectScreen(): JSX.Element {
  const selectedLeagueId = useGameStore((state) => state.selectedLeagueId);
  const selectClub = useGameStore((state) => state.selectClub);
  const backToLeagueSelect = useGameStore((state) => state.backToLeagueSelect);

  if (!selectedLeagueId) {
    return <LeagueMissing onBack={backToLeagueSelect} />;
  }

  const league = getLeagueSummaries().find((summary) => summary.id === selectedLeagueId);
  const clubs = getClubsByLeague(selectedLeagueId)
    .map((club) => ({ club, avgOvr: clubAverageOvr(club) }))
    .sort((a, b) => b.avgOvr - a.avgOvr);

  const handleSelectClub = (clubId: string): void => {
    void selectClub(clubId);
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar
        onBack={backToLeagueSelect}
        backLabel="Ligas"
        rightLabel="Novo jogo · 2 / 2"
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 lg:px-8">
        <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-accent">
          Passo 2 de 2
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <LeagueFlag leagueId={selectedLeagueId} className="h-6 w-9" />
          <LeagueName
            leagueId={selectedLeagueId}
            name={league?.name ?? ''}
            className="font-display text-2xl font-bold uppercase tracking-wide"
          />
        </div>
        <h1 className="mt-3 font-display text-5xl font-extrabold uppercase tracking-tight lg:text-6xl">
          Escolha o time
        </h1>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {clubs.map(({ club, avgOvr }) => (
            <li key={club.id}>
              <button
                type="button"
                onClick={() => handleSelectClub(club.id)}
                className="flex w-full items-center justify-between gap-4 border border-line bg-surface px-5 py-4 text-left transition-[border-color,background-color] duration-150 hover:border-accent hover:bg-surface-raised"
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-2xl font-bold uppercase leading-none">
                    {club.name}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ReputationPips value={club.reputation} />
                    <span className="font-sans text-sm text-ink-muted">
                      {formatMoney(club.budget)}
                    </span>
                  </div>
                </div>
                <OvrBadge ovr={avgOvr} />
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function LeagueMissing({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={onBack} backLabel="Ligas" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-10 lg:px-8">
        <p className="font-sans text-lg text-ink-muted">
          Nenhuma liga selecionada. Volte e escolha uma liga.
        </p>
      </main>
    </div>
  );
}
