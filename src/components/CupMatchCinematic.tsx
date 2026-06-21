import { useEffect, useMemo, useState } from 'react';
import type { MatchPlay, ShotMoment, Side } from '@/engine/matchPlay';
import type { CupTheme } from '@/config/cupThemes';

interface CupMatchCinematicProps {
  play: MatchPlay;
  theme: CupTheme;
  roundName: string;
  managedSide: Side | null;
  homeColor: string;
  awayColor: string;
  position: { index: number; total: number };
  onDone: () => void;
  onSkipAll?: () => void;
}

type StepKind = 'kickoff' | 'buildup' | 'windup' | 'reveal' | 'fulltime';

interface Step {
  kind: StepKind;
  duration: number;
  scoreHome: number;
  scoreAway: number;
  shot?: ShotMoment;
}

function buildSteps(play: MatchPlay): Step[] {
  // Mostra todos os gols + até 2 chances perdidas (pra não arrastar a fila).
  const goals = play.shots.filter((shot) => shot.outcome === 'goal');
  const others = play.shots.filter((shot) => shot.outcome !== 'goal').slice(0, 2);
  const shown = [...goals, ...others].sort((a, b) => a.minute - b.minute);

  const steps: Step[] = [{ kind: 'kickoff', duration: 1200, scoreHome: 0, scoreAway: 0 }];
  let prevHome = 0;
  let prevAway = 0;
  for (const shot of shown) {
    steps.push({ kind: 'buildup', duration: 900, scoreHome: prevHome, scoreAway: prevAway, shot });
    steps.push({ kind: 'windup', duration: 1050, scoreHome: prevHome, scoreAway: prevAway, shot });
    steps.push({ kind: 'reveal', duration: 1500, scoreHome: shot.scoreHome, scoreAway: shot.scoreAway, shot });
    prevHome = shot.scoreHome;
    prevAway = shot.scoreAway;
  }
  steps.push({ kind: 'fulltime', duration: 999999, scoreHome: play.finalHome, scoreAway: play.finalAway });
  return steps;
}

const OUTCOME_TEXT: Record<string, string> = { goal: 'GOL!', save: 'DEFENDEU!', miss: 'PRA FORA!' };

