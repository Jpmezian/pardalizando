import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
    steps.push({ kind: 'buildup', duration: 1000, scoreHome: prevHome, scoreAway: prevAway, shot });
    steps.push({ kind: 'windup', duration: 950, scoreHome: prevHome, scoreAway: prevAway, shot });
    steps.push({ kind: 'reveal', duration: 1700, scoreHome: shot.scoreHome, scoreAway: shot.scoreAway, shot });
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

interface ShotGeom {
  bx: number;
  by: number;
  bs: number;
  kx: number;
  ballMs: number;
  flash: boolean;
}

function shotGeometry(step: Step): ShotGeom {
  const shot = step.shot;
  const side = shot && shot.minute % 2 === 0 ? 'left' : 'right';
  if (step.kind === 'buildup') return { bx: 50, by: 75, bs: 1.1, kx: 50, ballMs: 650, flash: false };
  if (step.kind === 'windup') return { bx: 50, by: 55, bs: 0.85, kx: 50, ballMs: 520, flash: false };
  // reveal
  if (shot?.outcome === 'goal') {
    return { bx: side === 'left' ? 37 : 63, by: 22, bs: 0.55, kx: side === 'left' ? 58 : 42, ballMs: 360, flash: true };
  }
  if (shot?.outcome === 'save') {
    return { bx: side === 'left' ? 43 : 57, by: 33, bs: 0.7, kx: side === 'left' ? 43 : 57, ballMs: 320, flash: false };
  }
  // miss
  return { bx: side === 'left' ? 16 : 84, by: 27, bs: 0.5, kx: 50, ballMs: 340, flash: false };
}

