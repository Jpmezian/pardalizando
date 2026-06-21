import { useState } from 'react';
import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { BroadcastButton } from '@/components/BroadcastButton';
import { MainNav } from '@/components/MainNav';
import { BoardBanner } from '@/components/BoardBanner';
import { BOARD_START } from '@/engine/board';
import { PlayerDetailModal } from '@/components/PlayerDetailModal';
import { OvrBadge } from '@/components/OvrBadge';
import { ReputationPips } from '@/components/ReputationPips';
import { findCaptainId, formatMoney, POSITION_ORDER, seasonYearLabel } from '@/lib/format';

export function SquadScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const goToLineup = useGameStore((state) => state.goToLineup);
  const backToStart = useGameStore((state) => state.backToStart);
  const lastTransfers = useGameStore((state) => state.lastTransfers);
  const clearTransfers = useGameStore((state) => state.clearTransfers);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  if (!game || !managedClub) {
    return <NoClub onBack={backToStart} />;
  }

  const squad: Player[] = managedClub.squad
    .map((playerId) => game.players[playerId])
    .filter((player): player is Player => player !== undefined)
    .sort((a, b) => POSITION_ORDER[a.pos] - POSITION_ORDER[b.pos] || b.ovr - a.ovr);

  const avgOvr =
    squad.length > 0
      ? Math.round(squad.reduce((sum, player) => sum + player.ovr, 0) / squad.length)
      : 0;

  const captainId = findCaptainId(managedClub.squad, game.players);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar
        onBack={backToStart}
        backLabel="Início"
        rightLabel={`Temporada ${game.currentSeason} · ${seasonYearLabel(game.currentSeason)}`}
      />
      <MainNav active="squad" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-4 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Seu clube
            </p>
            <h1 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight lg:text-4xl">
              {managedClub.name}
            </h1>
            <div className="mt-1.5 flex items-center gap-4">
              <ReputationPips value={managedClub.reputation} />
              <span className="font-sans text-sm text-ink-muted">
                Orçamento {formatMoney(managedClub.budget)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Overall médio · {squad.length} jog.
            </p>
            <p className="font-display text-4xl font-extrabold leading-none text-accent">{avgOvr}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <BoardBanner
              reputation={managedClub.reputation}
              clubCount={Object.keys(game.clubs).length}
              confidence={game.boardConfidence ?? BOARD_START}
            />
          </div>
          <div className="sm:w-56">
            <BroadcastButton variant="primary" onClick={() => goToLineup()}>
              Escalar &amp; simular
            </BroadcastButton>
          </div>
        </div>

        {lastTransfers && lastTransfers.length > 0 ? (
          <div className="mt-3 border border-line bg-surface px-4 py-2">
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
                Janela de transferências · {lastTransfers.length} negócios
              </p>
              <button
                type="button"
                onClick={clearTransfers}
                className="font-sans text-xs uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:text-ink"
              >
                Fechar
              </button>
            </div>
            <ul className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {lastTransfers.slice(0, 8).map((transfer, index) => (
                <li key={index} className="truncate font-sans text-sm">
                  <span className="font-semibold text-ink">{transfer.player}</span>
                  <span className="text-ink-faint"> {transfer.from}</span>
                  <span className="text-accent"> → {transfer.to}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse">
          <thead>
            <tr className="border-b border-line text-left font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              <th className="py-2 pr-3 font-semibold">Pos</th>
              <th className="py-2 pr-3 font-semibold">Nome</th>
              <th className="py-2 pr-3 text-right font-semibold">Idade</th>
              <th className="py-2 pr-3 text-right font-semibold">Valor</th>
              <th className="py-2 text-right font-semibold">OVR</th>
            </tr>
          </thead>
          <tbody>
            {squad.map((player) => (
              <tr
                key={player.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalhes de ${player.name}`}
                onClick={() => setSelectedPlayer(player)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedPlayer(player);
                  }
                }}
                className="cursor-pointer border-b border-line transition-colors duration-150 hover:bg-surface-raised focus-visible:bg-surface-raised"
              >
                <td className="py-1 pr-3">
                  <span className="inline-block border border-line px-1.5 py-0.5 font-display text-xs font-bold tracking-wide text-ink-muted">
                    {player.subPos}
                  </span>
                </td>
                <td className="py-1 pr-3 font-sans">
                  {player.name}
                  {player.id === captainId ? (
                    <span className="ml-2 border border-accent px-1 font-display text-[10px] font-bold text-accent">
                      C
                    </span>
                  ) : null}
                  {player.injuredSeasons ? (
                    <span className="ml-2 border border-live px-1 font-display text-[10px] font-bold text-live">
                      {player.injuredSeasons >= 99 ? 'FORA' : `LES ${player.injuredSeasons}T`}
                    </span>
                  ) : null}
                </td>
                <td className="py-1 pr-3 text-right font-sans tabular-nums text-ink-muted">
                  {player.age}
                </td>
                <td className="py-1 pr-3 text-right font-sans tabular-nums text-ink-muted">
                  {formatMoney(player.value)}
                </td>
                <td className="py-1 text-right">
                  <div className="flex justify-end">
                    <OvrBadge ovr={player.ovr} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </main>

      {selectedPlayer ? (
        <PlayerDetailModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      ) : null}
    </div>
  );
}

function NoClub({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={onBack} backLabel="Início" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-10 lg:px-8">
        <p className="font-sans text-lg text-ink-muted">
          Nenhum time carregado. Volte ao início e comece um novo jogo.
        </p>
      </main>
    </div>
  );
}
