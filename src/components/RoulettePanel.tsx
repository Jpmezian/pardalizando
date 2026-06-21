import { useEffect, useState } from 'react';
import type { Player } from '@/types';
import { useGameStore, type RouletteView } from '@/store/gameStore';
import { ROSTER_LIMIT, ROULETTE_SPIN_IDS, ROULETTE_SPINS } from '@/config/economy';
import { formatMoney } from '@/lib/format';
import { BroadcastButton } from '@/components/BroadcastButton';

const CARD_WIDTH = 80;
const CARD_STEP = 84;
const SPIN_MS = 4100;

export function RoulettePanel(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const spinRoulette = useGameStore((state) => state.spinRoulette);

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  if (!game || !managedClub) return <p className="font-sans text-ink-muted">—</p>;

  const rosterFull = managedClub.squad.length >= ROSTER_LIMIT;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-sm text-ink-muted">
        A fita gira, desacelera e para. As cartas de cima ficam coladas no resultado — dá pra sentir
        o "quase". Probabilidades sempre à mostra.
      </p>

      {ROULETTE_SPIN_IDS.map((spinId) => {
        const config = ROULETTE_SPINS[spinId]!;
        const costLabel =
          config.currency === 'budget' ? formatMoney(config.cost) : `${config.cost} fichas`;
        const canAfford =
          config.currency === 'budget'
            ? managedClub.budget >= config.cost
            : game.packs.goldenTickets >= config.cost;
        const pityLeft = config.pityEvery !== undefined ? config.pityEvery - game.packs.goldPity : null;

        return (
          <div key={spinId} className="border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide">
                {config.label}
              </h3>
              <span className="font-display text-lg font-bold tabular-nums text-ink-muted">
                {costLabel}
              </span>
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              {config.tiers.map((tier) => (
                <li
                  key={`${tier.min}-${tier.max}`}
                  className="font-sans text-sm tabular-nums text-ink-muted"
                >
                  OVR {tier.min}–{tier.max}{' '}
                  <span className="text-ink">{Math.round(tier.p * 100)}%</span>
                </li>
              ))}
            </ul>

            {pityLeft !== null ? (
              <p className="mt-2 font-sans text-xs text-ink-faint">
                Item alto garantido em {pityLeft} {pityLeft === 1 ? 'giro' : 'giros'}
              </p>
            ) : null}

            <button
              type="button"
              disabled={rosterFull || !canAfford}
              onClick={() => spinRoulette(spinId)}
              className="mt-4 border border-accent bg-accent px-4 py-2 font-display text-lg font-bold uppercase tracking-wide text-accent-ink transition-[background-color,opacity] duration-150 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              {rosterFull ? 'Elenco cheio' : !canAfford ? 'Sem saldo' : 'Girar'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function RouletteReveal(): JSX.Element | null {
  const spin = useGameStore((state) => state.lastSpin);
  const clearSpin = useGameStore((state) => state.clearSpin);
  if (!spin) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-5"
      style={{ backgroundColor: 'oklch(0.16 0.012 255 / 0.92)' }}
    >
      <Reel key={spin.winner.id} spin={spin} onClose={clearSpin} />
    </div>
  );
}

interface ReelProps {
  spin: RouletteView;
  onClose: () => void;
}

function Reel({ spin, onClose }: ReelProps): JSX.Element {
  const [offset, setOffset] = useState(CARD_WIDTH / 2);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const target = spin.winnerIndex * CARD_STEP + CARD_WIDTH / 2;
    const start = setTimeout(() => setOffset(target), 60);
    const finish = setTimeout(() => setDone(true), SPIN_MS + 200);
    return () => {
      clearTimeout(start);
      clearTimeout(finish);
    };
  }, [spin]);

  return (
    <div className="w-full max-w-lg border border-line bg-surface p-5">
      <div className="relative h-28 overflow-hidden border border-line bg-bg">
        <div
          className="absolute bottom-0 left-1/2 top-0 z-10 w-0.5 -translate-x-1/2 bg-accent"
          aria-hidden="true"
        />
        <div
          className="absolute left-1/2 top-0 flex h-full items-center"
          style={{
            transform: `translateX(-${offset}px)`,
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.1, 1)`,
          }}
        >
          {spin.reel.map((card, index) => (
            <ReelCard
              key={`${card.id}-${index}`}
              player={card}
              highlight={done && index === spin.winnerIndex}
            />
          ))}
        </div>
      </div>

      {done ? (
        <div className="mt-5 text-center">
          <p className="font-display text-sm font-bold uppercase tracking-broadcast text-accent">
            Contratado{spin.isHigh ? ' · item alto!' : ''}
          </p>
          <p className="mt-3 font-display text-6xl font-extrabold tabular-nums text-accent">
            {spin.winner.ovr}
          </p>
          <p className="mt-1 font-display text-2xl font-bold uppercase leading-none">
            {spin.winner.name}
          </p>
          <p className="mt-1 font-sans text-sm text-ink-muted">
            {spin.winner.subPos} · {spin.winner.age} anos · POT {spin.winner.pot}
          </p>
          <div className="mt-5">
            <BroadcastButton variant="primary" onClick={onClose}>
              Ficar com ele
            </BroadcastButton>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-center font-display text-xl font-bold uppercase tracking-broadcast text-ink-muted">
          Girando…
        </p>
      )}
    </div>
  );
}

interface ReelCardProps {
  player: Player;
  highlight: boolean;
}

function ReelCard({ player, highlight }: ReelCardProps): JSX.Element {
  const tone = player.ovr >= 85 ? 'text-accent' : player.ovr >= 78 ? 'text-ink' : 'text-ink-muted';
  return (
    <div
      className={`mr-1 flex flex-col items-center justify-center border bg-surface ${
        highlight ? 'border-accent' : 'border-line'
      }`}
      style={{ width: `${CARD_WIDTH}px`, height: '88px' }}
    >
      <span className={`font-display text-2xl font-extrabold tabular-nums ${tone}`}>
        {player.ovr}
      </span>
      <span className="mt-1 w-full truncate px-1 text-center font-sans text-[10px] text-ink-muted">
        {player.name}
      </span>
    </div>
  );
}
