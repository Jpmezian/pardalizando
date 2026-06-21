import type { ReactNode } from 'react';
import type { Player } from '@/types';
import { playerPositionFits } from '@/engine/ratings';
import { fitColorClass, fitLabel, formatMoney } from '@/lib/format';

interface PlayerHoverCardProps {
  player: Player;
  children: ReactNode;
  /** Lado em que o cartão abre — 'top' (acima) ou 'bottom' (abaixo) do gatilho. */
  placement?: 'top' | 'bottom';
  className?: string;
}

/** Envolve qualquer elemento e mostra, no hover, um cartão com os dados do jogador. */
export function PlayerHoverCard({
  player,
  children,
  placement = 'top',
  className = '',
}: PlayerHoverCardProps): JSX.Element {
  const fits = playerPositionFits(player).slice(0, 4);
  const anchor = placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <span className={`group relative inline-block cursor-help ${className}`}>
      {children}
      <span
        className={`invisible absolute left-1/2 z-[400] w-56 -translate-x-1/2 ${anchor} border border-line bg-surface-raised p-3 text-left opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100`}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate font-display text-base font-bold uppercase leading-tight">
              {player.name}
            </span>
            <span className="mt-0.5 block font-sans text-xs text-ink-muted">
              <span className="font-semibold text-accent">{player.subPos}</span> · {player.age} anos
              {player.nationality ? ` · ${player.nationality}` : ''}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-display text-2xl font-extrabold leading-none text-accent">
              {player.ovr}
            </span>
            <span className="block font-sans text-[10px] uppercase tracking-broadcast text-ink-faint">
              POT {player.pot}
            </span>
          </span>
        </span>

        <span className="mt-2 block font-sans text-xs text-ink-muted">
          Valor: <span className="text-ink">{formatMoney(player.value)}</span>
        </span>

        <span className="mt-2 block border-t border-line pt-2">
          <span className="mb-1 block font-sans text-[10px] uppercase tracking-broadcast text-ink-faint">
            Melhores posições
          </span>
          {fits.map((fit) => (
            <span key={fit.subPos} className="flex items-center justify-between py-0.5 font-sans text-xs">
              <span className="flex items-center gap-2">
                <span
                  className={`w-7 font-display font-bold ${fit.subPos === player.subPos ? 'text-accent' : 'text-ink-muted'}`}
                >
                  {fit.subPos}
                </span>
                <span className={fitColorClass(fit.penalty)}>{fitLabel(fit.penalty)}</span>
              </span>
              <span className="font-display font-bold tabular-nums">{fit.ovr}</span>
            </span>
          ))}
        </span>

        {player.injuredSeasons ? (
          <span className="mt-2 block font-sans text-xs font-semibold text-live">
            {player.injuredSeasons >= 99
              ? 'Carreira encerrada por lesão'
              : `Lesionado · ${player.injuredSeasons} temp.`}
          </span>
        ) : null}
      </span>
    </span>
  );
}
