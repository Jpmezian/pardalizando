import { useEffect, useState } from 'react';
import type { Player, Rarity } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { MIN_ROSTER, PACKS, RARITY_ORDER, ROSTER_LIMIT, type PackConfig } from '@/config/economy';
import { sellValue } from '@/engine/market';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { BroadcastButton } from '@/components/BroadcastButton';
import { OvrBadge } from '@/components/OvrBadge';
import { RoulettePanel, RouletteReveal } from '@/components/RoulettePanel';
import { formatMoney } from '@/lib/format';

type MarketTab = 'packs' | 'sell' | 'roulette';

/** Cor de acento por raridade (só na revelação — narrativa de raridade). */
const RARITY_COLOR: Record<Rarity, string> = {
  bronze: 'oklch(0.66 0.1 60)',
  prata: 'oklch(0.8 0.02 250)',
  ouro: 'oklch(0.83 0.15 90)',
  lendario: 'oklch(0.7 0.2 320)',
};

export function MarketScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const openPack = useGameStore((state) => state.openPack);
  const backToSquad = useGameStore((state) => state.backToSquad);
  const [tab, setTab] = useState<MarketTab>('packs');

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  if (!game || !managedClub) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <BroadcastTopBar onBack={backToSquad} backLabel="Elenco" />
        <main className="flex flex-1 items-center justify-center px-5">
          <p className="font-sans text-ink-muted">Nenhum clube carregado.</p>
        </main>
      </div>
    );
  }

  const rosterFull = managedClub.squad.length >= ROSTER_LIMIT;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backToSquad} backLabel="Elenco" rightLabel="Mercado" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line pb-5">
          <Stat label="Orçamento" value={formatMoney(managedClub.budget)} />
          <Stat label="Fichas douradas" value={String(game.packs.goldenTickets)} />
          <Stat
            label="Elenco"
            value={`${managedClub.squad.length} / ${ROSTER_LIMIT}`}
            warn={rosterFull}
          />
        </div>

        <nav className="mt-5 flex gap-1 border-b border-line">
          <TabButton active={tab === 'packs'} onClick={() => setTab('packs')}>
            Pacotes
          </TabButton>
          <TabButton active={tab === 'roulette'} onClick={() => setTab('roulette')}>
            Roleta
          </TabButton>
          <TabButton active={tab === 'sell'} onClick={() => setTab('sell')}>
            Vender
          </TabButton>
        </nav>

        <div className="mt-5">
          {tab === 'packs' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {RARITY_ORDER.map((rarity) => (
                <PackCard
                  key={rarity}
                  rarity={rarity}
                  config={PACKS[rarity]}
                  budget={managedClub.budget}
                  tickets={game.packs.goldenTickets}
                  goldPity={game.packs.goldPity}
                  rosterFull={rosterFull}
                  onOpen={() => openPack(rarity)}
                />
              ))}
            </div>
          ) : null}
          {tab === 'roulette' ? <RoulettePanel /> : null}
          {tab === 'sell' ? <SellList /> : null}
        </div>

        <div className="mt-8 max-w-sm">
          <BroadcastButton variant="primary" onClick={backToSquad}>
            Voltar ao elenco
          </BroadcastButton>
        </div>
      </main>

      <PackReveal />
      <RouletteReveal />
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  warn?: boolean;
}

function Stat({ label, value, warn = false }: StatProps): JSX.Element {
  return (
    <div>
      <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
        {label}
      </p>
      <p className={`font-display text-2xl font-bold tabular-nums ${warn ? 'text-live' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: string;
}

function TabButton({ active, onClick, children }: TabButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 font-display text-lg font-bold uppercase tracking-wide transition-colors duration-150 ${
        active ? 'border-accent text-ink' : 'border-transparent text-ink-faint hover:text-ink-muted'
      }`}
    >
      {children}
    </button>
  );
}

interface PackCardProps {
  rarity: Rarity;
  config: PackConfig;
  budget: number;
  tickets: number;
  goldPity: number;
  rosterFull: boolean;
  onOpen: () => void;
}

