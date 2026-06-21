import { useGameStore } from '@/store/gameStore';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { BroadcastButton } from '@/components/BroadcastButton';

export function MatchResultScreen(): JSX.Element {
  const match = useGameStore((state) => state.lastMatch);
  const simulateFriendly = useGameStore((state) => state.simulateFriendly);
  const backToLineup = useGameStore((state) => state.backToLineup);
  const backToSquad = useGameStore((state) => state.backToSquad);

  if (!match) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <BroadcastTopBar onBack={backToLineup} backLabel="Escalação" />
        <main className="flex flex-1 items-center justify-center px-5">
          <p className="font-sans text-ink-muted">Nenhuma partida simulada ainda.</p>
        </main>
      </div>
    );
  }

  const isWin = match.homeGoals > match.awayGoals;
  const isDraw = match.homeGoals === match.awayGoals;
  const outcomeLabel = isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota';
  const outcomeClass = isWin ? 'text-accent' : isDraw ? 'text-ink-muted' : 'text-live';

  const handleRematch = (): void => {
    simulateFriendly();
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backToLineup} backLabel="Escalação" rightLabel="Amistoso" />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-8 lg:px-8">
        <p
          className={`text-center font-sans text-sm font-semibold uppercase tracking-broadcast ${outcomeClass}`}
        >
          {outcomeLabel}
        </p>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-y border-line py-8">
          <span className="text-right font-display text-2xl font-bold uppercase leading-none lg:text-3xl">
            {match.homeName}
          </span>
          <span className="font-display text-6xl font-extrabold tabular-nums lg:text-7xl">
            <span className={isWin ? 'text-accent' : 'text-ink'}>{match.homeGoals}</span>
            <span className="px-2 text-ink-faint">–</span>
            <span className={!isWin && !isDraw ? 'text-accent' : 'text-ink'}>{match.awayGoals}</span>
          </span>
          <span className="text-left font-display text-2xl font-bold uppercase leading-none text-ink-muted lg:text-3xl">
            {match.awayName}
          </span>
        </div>

        <p className="mt-3 text-center font-sans text-sm text-ink-faint">
          Gols esperados (xG): {match.lambdaHome.toFixed(1)} – {match.lambdaAway.toFixed(1)}
        </p>

        <div className="mt-8 flex flex-col gap-2 border border-line">
          <SectorRow label="Ataque" home={match.homeStrength.atk} away={match.awayStrength.atk} />
          <SectorRow label="Meio" home={match.homeStrength.mid} away={match.awayStrength.mid} />
          <SectorRow label="Defesa" home={match.homeStrength.def} away={match.awayStrength.def} />
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <BroadcastButton variant="primary" onClick={handleRematch}>
            Nova partida
          </BroadcastButton>
          <BroadcastButton variant="ghost" onClick={backToLineup}>
            Mudar escalação
          </BroadcastButton>
        </div>
        <button
          type="button"
          onClick={backToSquad}
          className="mt-4 self-center font-sans text-xs uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:text-ink"
        >
          Voltar ao elenco
        </button>
      </main>
    </div>
  );
}

interface SectorRowProps {
  label: string;
  home: number;
  away: number;
}

function SectorRow({ label, home, away }: SectorRowProps): JSX.Element {
  const homeBetter = home > away;
  const awayBetter = away > home;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
      <span
        className={`text-right font-display text-2xl font-bold tabular-nums ${homeBetter ? 'text-accent' : 'text-ink-muted'}`}
      >
        {Math.round(home)}
      </span>
      <span className="text-center font-sans text-xs uppercase tracking-broadcast text-ink-faint">
        {label}
      </span>
      <span
        className={`text-left font-display text-2xl font-bold tabular-nums ${awayBetter ? 'text-accent' : 'text-ink-muted'}`}
      >
        {Math.round(away)}
      </span>
    </div>
  );
}