/** Câmera de frente pro gol — gol + goleiro + bola voando, gramado em perspectiva. */
function GoalCam({
  theme,
  step,
  attackColor,
  defenderColor,
  attackingName,
}: {
  theme: CupTheme;
  step: Step;
  attackColor: string;
  defenderColor: string;
  attackingName: string;
}): JSX.Element {
  const shot = step.shot;
  const g = shotGeometry(step);
  const outcome = step.kind === 'reveal' ? shot?.outcome : undefined;

  return (
    <div
      className="relative w-full max-w-4xl overflow-hidden border shadow-2xl"
      style={{ aspectRatio: '16 / 9', borderColor: theme.accent }}
    >
      {/* Arquibancada + céu da competição */}
      <div
        className="absolute inset-x-0 top-0 h-[42%]"
        style={{ background: `linear-gradient(to bottom, ${theme.bg}, oklch(0.28 0.03 255))` }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[26%]"
        style={{ background: `linear-gradient(to bottom, ${theme.accent}, transparent)`, opacity: 0.12 }}
      />
      {/* Placa de LED no fundo */}
      <div
        className="absolute inset-x-0 top-[37%] z-10 flex items-center overflow-hidden whitespace-nowrap"
        style={{ height: '5%', backgroundColor: theme.accent }}
      >
        <span
          className="font-display text-[9px] font-extrabold uppercase tracking-[0.5em]"
          style={{ color: theme.accentInk }}
        >
          {`${theme.label} · `.repeat(10)}
        </span>
      </div>

      {/* Gramado com listras de corte */}
      <div
        className="absolute inset-x-0 bottom-0 top-[42%]"
        style={{
          background:
            'repeating-linear-gradient(0deg, oklch(0.36 0.06 152) 0 9%, oklch(0.32 0.06 152) 9% 18%)',
        }}
      />

      {/* Linhas da grande área em perspectiva */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <g fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5">
          <path d="M33 100 L41 43 M67 100 L59 43 M41 43 H59" />
          <path d="M44 43 A 7 7 0 0 1 56 43" />
          <circle cx="50" cy="72" r="0.9" fill="rgba(255,255,255,0.6)" stroke="none" />
        </g>
      </svg>

      {/* Gol */}
      <div
        className="absolute left-1/2 top-[16%] z-20 -translate-x-1/2"
        style={{ width: '46%', height: '26%' }}
      >
        {/* rede */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 7px)',
          }}
        />
        {/* travessão + postes */}
        <div className="absolute inset-x-0 top-0 h-[8%] bg-white/90" />
        <div className="absolute inset-y-0 left-0 w-[2.5%] bg-white/90" />
        <div className="absolute inset-y-0 right-0 w-[2.5%] bg-white/90" />
        {/* flash do gol */}
        {g.flash ? (
          <div className="cup-flash absolute inset-0" style={{ backgroundColor: theme.accent }} aria-hidden="true" />
        ) : null}
      </div>

      {/* Goleiro */}
      <div
        className="absolute top-[28%] z-20 -translate-x-1/2"
        style={{
          left: `${g.kx}%`,
          width: '4.5%',
          height: '13%',
          transitionProperty: 'left',
          transitionDuration: '300ms',
          transitionTimingFunction: 'cubic-bezier(0.3,0,0.2,1)',
        }}
      >
        <div
          className="absolute bottom-0 h-[72%] w-full rounded-t-md"
          style={{ backgroundColor: defenderColor }}
        />
        <div
          className="absolute left-1/2 top-0 h-[36%] w-[60%] -translate-x-1/2 rounded-full"
          style={{ backgroundColor: defenderColor }}
        />
      </div>

      {/* Bola */}
      <div
        className="absolute z-30 rounded-full bg-white shadow-lg ring-1 ring-black/20"
        style={{
          left: `${g.bx}%`,
          top: `${g.by}%`,
          width: '4%',
          aspectRatio: '1',
          transform: `translate(-50%, -50%) scale(${g.bs})`,
          transitionProperty: 'left, top, transform',
          transitionDuration: `${g.ballMs}ms`,
          transitionTimingFunction: step.kind === 'reveal' ? 'cubic-bezier(0.2,0,0.1,1)' : 'ease-in',
        }}
      />

      {/* Vinheta */}
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{ boxShadow: 'inset 0 0 80px 24px rgba(0,0,0,0.5)' }}
      />

      {/* Texto do desfecho (clímax) */}
      {outcome ? (
        <div className="pointer-events-none absolute inset-x-0 top-[6%] z-40 flex flex-col items-center">
          <p
            key={`out-${step.kind}-${shot?.minute}`}
            className="cup-shout font-display text-6xl font-extrabold uppercase leading-none lg:text-7xl"
            style={{
              color: outcome === 'goal' ? theme.accent : 'oklch(0.97 0.006 250)',
              textShadow: '0 3px 16px rgba(0,0,0,0.75)',
            }}
          >
            {OUTCOME_TEXT[outcome]}
          </p>
        </div>
      ) : null}

      {/* Quem finaliza (windup) */}
      {step.kind === 'windup' && shot ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[6%] z-40 flex flex-col items-center text-center">
          <p className="font-sans text-xs uppercase tracking-broadcast text-white/70">
            {shot.minute}' · {attackingName}
          </p>
          <p
            key={`shooter-${shot.minute}`}
            className="cup-shout font-display text-4xl font-extrabold uppercase leading-none text-white lg:text-5xl"
            style={{ textShadow: '0 3px 16px rgba(0,0,0,0.8)' }}
          >
            {shot.shooter}
          </p>
          <p className="font-display text-base font-bold uppercase" style={{ color: theme.accent }}>
            finaliza…
          </p>
        </div>
      ) : null}

      {/* Quem ataca (buildup) */}
      {step.kind === 'buildup' && shot ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[6%] z-40 flex justify-center px-3">
          <p
            className="border-l-4 bg-black/55 px-4 py-1.5 font-display text-base font-bold uppercase tracking-wide text-white backdrop-blur-sm lg:text-lg"
            style={{ borderColor: attackColor }}
          >
            {attackingName} ataca · <span style={{ color: attackColor }}>{shot.shooter}</span>
          </p>
        </div>
      ) : null}
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
  const defenderColor = attacking === 'home' ? awayColor : attacking === 'away' ? homeColor : theme.accent;
  const attackingName = attacking ? (attacking === 'home' ? play.homeName : play.awayName) : '';
  const teamTone = (side: Side): string => (managedSide === side ? 'text-accent' : 'text-white');
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
            {roundName}
          </span>
        )}
        <div className="flex items-center gap-2.5">
          {position.total > 1 ? (
            <span className="mr-1 font-sans text-xs uppercase tracking-broadcast text-white/55">
              Jogo {position.index + 1}/{position.total}
            </span>
          ) : null}
          {onSkipAll ? (
            <button
              type="button"
              onClick={onSkipAll}
              className="border border-white/25 px-3.5 py-2 font-sans text-sm font-bold uppercase tracking-broadcast text-white/70 transition-colors hover:border-white/60 hover:text-white"
            >
              Pular tudo
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDone}
            className="border-2 px-4 py-2 font-sans text-sm font-bold uppercase tracking-broadcast transition-colors"
            style={{ borderColor: theme.accent, color: theme.accent }}
          >
            {position.total > 1 ? 'Pular jogo' : 'Pular'}
          </button>
        </div>
      </header>

      {/* CARD DE ABERTURA */}
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
          <p className="font-sans text-xs uppercase tracking-[0.4em] text-white/65">{theme.label} · Fim de jogo</p>
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
          {/* Selo: JOGO DE COPA · NOME */}
          <div className="relative z-10 flex justify-center px-5">
            <span
              className="flex items-center gap-2 border-2 px-4 py-1 font-display text-sm font-extrabold uppercase tracking-broadcast lg:text-base"
              style={{ borderColor: theme.accent, color: theme.accent }}
            >
              <Motif kind={theme.motif} className="h-4 w-4" style={{ color: theme.accent }} />
              Jogo de Copa · {theme.label}
            </span>
          </div>

          {/* Placar */}
          <div className="relative z-10 mt-2 flex items-center justify-center gap-4 px-5 lg:gap-8">
            <span className={`font-display text-xl font-bold uppercase lg:text-2xl ${teamTone('home')}`}>
              {play.homeName}
            </span>
            <span
              className="border-2 px-4 py-0.5 font-display text-3xl font-extrabold tabular-nums lg:text-4xl"
              style={{ color: theme.accent, borderColor: theme.accent }}
            >
              {step.scoreHome} <span className="text-white/40">×</span> {step.scoreAway}
            </span>
            <span className={`font-display text-xl font-bold uppercase lg:text-2xl ${teamTone('away')}`}>
              {play.awayName}
            </span>
          </div>

          {/* Câmera de frente pro gol */}
          <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-3 lg:px-8">
            <GoalCam
              theme={theme}
              step={step}
              attackColor={attackColor}
              defenderColor={defenderColor}
              attackingName={attackingName}
            />
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