function PackCard({
  rarity,
  config,
  budget,
  tickets,
  goldPity,
  rosterFull,
  onOpen,
}: PackCardProps): JSX.Element {
  const costLabel =
    config.currency === 'budget' ? formatMoney(config.cost) : `${config.cost} fichas`;
  const canAfford =
    config.currency === 'budget' ? budget >= config.cost : tickets >= config.cost;
  const disabled = rosterFull || !canAfford;
  const pityLeft = config.pityEvery !== undefined ? config.pityEvery - goldPity : null;

  return (
    <div
      className="flex flex-col border-l-2 border-line bg-surface p-4"
      style={{ borderLeftColor: RARITY_COLOR[rarity] }}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide">
          {config.label}
        </h3>
        <span className="font-display text-lg font-bold tabular-nums text-ink-muted">{costLabel}</span>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {config.tiers.map((tier) => (
          <li
            key={`${tier.min}-${tier.max}`}
            className="flex justify-between font-sans text-sm text-ink-muted"
          >
            <span className="tabular-nums">
              OVR {tier.min}–{tier.max}
            </span>
            <span className="tabular-nums">{Math.round(tier.p * 100)}%</span>
          </li>
        ))}
      </ul>

      {pityLeft !== null ? (
        <p className="mt-2 font-sans text-xs text-ink-faint">
          Item alto garantido em {pityLeft} {pityLeft === 1 ? 'abertura' : 'aberturas'}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="mt-4 border border-accent bg-accent px-4 py-2 font-display text-lg font-bold uppercase tracking-wide text-accent-ink transition-[background-color,opacity] duration-150 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
      >
        {rosterFull ? 'Elenco cheio' : !canAfford ? 'Sem saldo' : 'Abrir'}
      </button>
    </div>
  );
}

function SellList(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const sellPlayer = useGameStore((state) => state.sellPlayer);

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  if (!game || !managedClub) return <p className="font-sans text-ink-muted">—</p>;

  const canSell = managedClub.squad.length > MIN_ROSTER;
  const players = managedClub.squad
    .map((id) => game.players[id])
    .filter((player): player is Player => player !== undefined)
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      {!canSell ? (
        <p className="mb-3 font-sans text-sm text-live">
          Elenco no mínimo ({MIN_ROSTER}) — não dá pra vender mais.
        </p>
      ) : null}
      <ul className="border border-line">
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <OvrBadge ovr={player.ovr} />
              <div>
                <p className="font-sans">
                  <span className="mr-2 font-display text-xs text-ink-faint">{player.subPos}</span>
                  {player.name}
                </p>
                <p className="font-sans text-xs text-ink-faint">{player.age} anos</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => sellPlayer(player.id)}
              disabled={!canSell}
              className="border border-line px-3 py-1.5 text-right font-sans text-sm font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:border-ink-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Vender {formatMoney(sellValue(player))}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PackReveal(): JSX.Element | null {
  const pull = useGameStore((state) => state.lastPull);
  const clearPull = useGameStore((state) => state.clearPull);
  const [opened, setOpened] = useState(false);
  const pullId = pull?.player.id ?? null;

  useEffect(() => {
    if (!pullId) return;
    setOpened(false);
    const timer = setTimeout(() => setOpened(true), 750);
    return () => clearTimeout(timer);
  }, [pullId]);

  if (!pull) return null;
  const color = RARITY_COLOR[pull.rarity];

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-5"
      style={{ backgroundColor: 'oklch(0.16 0.012 255 / 0.92)' }}
    >
      {!opened ? (
        <div
          className="pack-shake flex h-56 w-44 flex-col items-center justify-center border-2 bg-surface"
          style={{ borderColor: color, boxShadow: `0 0 50px -6px ${color}` }}
        >
          <span
            className="font-display text-sm font-bold uppercase tracking-broadcast"
            style={{ color }}
          >
            Pacote
          </span>
          <span className="mt-1 font-display text-3xl font-extrabold uppercase" style={{ color }}>
            {pull.rarity}
          </span>
          <span className="signal-dot mt-4 font-sans text-xs uppercase tracking-broadcast text-ink-faint">
            abrindo…
          </span>
        </div>
      ) : (
        <div
          className="pack-pop w-full max-w-xs border bg-surface p-6 text-center"
          style={{ borderColor: color, boxShadow: `0 0 40px -8px ${color}` }}
        >
          <p
            className="font-display text-sm font-bold uppercase tracking-broadcast"
            style={{ color }}
          >
            Pacote {pull.rarity}
            {pull.isHigh ? ' · item alto!' : ''}
          </p>

          <p className="mt-6 font-display text-7xl font-extrabold tabular-nums" style={{ color }}>
            {pull.player.ovr}
          </p>
          <p className="mt-2 font-display text-2xl font-bold uppercase leading-none">
            {pull.player.name}
          </p>
          <p className="mt-2 font-sans text-sm text-ink-muted">
            {pull.player.subPos} · {pull.player.age} anos · POT {pull.player.pot}
          </p>

          <div className="mt-6">
            <BroadcastButton variant="primary" onClick={clearPull}>
              Ficar com ele
            </BroadcastButton>
          </div>
        </div>
      )}
    </div>
  );
}