/** Setas marchando rumo ao gol atacado, na cor do time. */
function FieldArrows({ direction, color }: { direction: 'left' | 'right'; color: string }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to ${direction}, transparent 22%, ${color} 125%)`,
          opacity: 0.16,
        }}
      />
      <svg
        viewBox="0 0 120 60"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{ transform: direction === 'left' ? 'scaleX(-1)' : undefined }}
      >
        <g
          className="cup-march"
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22,14 46,30 22,46" />
          <polyline points="56,14 80,30 56,46" />
          <polyline points="90,14 114,30 90,46" />
        </g>
      </svg>
    </div>
  );
}

/** Mini-lance dentro do modal: bola voando rumo ao gol (começo idêntico p/ todo desfecho). */
function ShotLane({ step, accent }: { step: Step; accent: string }): JSX.Element {
  const outcome = step.shot?.outcome;
  let ballX = 8;
  let ballY = 50;
  let ms = 420;
  if (step.kind === 'windup') {
    ballX = 80;
    ms = 440;
  } else if (step.kind === 'reveal') {
    if (outcome === 'goal') {
      ballX = 90;
      ms = 200;
    } else if (outcome === 'save') {
      ballX = 34;
      ballY = 54;
      ms = 260;
    } else {
      ballX = 86;
      ballY = 12;
      ms = 260;
    }
  }
  const scored = step.kind === 'reveal' && outcome === 'goal';
  return (
    <div className="relative mx-auto mt-5 h-20 w-full max-w-sm overflow-hidden border-b-2 border-white/20">
      {/* Gol (traves) à direita */}
      <div className="absolute right-3 top-1/2 h-12 w-7 -translate-y-1/2 border-2 border-r-0 border-white/55" />
      {scored ? (
        <div
          className="cup-flash absolute right-1 top-1/2 h-14 w-10 -translate-y-1/2"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
      ) : null}
      {/* Bola */}
      <div
        className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
        style={{
          left: `${ballX}%`,
          top: `${ballY}%`,
          transitionProperty: 'left, top',
          transitionDuration: `${ms}ms`,
          transitionTimingFunction: step.kind === 'windup' ? 'cubic-bezier(0.3,0,0.2,1)' : 'ease-out',
        }}
      />
    </div>
  );
}

export function CupMatchCinematic({
  play,
  theme,
  roundName,
  managedSide,
  homeColor,
  awayColor,
  position,
  onDone,
  onSkipAll,
}: CupMatchCinematicProps): JSX.Element {
  const steps = useMemo(() => buildSteps(play), [play]);
  const [index, setIndex] = useState(0);
  const step = steps[index]!;

  useEffect(() => {
    if (step.kind === 'fulltime') return;
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), step.duration);
    return () => clearTimeout(timer);
  }, [index, step, steps.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const shot = step.shot;
  const attacking = shot?.team ?? null;
  const attackColor = attacking === 'home' ? homeColor : attacking === 'away' ? awayColor : theme.accent;
  const attackingName = attacking ? (attacking === 'home' ? play.homeName : play.awayName) : '';
  const teamTone = (side: Side): string => (managedSide === side ? 'font-extrabold text-accent' : 'text-white');
  const showModal = step.kind === 'windup' || step.kind === 'reveal';

  return (
    <div className="fixed inset-0 z-[500] flex flex-col" style={{ backgroundColor: theme.bg }}>
      {/* Cabeçalho */}
      <header className="flex items-center justify-between px-5 py-3 lg:px-8">
        <span
          className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-broadcast"
          style={{ color: theme.accent }}
        >
          <span className="signal-dot h-2.5 w-2.5" style={{ backgroundColor: theme.accent }} aria-hidden="true" />
          {theme.label} · {roundName}
        </span>
        <div className="flex items-center gap-4">
          {position.total > 1 ? (
            <span className="font-sans text-xs uppercase tracking-broadcast text-white/55">
              Jogo {position.index + 1}/{position.total}
            </span>
          ) : null}
          {onSkipAll ? (
            <button
              type="button"
              onClick={onSkipAll}
              className="font-sans text-xs font-semibold uppercase tracking-broadcast text-white/55 transition-colors hover:text-white"
            >
              Pular tudo
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDone}
            className="font-sans text-xs font-semibold uppercase tracking-broadcast text-white/70 transition-colors hover:text-white"
          >
            {position.total > 1 ? 'Pular jogo' : 'Pular'}
          </button>
        </div>
      </header>

      {/* Placar */}
      <div className="flex items-center justify-center gap-4 px-5 lg:gap-8">
        <span className={`font-display text-xl font-bold uppercase lg:text-2xl ${teamTone('home')}`}>
          {play.homeName}
        </span>
        <span className="font-display text-4xl font-extrabold tabular-nums" style={{ color: theme.accent }}>
          {step.scoreHome} <span className="text-white/40">×</span> {step.scoreAway}
        </span>
        <span className={`font-display text-xl font-bold uppercase lg:text-2xl ${teamTone('away')}`}>
          {play.awayName}
        </span>
      </div>

      {/* Campo */}
      <div className="flex flex-1 items-center justify-center px-4 py-4 lg:px-8">
        <div
          className="relative w-full max-w-4xl overflow-hidden border border-white/15"
          style={{ aspectRatio: '16 / 9', backgroundColor: 'oklch(0.34 0.05 152)' }}
        >
          {/* Linhas do campo (discretas) */}
          <div className="pointer-events-none absolute inset-2 border border-white/12" />
          <div className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/12" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
          <div className="pointer-events-none absolute left-0 top-1/2 h-14 w-1.5 -translate-y-1/2 bg-white/55" />
          <div className="pointer-events-none absolute right-0 top-1/2 h-14 w-1.5 -translate-y-1/2 bg-white/55" />

          {/* Setas de ataque na cor do time */}
          {attacking ? (
            <FieldArrows direction={attacking === 'home' ? 'right' : 'left'} color={attackColor} />
          ) : null}

          {/* Rótulo de quem ataca */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-3">
            {step.kind === 'buildup' && shot ? (
              <p className="border border-white/15 bg-black/35 px-4 py-1.5 font-display text-base font-bold uppercase tracking-wide text-white lg:text-lg">
                {attackingName} ataca · <span style={{ color: attackColor }}>{shot.shooter}</span>
              </p>
            ) : null}
            {step.kind === 'kickoff' ? (
              <p className="border border-white/15 bg-black/35 px-4 py-1.5 font-display text-base font-bold uppercase tracking-wide text-white/85">
                {play.homeName} x {play.awayName}
              </p>
            ) : null}
          </div>

          {/* Modal do chute */}
          {showModal && shot ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-4">
              <div
                key={`${index}-${step.kind}`}
                className="cup-modal-in w-full max-w-md border-2 p-6 text-center"
                style={{ backgroundColor: theme.bg, borderColor: theme.accent }}
              >
                {step.kind === 'windup' ? (
                  <>
                    <p className="font-sans text-xs uppercase tracking-broadcast text-white/65">
                      {shot.minute}' · {attackingName}
                    </p>
                    <p
                      key={`shooter-${index}`}
                      className="cup-shout mt-1 font-display text-4xl font-extrabold uppercase leading-none text-white lg:text-5xl"
                    >
                      {shot.shooter}
                    </p>
                    <p className="mt-2 font-display text-lg font-bold uppercase" style={{ color: theme.accent }}>
                      finaliza…
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      key={`outcome-${index}`}
                      className="cup-shout font-display text-5xl font-extrabold uppercase leading-none lg:text-6xl"
                      style={{ color: shot.outcome === 'goal' ? theme.accent : 'oklch(0.96 0.006 250)' }}
                    >
                      {OUTCOME_TEXT[shot.outcome]}
                    </p>
                    <p className="mt-2 font-sans text-sm uppercase tracking-broadcast text-white/80">
                      {shot.shooter}
                    </p>
                  </>
                )}
                <ShotLane step={step} accent={theme.accent} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Rodapé */}
      <footer className="flex items-center justify-center px-5 py-4">
        {step.kind === 'fulltime' ? (
          <div className="text-center">
            <p className="font-sans text-xs uppercase tracking-broadcast text-white/65">Fim de jogo</p>
            <p className="mb-3 font-display text-3xl font-extrabold uppercase" style={{ color: theme.accent }}>
              {play.homeName} {play.finalHome} × {play.finalAway} {play.awayName}
            </p>
            <button
              type="button"
              onClick={onDone}
              className="border px-8 py-3 font-display text-xl font-bold uppercase tracking-wide"
              style={{ backgroundColor: theme.accent, color: theme.accentInk, borderColor: theme.accent }}
            >
              {position.index + 1 < position.total ? 'Próximo jogo' : 'Continuar'}
            </button>
          </div>
        ) : (
          <p className="font-sans text-xs uppercase tracking-broadcast text-white/45">
            {shot ? `${shot.minute}'` : "0'"} · {theme.label}
          </p>
        )}
      </footer>
    </div>
  );
}
