import { useEffect, useMemo, useState } from 'react';
import type { MatchPlay, ShotMoment, Side } from '@/engine/matchPlay';
import type { CupTheme } from '@/config/cupThemes';

interface CupMatchCinematicProps {
  play: MatchPlay;
  theme: CupTheme;
  roundName: string;
  managedSide: Side | null;
  onDone: () => void;
}

type StepKind = 'kickoff' | 'buildup' | 'windup' | 'reveal' | 'fulltime';

interface Step {
  kind: StepKind;
  duration: number;
  ballX: number;
  ballY: number;
  ballMs: number;
  scoreHome: number;
  scoreAway: number;
  shot?: ShotMoment;
}

function buildSteps(play: MatchPlay): Step[] {
  const steps: Step[] = [
    { kind: 'kickoff', duration: 1100, ballX: 50, ballY: 50, ballMs: 500, scoreHome: 0, scoreAway: 0 },
  ];
  let prevHome = 0;
  let prevAway = 0;
  for (const shot of play.shots) {
    const attackingRight = shot.team === 'home';
    const boxX = attackingRight ? 73 : 27;
    const goalX = attackingRight ? 97 : 3;
    steps.push({ kind: 'buildup', duration: 1250, ballX: boxX, ballY: 50, ballMs: 1000, scoreHome: prevHome, scoreAway: prevAway, shot });
    steps.push({ kind: 'windup', duration: 1350, ballX: goalX, ballY: 50, ballMs: 460, scoreHome: prevHome, scoreAway: prevAway, shot });
    let rx = goalX;
    let ry = 50;
    if (shot.outcome === 'save') {
      rx = attackingRight ? 66 : 34;
      ry = 58;
    } else if (shot.outcome === 'miss') {
      ry = 8;
    }
    steps.push({ kind: 'reveal', duration: 1900, ballX: rx, ballY: ry, ballMs: 380, scoreHome: shot.scoreHome, scoreAway: shot.scoreAway, shot });
    prevHome = shot.scoreHome;
    prevAway = shot.scoreAway;
  }
  steps.push({
    kind: 'fulltime',
    duration: 999999,
    ballX: 50,
    ballY: 50,
    ballMs: 500,
    scoreHome: play.finalHome,
    scoreAway: play.finalAway,
  });
  return steps;
}

const OUTCOME_TEXT: Record<string, string> = { goal: 'GOL!', save: 'DEFENDEU!', miss: 'PRA FORA!' };

