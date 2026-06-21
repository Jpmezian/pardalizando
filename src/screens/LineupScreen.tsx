import { useState } from 'react';
import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { FORMATIONS, FORMATION_IDS, FORMATION_STYLE } from '@/engine/formations';
import { effectiveOvr, playerPositionFits } from '@/engine/ratings';
import { positionPenalty } from '@/engine/positions';
import { lineupStrength } from '@/engine/lineup';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { BroadcastButton } from '@/components/BroadcastButton';
import { fitColorClass, fitLabel } from '@/lib/format';

export function LineupScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const setFormation = useGameStore((state) => state.setFormation);
  const assignPlayerToSlot = useGameStore((state) => state.assignPlayerToSlot);
  const autoFillLineup = useGameStore((state) => state.autoFillLineup);
  const simulateFriendly = useGameStore((state) => state.simulateFriendly);
  const simulateSeason = useGameStore((state) => state.simulateSeason);
  const backToSquad = useGameStore((state) => state.backToSquad);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  if (!game || !managedClub || !game.lineup) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <BroadcastTopBar onBack={backToSquad} backLabel="Elenco" />
        <main className="flex flex-1 items-center justify-center px-5">
          <p className="font-sans text-ink-muted">Carregando escalação…</p>
        </main>
      </div>
    );
  }

  const { lineup } = game;
  const coords = FORMATIONS[lineup.formation];
  const strength = lineupStrength(game, lineup);

  const squad: Player[] = managedClub.squad
    .map((playerId) => game.players[playerId])
    .filter((player): player is Player => player !== undefined);

  const selectedSubPos = selectedSlot !== null ? lineup.slots[selectedSlot]?.subPos : undefined;
  const currentSlotPlayerId = selectedSlot !== null ? lineup.slots[selectedSlot]?.playerId : undefined;
  const currentPlayer = currentSlotPlayerId ? game.players[currentSlotPlayerId] : undefined;
  const pickerOptions =
    selectedSubPos === undefined
      ? []
      : [...squad]
          .filter((player) => !player.injuredSeasons)
          .sort((a, b) => effectiveOvr(b, selectedSubPos) - effectiveOvr(a, selectedSubPos));

  const benchPlayers = lineup.bench
    .map((playerId) => game.players[playerId])
    .filter((player): player is Player => player !== undefined);

  const handleAssign = (playerId: string): void => {
    if (selectedSlot === null) return;
    assignPlayerToSlot(selectedSlot, playerId);
    setSelectedSlot(null);
  };

  const handleSimulateSeason = (): void => {
    simulateSeason();
  };

  const handleFriendly = (): void => {
    simulateFriendly();
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backToSquad} backLabel="Elenco" rightLabel={managedClub.name} />

      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <section>
          <div
            className="relative w-full overflow-hidden border border-line"
            style={{ aspectRatio: '3 / 4', backgroundColor: 'oklch(0.33 0.05 152)' }}
          >
            <div className="pointer-events-none absolute inset-3 border border-white/15" />
            <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-white/15" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />

            {coords.map((coord, index) => {
              const slot = lineup.slots[index];
              const player = slot?.playerId ? game.players[slot.playerId] : undefined;
              const eff = player ? Math.round(effectiveOvr(player, coord.subPos)) : 0;
              const isSelected = selectedSlot === index;
              const tier =
                eff >= 85 ? 'bg-accent text-accent-ink' : 'bg-surface text-ink';
              return (
                <button
                  key={`${coord.subPos}-${index}`}
                  type="button"
                  onClick={() => setSelectedSlot(isSelected ? null : index)}
                  style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center font-display text-lg font-bold tabular-nums ${tier} ${
                      isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-[oklch(0.33_0.05_152)]' : ''
                    }`}
                  >
                    {eff || coord.subPos}
                  </span>
                  <span className="mt-1 max-w-[80px] truncate bg-bg px-1 text-[11px] font-semibold leading-tight text-ink">
                    {player?.name ?? '—'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Banco ({benchPlayers.length})
            </p>
            {benchPlayers.length === 0 ? (
              <p className="font-sans text-sm text-ink-faint">Sem reservas disponíveis.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {benchPlayers.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center gap-2 border border-line px-2 py-1"
                  >
                    <span className="font-display text-xs font-bold text-ink-faint">
                      {player.subPos}
                    </span>
                    <span className="font-sans text-sm">{player.name}</span>
                    <span className="font-display text-sm font-bold tabular-nums text-ink-muted">
                      {player.ovr}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          {selectedSubPos !== undefined ? (
            <div className="border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-2">
                <span className="font-display text-lg font-bold uppercase tracking-wide">
                  Trocar {selectedSubPos}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="font-sans text-xs uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:text-ink"
                >
                  Fechar
                </button>
              </div>

              {currentPlayer ? (
                <div className="border-b border-line px-4 py-3">
                  <p className="font-sans text-sm">
                    <span className="text-ink-faint">No slot: </span>
                    <span className="font-semibold">{currentPlayer.name}</span>
                    <span className="text-ink-faint"> · POT {currentPlayer.pot}</span>
                  </p>
                  <p className="mb-2 mt-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
                    Melhores posições
                  </p>
                  <ul className="grid grid-cols-2 gap-x-5 gap-y-1">
                    {playerPositionFits(currentPlayer)
                      .slice(0, 6)
                      .map((fit) => (
                        <li key={fit.subPos} className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-8 font-display text-sm font-bold ${
                                fit.subPos === currentPlayer.subPos ? 'text-accent' : 'text-ink-muted'
                              }`}
                            >
                              {fit.subPos}
                            </span>
                            <span className={`font-sans text-xs ${fitColorClass(fit.penalty)}`}>
                              {fitLabel(fit.penalty)}
                            </span>
                          </span>
                          <span className="font-display text-base font-bold tabular-nums">
                            {fit.ovr}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              <ul className="max-h-72 overflow-y-auto">
                {pickerOptions.map((player) => {
                  const inXi = lineup.slots.some((slot) => slot.playerId === player.id);
                  return (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => handleAssign(player.id)}
                        className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2 text-left transition-colors duration-150 hover:bg-surface-raised"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-8 shrink-0 font-display text-xs font-bold text-ink-faint">
                            {player.subPos}
                          </span>
                          <span className="truncate font-sans text-sm">{player.name}</span>
                          {inXi ? (
                            <span className="shrink-0 font-sans text-[10px] uppercase tracking-broadcast text-accent">
                              XI
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={`font-sans text-xs ${fitColorClass(positionPenalty(player.subPos, selectedSubPos))}`}
                          >
                            {fitLabel(positionPenalty(player.subPos, selectedSubPos))}
                          </span>
                          <span className="font-display text-lg font-bold tabular-nums text-ink">
                            {Math.round(effectiveOvr(player, selectedSubPos))}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Formação
            </h2>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {FORMATION_IDS.map((formationId) => {
                const active = formationId === lineup.formation;
                return (
                  <button
                    key={formationId}
                    type="button"
                    onClick={() => setFormation(formationId)}
                    className={`border px-2 py-2 font-display text-sm font-bold tabular-nums transition-colors duration-150 ${
                      active
                        ? 'border-accent bg-accent text-accent-ink'
                        : 'border-line text-ink-muted hover:border-ink-faint hover:text-ink'
                    }`}
                  >
                    {formationId}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 font-sans text-xs text-ink-muted">
              Estilo: <span className="text-ink">{FORMATION_STYLE[lineup.formation]}</span> — formação
              ofensiva reforça o ataque mas abre a defesa, e vice-versa.
            </p>
          </div>

          <div>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Força do time
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              <StrengthBar label="Ataque" value={strength.atk} />
              <StrengthBar label="Meio" value={strength.mid} />
              <StrengthBar label="Defesa" value={strength.def} />
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={autoFillLineup}
              className="border border-line px-4 py-2 font-sans text-sm font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:border-ink-faint hover:text-ink"
            >
              Auto-escalar melhor XI
            </button>
            <button
              type="button"
              onClick={handleFriendly}
              className="border border-line px-3 py-2 font-sans text-sm font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:border-ink-faint hover:text-ink"
            >
              Jogar amistoso
            </button>
            <BroadcastButton variant="primary" onClick={handleSimulateSeason}>
              Simular Temporada
            </BroadcastButton>
          </div>
        </aside>
      </main>
    </div>
  );
}

interface StrengthBarProps {
  label: string;
  value: number;
}

function StrengthBar({ label, value }: StrengthBarProps): JSX.Element {
  const pct = Math.max(0, Math.min(100, ((value - 40) / 55) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-sans text-xs uppercase tracking-broadcast text-ink-muted">{label}</span>
        <span className="font-display text-xl font-bold tabular-nums text-ink">
          {Math.round(value)}
        </span>
      </div>
      <div className="mt-1 h-2 bg-surface-raised">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
