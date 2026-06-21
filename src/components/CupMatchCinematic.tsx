import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { MatchPlay, ShotMoment, Side } from '@/engine/matchPlay';
import type { CupMotif, CupTheme } from '@/config/cupThemes';

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

  const steps: Step[] = [{ kind: 'kickoff', duration: 1900, scoreHome: 0, scoreAway: 0 }];
  let prevHome = 0;
  let prevAway = 0;
  for (const shot of shown) {
    steps.push({ kind: 'buildup', duration: 950, scoreHome: prevHome, scoreAway: prevAway, shot });
    steps.push({ kind: 'windup', duration: 1050, scoreHome: prevHome, scoreAway: prevAway, shot });
    steps.push({ kind: 'reveal', duration: 1500, scoreHome: shot.scoreHome, scoreAway: shot.scoreAway, shot });
    prevHome = shot.scoreHome;
    prevAway = shot.scoreAway;
  }
  steps.push({ kind: 'fulltime', duration: 999999, scoreHome: play.finalHome, scoreAway: play.finalAway });
  return steps;
}

const OUTCOME_TEXT: Record<string, string> = { goal: 'GOL!', save: 'DEFENDEU!', miss: 'PRA FORA!' };

/** Brasão da competição — desenhado à mão (sem libs de ícone). */
function Motif({
  kind,
  className,
  style,
}: {
  kind: CupMotif;
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  if (kind === 'star') {
    const pts: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? 11 : 4.4;
      const a = ((-90 + i * 36) * Math.PI) / 180;
      pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`);
    }
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
        <polygon points={pts.join(' ')} fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'globe') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        style={style}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4.2" ry="10" />
        <path d="M3 8 H21 M2 12 H22 M3 16 H21" />
      </svg>
    );
  }
  if (kind === 'cup') {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden="true">
        <path d="M6 3 h12 v3.5 a6 6 0 0 1 -12 0 z" />
        <path
          d="M6 4.2 a3 3 0 0 0 0 6 M18 4.2 a3 3 0 0 1 0 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <rect x="11" y="12" width="2" height="4" />
        <rect x="7.5" y="15.5" width="9" height="2" rx="0.5" />
        <rect x="9" y="17.5" width="6" height="2.6" rx="0.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden="true">
      <path d="M12 2 L20 5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5 Z" />
    </svg>
  );
}

/** Setas marchando rumo ao gol atacado, na cor do time. */
function FieldArrows({ direction, color }: { direction: 'left' | 'right'; color: string }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to ${direction}, transparent 30%, ${color} 135%)`,
          opacity: 0.14,
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
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        >
          <polyline points="34,18 50,30 34,42" />
          <polyline points="58,18 74,30 58,42" />
          <polyline points="82,18 98,30 82,42" />
        </g>
      </svg>
    </div>
  );
}

/** Gramado realista (listras de corte) + marcações + bordas da competição. */
function Pitch({
  theme,
  attacking,
  attackColor,
  children,
}: {
  theme: CupTheme;
  attacking: Side | null;
  attackColor: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div
      className="relative w-full max-w-4xl overflow-hidden border shadow-2xl"
      style={{ aspectRatio: '16 / 9', borderColor: theme.accent }}
    >
      {/* Placas de publicidade da competição (LED) */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-center overflow-hidden whitespace-nowrap"
        style={{ height: '7%', backgroundColor: theme.accent }}
      >
        <span
          className="font-display text-[9px] font-extrabold uppercase tracking-[0.5em]"
          style={{ color: theme.accentInk }}
        >
          {`${theme.label} · `.repeat(8)}
        </span>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 z-20 overflow-hidden"
        style={{ height: '7%', backgroundColor: theme.accent, opacity: 0.85 }}
      />

      {/* Gramado com listras de corte */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(90deg, oklch(0.37 0.06 152) 0 12.5%, oklch(0.33 0.06 152) 12.5% 25%)',
        }}
      />

      {/* Brasão d'água no círculo central */}
      <Motif
        kind={theme.motif}
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2"
        style={{ color: '#ffffff', opacity: 0.08 }}
      />

      {/* Marcações */}
      <div className="pointer-events-none absolute inset-[9%_2%] border-2 border-white/35" />
      <div className="pointer-events-none absolute inset-y-[9%] left-1/2 w-0.5 -translate-x-1/2 bg-white/35" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[26%] w-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
      {/* Grandes áreas */}
      <div className="pointer-events-none absolute left-[2%] top-1/2 h-[44%] w-[12%] -translate-y-1/2 border-2 border-l-0 border-white/35" />
      <div className="pointer-events-none absolute right-[2%] top-1/2 h-[44%] w-[12%] -translate-y-1/2 border-2 border-r-0 border-white/35" />
      {/* Pequenas áreas */}
      <div className="pointer-events-none absolute left-[2%] top-1/2 h-[22%] w-[5%] -translate-y-1/2 border-2 border-l-0 border-white/35" />
      <div className="pointer-events-none absolute right-[2%] top-1/2 h-[22%] w-[5%] -translate-y-1/2 border-2 border-r-0 border-white/35" />
      {/* Gols */}
      <div className="pointer-events-none absolute left-[0.5%] top-1/2 h-[16%] w-[1.5%] -translate-y-1/2 bg-white/70" />
      <div className="pointer-events-none absolute right-[0.5%] top-1/2 h-[16%] w-[1.5%] -translate-y-1/2 bg-white/70" />

      {/* Setas de ataque na cor do time */}
      {attacking ? (
        <FieldArrows direction={attacking === 'home' ? 'right' : 'left'} color={attackColor} />
      ) : null}

      {/* Vinheta do estádio */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ boxShadow: 'inset 0 0 90px 30px rgba(0,0,0,0.45)' }}
      />

      {children}
    </div>
  );
}

