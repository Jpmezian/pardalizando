import { useState } from 'react';
import type { Club, GameState, Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { pickBestXI, teamStrength, type SectorStrength } from '@/engine/ratings';
import { formationSubPositions } from '@/engine/formations';
import { POSITION_ORDER } from '@/lib/format';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { OvrBadge } from '@/components/OvrBadge';

function clubPlayers(game: GameState, club: Club): Player[] {
  return club.squad
    .map((id) => game.players[id])
    .filter((player): player is Player => player !== undefined);
}

export function LeagueViewScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const backToSquad = useGameStore((state) => state.backToSquad);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  if (!game) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <BroadcastTopBar onBack={backToSquad} backLabel="Elenco" />
        <main className="flex flex-1 items-center justify-center px-5">
          <p className="font-sans text-ink-muted">Nenhum jogo carregado.</p>
        </main>
      </div>
    );
  }

  const ranked = Object.values(game.clubs)
    .map((club) => {
      const players = clubPlayers(game, club);
      const avg = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.ovr, 0) / players.length) : 0;
      return { club, avg };
    })
    .sort((a, b) => b.avg - a.avg);

  const activeClubId = selectedClubId ?? game.managedClubId ?? ranked[0]?.club.id ?? null;
  const activeClub = activeClubId ? game.clubs[activeClubId] : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backToSquad} backLabel="Elenco" rightLabel="Liga" />

      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
        <section>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">Clubes</h1>
          <ul className="mt-4 border border-line">
            {ranked.map(({ club, avg }) => {
              const isActive = club.id === activeClubId;
              const isManaged = club.id === game.managedClubId;
              return (
                <li key={club.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedClubId(club.id)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2 text-left transition-colors duration-150 last:border-b-0 ${
                      isActive ? 'bg-surface-raised' : 'hover:bg-surface'
                    }`}
                  >
                    <span className={`truncate font-sans ${isManaged ? 'font-bold text-accent' : ''}`}>
                      {club.name}
                    </span>
                    <span className="font-display text-lg font-bold tabular-nums text-ink-muted">
                      {avg}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {activeClub ? <ClubXI game={game} club={activeClub} /> : null}
      </main>
    </div>
  );
}

interface ClubXIProps {
  game: GameState;
  club: Club;
}

function ClubXI({ game, club }: ClubXIProps): JSX.Element {
  const xi = pickBestXI(clubPlayers(game, club), formationSubPositions('4-3-3'))
    .slice()
    .sort((a, b) => POSITION_ORDER[a.player.pos] - POSITION_ORDER[b.player.pos]);
  const strength: SectorStrength = teamStrength(
    pickBestXI(clubPlayers(game, club), formationSubPositions('4-3-3')),
  );

  return (
    <section>
      <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{club.name}</h2>
      <div className="mt-2 flex gap-5">
        <Sector label="ATA" value={strength.atk} />
        <Sector label="MEI" value={strength.mid} />
        <Sector label="DEF" value={strength.def} />
      </div>

      <p className="mt-4 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
        XI ideal (4-3-3)
      </p>
      <ul className="mt-2 border border-line">
        {xi.map((slot) => (
          <li
            key={slot.player.id}
            className="flex items-center justify-between gap-3 border-b border-line px-3 py-1.5 last:border-b-0"
          >
            <span className="flex items-center gap-3">
              <span className="w-9 font-display text-xs font-bold text-ink-faint">{slot.subPos}</span>
              <span className="truncate font-sans">{slot.player.name}</span>
            </span>
            <OvrBadge ovr={slot.player.ovr} />
          </li>
        ))}
      </ul>
    </section>
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
