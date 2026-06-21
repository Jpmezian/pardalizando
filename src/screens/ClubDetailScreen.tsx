import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { getClub, getClubPlayers } from '@/data/dataset';
import { LEAGUES } from '@/data/loaders';
import { effectiveOvr, pickBestXI, teamStrength } from '@/engine/ratings';
import { FORMATIONS, formationSubPositions } from '@/engine/formations';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { LeagueFlag, LeagueName } from '@/components/LeagueBadge';
import { OvrBadge } from '@/components/OvrBadge';
import { ReputationPips } from '@/components/ReputationPips';
import { PlayerHoverCard } from '@/components/PlayerHoverCard';
import { POSITION_ORDER } from '@/lib/format';

const XI_FORMATION = '4-3-3';

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
  const xi = pickBestXI(players, formationSubPositions(XI_FORMATION));
  const coords = FORMATIONS[XI_FORMATION];
  const strength = teamStrength(xi);
  const xiIds = new Set(xi.map((slot) => slot.player.id));
  const avgOvr = players.length
    ? Math.round(players.reduce((sum, player) => sum + player.ovr, 0) / players.length)
    : 0;
  const league = LEAGUES.find((entry) => entry.id === club.leagueId);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backFromClub} backLabel="Voltar" rightLabel={club.name} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6 lg:px-8">
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

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
          <section>
            <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              XI ideal · {XI_FORMATION}
            </p>
            <div
              className="relative mx-auto w-full max-w-[340px] border border-line"
              style={{ aspectRatio: '3 / 4', backgroundColor: 'oklch(0.33 0.05 152)' }}
            >
              <div className="pointer-events-none absolute inset-3 border border-white/15" />
              <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-white/15" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />

              {coords.map((coord, index) => {
                const slot = xi[index];
                if (!slot) return null;
                const player = slot.player;
                const eff = Math.round(effectiveOvr(player, coord.subPos));
                const tier = eff >= 85 ? 'bg-accent text-accent-ink' : 'bg-surface text-ink';
                return (
                  <span
                    key={`${coord.subPos}-${index}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                  >
                    <PlayerHoverCard player={player} placement={coord.y < 48 ? 'bottom' : 'top'}>
                      <span className="flex flex-col items-center">
                        <span
                          className={`flex h-9 w-9 items-center justify-center font-display text-lg font-bold tabular-nums ${tier}`}
                        >
                          {eff}
                        </span>
                        <span className="mt-1 max-w-[84px] truncate bg-bg px-1 text-[11px] font-semibold leading-tight text-ink">
                          {player.name}
                        </span>
                      </span>
                    </PlayerHoverCard>
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-center font-sans text-xs text-ink-faint">
              Passe o mouse num jogador pra ver mais.
            </p>
          </section>

          <section>
            <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Elenco completo
            </p>
            <table className="w-full border-collapse">
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
                    <td className="py-2 pr-3 font-sans">
                      <PlayerHoverCard player={player}>
                        <span className="align-middle">{player.name}</span>
                      </PlayerHoverCard>
                      {xiIds.has(player.id) ? (
                        <span className="ml-2 align-middle font-sans text-[10px] uppercase tracking-broadcast text-accent">
                          XI
                        </span>
                      ) : null}
                    </td>
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
          </section>
        </div>
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
