import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { getClub, getClubPlayers } from '@/data/dataset';
import { LEAGUES } from '@/data/loaders';
import { pickBestXI, teamStrength } from '@/engine/ratings';
import { formationSubPositions } from '@/engine/formations';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { LeagueFlag, LeagueName } from '@/components/LeagueBadge';
import { OvrBadge } from '@/components/OvrBadge';
import { ReputationPips } from '@/components/ReputationPips';
import { POSITION_ORDER } from '@/lib/format';

export function ClubDetailScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const clubId = useGameStore((state) => state.viewedClubId);
  const backFromClub = useGameStore((state) => state.backFromClub);

  const inGameClub = game && clubId ? game.clubs[clubId] : undefined;
  const club = inGameClub ?? (clubId ? getClub(clubId) : undefined);

  if (!game || !club) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <BroadcastTopBar onBack={backFromClub} backLabel="Voltar" />
        <main className="flex flex-1 items-center justify-center px-5">
          <p className="font-sans text-ink-muted">Clube não encontrado.</p>
        </main>
      </div>
    );
  }

  const players: Player[] = inGameClub
    ? club.squad
        .map((id) => game.players[id])
        .filter((player): player is Player => player !== undefined)
    : getClubPlayers(club);

  const sorted = [...players].sort(
    (a, b) => POSITION_ORDER[a.pos] - POSITION_ORDER[b.pos] || b.ovr - a.ovr,
  );
  const strength = teamStrength(pickBestXI(players, formationSubPositions('4-3-3')));
  const avgOvr = players.length
    ? Math.round(players.reduce((sum, player) => sum + player.ovr, 0) / players.length)
    : 0;
  const league = LEAGUES.find((entry) => entry.id === club.leagueId);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backFromClub} backLabel="Voltar" rightLabel={club.name} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-6 lg:px-8">
        {league ? (
          <div className="mb-2 flex items-center gap-2">
            <LeagueFlag leagueId={league.id} className="h-5 w-7" />
            <LeagueName
              leagueId={league.id}
              name={league.name}
              className="font-display text-lg font-bold uppercase tracking-wide"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight lg:text-5xl">
              {club.name}
            </h1>
            <div className="mt-3 flex items-center gap-4">
              <ReputationPips value={club.reputation} />
              <span className="font-sans text-sm text-ink-muted">{players.length} jogadores</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Overall médio
            </p>
            <p className="font-display text-5xl font-extrabold leading-none text-accent">{avgOvr}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-6">
          <Sector label="Ataque" value={strength.atk} />
          <Sector label="Meio" value={strength.mid} />
          <Sector label="Defesa" value={strength.def} />
        </div>

        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-b border-line text-left font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              <th className="py-2 pr-3 font-semibold">Pos</th>
              <th className="py-2 pr-3 font-semibold">Nome</th>
              <th className="py-2 pr-3 text-right font-semibold">Idade</th>
              <th className="py-2 text-right font-semibold">OVR</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => (
              <tr key={player.id} className="border-b border-line tabular-nums">
                <td className="py-2 pr-3">
                  <span className="inline-block border border-line px-1.5 py-0.5 font-display text-xs font-bold text-ink-muted">
                    {player.subPos}
                  </span>
                </td>
                <td className="py-2 pr-3 font-sans">{player.name}</td>
                <td className="py-2 pr-3 text-right font-sans text-ink-muted">{player.age}</td>
                <td className="py-2 text-right">
                  <div className="flex justify-end">
                    <OvrBadge ovr={player.ovr} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

function Sector({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div>
      <span className="font-sans text-xs uppercase tracking-broadcast text-ink-faint">{label}</span>
      <p className="font-display text-2xl font-bold tabular-nums text-ink">{Math.round(value)}</p>
    </div>
  );
}
