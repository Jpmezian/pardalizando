import type { Player } from '@/types';
import { playerPositionFits } from '@/engine/ratings';
import { fitColorClass, fitLabel, formatMoney } from '@/lib/format';
import { OvrBadge } from '@/components/OvrBadge';

interface PlayerDetailModalProps {
  player: Player;
  onClose: () => void;
}

/** Detalhe do jogador (spec §9.1): OVR efetivo em cada posição, da melhor pra pior. */
export function PlayerDetailModal({ player, onClose }: PlayerDetailModalProps): JSX.Element {
  const fits = playerPositionFits(player);
  const best = fits[0];

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-5"
      style={{ backgroundColor: 'oklch(0.16 0.012 255 / 0.92)' }}
    >
      <div className="w-full max-w-md border border-line bg-surface">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight">
              {player.name}
            </h2>
            <p className="mt-2 font-sans text-sm text-ink-muted">
              <span className="text-accent">{player.subPos}</span> · {player.age} anos ·{' '}
              {formatMoney(player.value)}
            </p>
            {best ? (
              <p className="mt-1 font-sans text-sm">
                <span className="text-ink-faint">Melhor posição: </span>
                <span className="font-semibold text-accent">{best.subPos}</span>
                <span className="text-ink-muted"> ({best.ovr})</span>
              </p>
            ) : null}
            {player.injuredSeasons ? (
              <p className="mt-1 font-sans text-sm font-semibold text-live">
                {player.injuredSeasons >= 99
                  ? 'Carreira encerrada por lesão'
                  : `Lesionado · fora por ${player.injuredSeasons} temporada(s)`}
              </p>
            ) : null}
          </div>
          <div className="text-center">
            <OvrBadge ovr={player.ovr} />
            <p className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-broadcast text-ink-faint">
              POT {player.pot}
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
            OVR por posição
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {fits.map((fit) => {
              const isNatural = fit.subPos === player.subPos;
              return (
                <li key={fit.subPos} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-8 font-display text-sm font-bold ${isNatural ? 'text-accent' : 'text-ink-muted'}`}
                    >
                      {fit.subPos}
                    </span>
                    <span className={`font-sans text-xs ${fitColorClass(fit.penalty)}`}>
                      {fitLabel(fit.penalty)}
                    </span>
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums">{fit.ovr}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full border border-line px-4 py-2 font-display text-lg font-bold uppercase tracking-wide text-ink-muted transition-colors duration-150 hover:border-ink-faint hover:text-ink"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