export function CupMatchCinematic({
  play,
  theme,
  roundName,
  managedSide,
  onDone,
}: CupMatchCinematicProps): JSX.Element {
  const steps = useMemo(() => buildSteps(play), [play]);
  const [index, setIndex] = useState(0);
  const step = steps[index]!;

  useEffect(() => {
    if (step.kind === 'fulltime') return;
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), step.duration);
    return () => clearTimeout(timer);
  }, [index, step, steps.length]);

  const shot = step.shot;
  const attackingName = shot ? (shot.team === 'home' ? play.homeName : play.awayName) : '';
  const teamTone = (side: Side): string => (managedSide === side ? 'text-accent' : 'text-ink');

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col"
      style={{ backgroundColor: theme.bg }}
    >
      {/* Cabeçalho: competição + placar + rodada */}
      <header className="flex items-center justify-between px-5 py-3 lg:px-8">
        <span
          className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-broadcast"
          style={{ color: theme.accent }}
        >
          <span className="signal-dot h-2.5 w-2.5" style={{ backgroundColor: theme.accent }} aria-hidden="true" />
          {theme.label} · {roundName}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="font-sans text-xs font-semibold uppercase tracking-broadcast text-white/70 transition-colors hover:text-white"
        >
          Pular
        </button>
      </header>

      <div className="flex items-center justify-center gap-4 px-5 lg:gap-8">
        <span className={`font-display text-xl font-bold uppercase ${teamTone('home')}`}>
          {play.homeName}
        </span>
        <span
          className="font-display text-4xl font-extrabold tabular-nums"
          style={{ color: theme.accent }}
        >
          {step.scoreHome} <span className="text-white/40">×</span> {step.scoreAway}
        </span>
        <span className={`font-display text-xl font-bold uppercase ${teamTone('away')}`}>
          {play.awayName}
        </span>
      </div>

      {/* Campo horizontal */}
      <div className="flex flex-1 items-center justify-center px-4 py-4 lg:px-8">
        <div
          className="relative w-full max-w-4xl overflow-hidden border border-white/15"
          style={{ aspectRatio: '16 / 9', backgroundColor: 'oklch(0.33 0.05 152)' }}
        >
          {/* Linhas do campo */}
          <div className="pointer-events-none absolute inset-2 border border-white/15" />
          <div className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/15" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute left-2 top-1/2 h-24 w-12 -translate-y-1/2 border border-white/15" />
          <div className="pointer-events-none absolute right-2 top-1/2 h-24 w-12 -translate-y-1/2 border border-white/15" />
          {/* Gols */}
          <div className="pointer-events-none absolute left-0 top-1/2 h-12 w-1.5 -translate-y-1/2 bg-white/60" />
          <div className="pointer-events-none absolute right-0 top-1/2 h-12 w-1.5 -translate-y-1/2 bg-white/60" />

          {/* Flash do gol */}
          {step.kind === 'reveal' && shot?.outcome === 'goal' ? (
            <div
              key={index}
              className="cup-flash pointer-events-none absolute inset-0"
              style={{ backgroundColor: theme.accent }}
              aria-hidden="true"
            />
          ) : null}

          {/* Bola */}
          <div
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{
              left: `${step.ballX}%`,
              top: `${step.ballY}%`,
              transitionProperty: 'left, top',
              transitionDuration: `${step.ballMs}ms`,
              transitionTimingFunction: step.kind === 'windup' ? 'cubic-bezier(0.3,0,0.2,1)' : 'ease-in-out',
            }}
          />

          {/* Texto central do lance */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {step.kind === 'buildup' && shot ? (
              <p className="font-sans text-sm font-semibold uppercase tracking-broadcast text-white/85">
                {attackingName} ataca · <span style={{ color: theme.accent }}>{shot.shooter}</span>
              </p>
            ) : null}
            {step.kind === 'windup' && shot ? (
              <div key={index} className="cup-shout">
                <p className="font-sans text-xs uppercase tracking-broadcast text-white/70">
                  {shot.minute}' · {attackingName}
                </p>
                <p className="font-display text-4xl font-extrabold uppercase leading-none text-white lg:text-6xl">
                  {shot.shooter}
                </p>
                <p className="mt-1 font-display text-lg font-bold uppercase" style={{ color: theme.accent }}>
                  finaliza…
                </p>
              </div>
            ) : null}
            {step.kind === 'reveal' && shot ? (
              <div key={index} className="cup-shout">
                <p
                  className="font-display text-5xl font-extrabold uppercase leading-none lg:text-7xl"
                  style={{ color: shot.outcome === 'goal' ? theme.accent : 'oklch(0.96 0.006 250)' }}
                >
                  {OUTCOME_TEXT[shot.outcome]}
                </p>
                <p className="mt-2 font-sans text-sm uppercase tracking-broadcast text-white/80">
                  {shot.shooter}
                </p>
              </div>
            ) : null}
            {step.kind === 'kickoff' ? (
              <p className="font-display text-2xl font-bold uppercase tracking-wide text-white/85">
                Bola rolando
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <footer className="flex items-center justify-center px-5 py-4">
        {step.kind === 'fulltime' ? (
          <div className="text-center">
            <p className="font-sans text-xs uppercase tracking-broadcast text-white/70">Fim de jogo</p>
            <p className="mb-3 font-display text-3xl font-extrabold uppercase" style={{ color: theme.accent }}>
              {play.homeName} {play.finalHome} × {play.finalAway} {play.awayName}
            </p>
            <button
              type="button"
              onClick={onDone}
              className="border px-8 py-3 font-display text-xl font-bold uppercase tracking-wide"
              style={{ backgroundColor: theme.accent, color: theme.accentInk, borderColor: theme.accent }}
            >
              Continuar
            </button>
          </div>
        ) : (
          <p className="font-sans text-xs uppercase tracking-broadcast text-white/50">
            {shot ? `${shot.minute}'` : "0'"} · {theme.label}
          </p>
        )}
      </footer>
    </div>
  );
}