/** Mini-lance no modal: bola voando rumo ao gol (começo idêntico p/ todo desfecho). */
function ShotLane({ step, accent }: { step: Step; accent: string }): JSX.Element {
  const outcome = step.shot?.outcome;
  let ballX = 8;
  let ballY = 50;
  let ms = 420;
  if (step.kind === 'windup') {
    ballX = 78;
    ms = 440;
  } else if (step.kind === 'reveal') {
    if (outcome === 'goal') {
      ballX = 90;
      ms = 200;
    } else if (outcome === 'save') {
      ballX = 32;
      ballY = 56;
      ms = 260;
    } else {
      ballX = 86;
      ballY = 10;
      ms = 260;
    }
  }
  const scored = step.kind === 'reveal' && outcome === 'goal';
  return (
    <div className="relative mx-auto mt-5 h-20 w-full max-w-sm overflow-hidden">
      {/* gramado mini */}
      <div
        className="absolute inset-0 rounded"
        style={{
          background:
            'repeating-linear-gradient(90deg, oklch(0.37 0.06 152) 0 16%, oklch(0.33 0.06 152) 16% 32%)',
        }}
      />
      {/* Gol + rede */}
      <div
        className="absolute right-2 top-1/2 h-12 w-8 -translate-y-1/2 rounded-sm border-2 border-r-0 border-white/70"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.25) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 1px, transparent 1px 5px)',
        }}
      />
      {scored ? (
        <div
          className="cup-flash absolute right-1 top-1/2 h-14 w-10 -translate-y-1/2 rounded-sm"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
      ) : null}
      {/* Bola */}
      <div
        className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md"
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
  const teamTone = (side: Side): string => (managedSide === side ? 'text-accent' : 'text-white');
  const showModal = step.kind === 'windup' || step.kind === 'reveal';
  const isIntro = step.kind === 'kickoff';

  return (
    <div className="fixed inset-0 z-[500] flex flex-col overflow-hidden" style={{ backgroundColor: theme.bg }}>
      {/* Brilho ambiente da competição */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(60% 50% at 50% 0%, ${theme.accent} 0%, transparent 70%)`, opacity: 0.14 }}
        aria-hidden="true"
      />

      {/* Cabeçalho */}
      <header className="relative z-10 flex items-center justify-between px-5 py-3 lg:px-8">
        {isIntro ? (
          <span />
        ) : (
          <span
            className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-broadcast"
            style={{ color: theme.accent }}
          >
            <Motif kind={theme.motif} className="h-4 w-4" style={{ color: theme.accent }} />
            {theme.label} · {roundName}
          </span>
        )}
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
            className="font-sans text-xs font-semibold uppercase tracking-broadcast text-white/75 transition-colors hover:text-white"
          >
            {position.total > 1 ? 'Pular jogo' : 'Pular'}
          </button>
        </div>
      </header>

      {/* CARD DE ABERTURA — deixa claríssimo qual competição é */}
      {isIntro ? (
        <div key="intro" className="cup-intro relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Motif
            kind={theme.motif}
            className="mb-4 h-20 w-20 lg:h-24 lg:w-24"
            style={{ color: theme.accent, filter: `drop-shadow(0 0 24px ${theme.accent})` }}
          />
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.4em]" style={{ color: theme.accent }}>
            {roundName}
          </p>
          <h1
            className="mt-2 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight lg:text-6xl"
            style={{ color: theme.accent }}
          >
            {theme.label}
          </h1>
          <p className="mt-2 font-sans text-sm italic text-white/55">{theme.tagline}</p>

          <div className="mt-8 flex items-center justify-center gap-5">
            <span className="flex items-center gap-2.5">
              <span className="h-7 w-2 rounded-sm" style={{ backgroundColor: homeColor }} />
              <span className={`font-display text-2xl font-bold uppercase lg:text-3xl ${teamTone('home')}`}>
                {play.homeName}
              </span>
            </span>
            <span className="font-display text-xl font-light text-white/40">×</span>
            <span className="flex items-center gap-2.5">
              <span className={`font-display text-2xl font-bold uppercase lg:text-3xl ${teamTone('away')}`}>
                {play.awayName}
              </span>
              <span className="h-7 w-2 rounded-sm" style={{ backgroundColor: awayColor }} />
            </span>
          </div>
        </div>
      ) : step.kind === 'fulltime' ? (
        /* FIM DE JOGO */
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Motif kind={theme.motif} className="mb-3 h-14 w-14" style={{ color: theme.accent }} />
          <p className="font-sans text-xs uppercase tracking-[0.4em] text-white/65">
            {theme.label} · Fim de jogo
          </p>
          <div className="mt-3 flex items-center justify-center gap-5">
            <span className={`font-display text-3xl font-bold uppercase ${teamTone('home')}`}>{play.homeName}</span>
            <span className="font-display text-6xl font-extrabold tabular-nums" style={{ color: theme.accent }}>
              {play.finalHome} <span className="text-white/30">×</span> {play.finalAway}
            </span>
            <span className={`font-display text-3xl font-bold uppercase ${teamTone('away')}`}>{play.awayName}</span>
          </div>
          <button
            type="button"
            onClick={onDone}
            className="mt-8 border-2 px-8 py-3 font-display text-xl font-bold uppercase tracking-wide transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: theme.accent, color: theme.accentInk, borderColor: theme.accent }}
          >
            {position.index + 1 < position.total ? 'Próximo jogo' : 'Continuar'}
          </button>
        </div>
      ) : (
        /* CENA DO JOGO */
        <>
          <div className="relative z-10 flex items-center justify-center gap-4 px-5 lg:gap-8">
            <span className={`font-display text-xl font-bold uppercase lg:text-2xl ${teamTone('home')}`}>
              {play.homeName}
            </span>
            <span
              className="border-2 px-4 py-0.5 font-display text-4xl font-extrabold tabular-nums"
              style={{ color: theme.accent, borderColor: theme.accent }}
            >
              {step.scoreHome} <span className="text-white/40">×</span> {step.scoreAway}
            </span>
            <span className={`font-display text-xl font-bold uppercase lg:text-2xl ${teamTone('away')}`}>
              {play.awayName}
            </span>
          </div>

          <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-3 lg:px-8">
            <Pitch theme={theme} attacking={attacking} attackColor={attackColor}>
              {/* Lower-third: quem ataca */}
              <div className="absolute inset-x-0 bottom-[9%] z-30 flex justify-center px-3">
                {step.kind === 'buildup' && shot ? (
                  <p
                    className="border-l-4 bg-black/55 px-4 py-1.5 font-display text-base font-bold uppercase tracking-wide text-white backdrop-blur-sm lg:text-lg"
                    style={{ borderColor: attackColor }}
                  >
                    {attackingName} ataca · <span style={{ color: attackColor }}>{shot.shooter}</span>
                  </p>
                ) : null}
              </div>

              {/* Modal do chute (dentro do campo, escurece o gramado) */}
              {showModal && shot ? (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 px-4">
                  <div
                    key={`${index}-${step.kind}`}
                    className="cup-modal-in relative w-full max-w-md border-2 p-6 text-center shadow-2xl"
                    style={{ backgroundColor: theme.bg, borderColor: theme.accent }}
                  >
                    <Motif
                      kind={theme.motif}
                      className="absolute right-3 top-3 h-5 w-5"
                      style={{ color: theme.accent, opacity: 0.6 }}
                    />
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
            </Pitch>
          </div>

          <footer className="relative z-10 flex items-center justify-center px-5 py-3">
            <p className="font-sans text-xs uppercase tracking-broadcast text-white/45">
              {shot ? `${shot.minute}'` : "0'"} · {theme.label}
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
