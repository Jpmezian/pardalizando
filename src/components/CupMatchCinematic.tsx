import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { MatchPlay, ShootoutKick, ShotMoment, Side } from '@/engine/matchPlay';
import type { CupMotif, CupTheme } from '@/config/cupThemes';

interface CupMatchCinematicProps {
  play: MatchPlay;
  theme: CupTheme;
  roundName: string;
  managedSide: Side | null;
  homeColor: string;
  awayColor: string;
  shootout?: ShootoutKick[];
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

// Cores semânticas FIXAS pro desfecho (independentes da competição), pra deixar
// inconfundível: verde = gol, azul = defesa, vermelho = pra fora.
const GOAL_COLOR = 'oklch(0.84 0.21 145)';
const SAVE_COLOR = 'oklch(0.78 0.13 235)';
const MISS_COLOR = 'oklch(0.68 0.21 28)';
const OUTCOME_COLOR: Record<'goal' | 'save' | 'miss', string> = {
  goal: GOAL_COLOR,
  save: SAVE_COLOR,
  miss: MISS_COLOR,
};
// Goleiro com cor neutra de goleiro (não é cor de time) — tira ambiguidade.
const KEEPER_COLOR = 'oklch(0.83 0.17 95)';

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
  attackingName,
}: {
  theme: CupTheme;
  step: Step;
  attackColor: string;
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

      {/* Grande área em perspectiva (gol no topo; área mais larga que o gol, arco na frente) */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeLinejoin="round">
          {/* Grande área (18 jardas): linha de fundo no gol, abrindo até a linha da frente */}
          <path d="M22 42 L9 80 H91 L78 42" />
          {/* Meia-lua: arco na linha da frente, estufando pra fora (em direção ao batedor) */}
          <path d="M40 80 Q 50 91 60 80" />
          {/* Pequena área (5 metros) */}
          <path d="M34 42 L30 55 H70 L66 42" />
          {/* Marca do pênalti */}
          <circle cx="50" cy="61" r="1" fill="rgba(255,255,255,0.75)" stroke="none" />
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
        {/* flash do gol (verde) */}
        {g.flash ? (
          <div className="cup-flash absolute inset-0" style={{ backgroundColor: GOAL_COLOR }} aria-hidden="true" />
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
          style={{ backgroundColor: KEEPER_COLOR }}
        />
        <div
          className="absolute left-1/2 top-0 h-[36%] w-[60%] -translate-x-1/2 rounded-full"
          style={{ backgroundColor: KEEPER_COLOR }}
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

      {/* Cronômetro grande (pula de lance em lance) */}
      {shot ? (
        <div className="pointer-events-none absolute left-3 top-2 z-40 flex items-start">
          <span
            key={shot.minute}
            className="cup-clock font-display text-5xl font-extrabold leading-none tabular-nums lg:text-6xl"
            style={{ color: theme.accent, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
          >
            {shot.minute}
            <span className="text-2xl lg:text-3xl">'</span>
          </span>
        </div>
      ) : null}

      {/* Banner de quem ataca (buildup + windup) — nome do time bem claro */}
      {(step.kind === 'buildup' || step.kind === 'windup') && shot ? (
        <div className="pointer-events-none absolute inset-x-0 top-[6%] z-40 flex justify-center px-3">
          <div
            className="flex items-center gap-2.5 border-2 bg-black/55 px-4 py-1.5 backdrop-blur-sm"
            style={{ borderColor: attackColor }}
          >
            <span className="h-5 w-5 rounded-sm" style={{ backgroundColor: attackColor }} />
            <span className="font-display text-xl font-extrabold uppercase tracking-wide text-white lg:text-2xl">
              {attackingName}
            </span>
            <span className="font-display text-xl font-extrabold uppercase lg:text-2xl" style={{ color: attackColor }}>
              ataca
            </span>
          </div>
        </div>
      ) : null}

      {/* Texto do desfecho (clímax) — cor semântica: verde gol / azul defesa / vermelho fora */}
      {outcome ? (
        <div className="pointer-events-none absolute inset-x-0 top-[6%] z-40 flex flex-col items-center">
          <p
            key={`out-${step.kind}-${shot?.minute}`}
            className="cup-shout font-display text-7xl font-extrabold uppercase leading-none lg:text-8xl"
            style={{ color: OUTCOME_COLOR[outcome], textShadow: '0 3px 18px rgba(0,0,0,0.8)' }}
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

    </div>
  );
}

const PEN_OUTCOME: Record<'goal' | 'save' | 'miss', string> = {
  goal: 'GOL!',
  save: 'DEFENDEU!',
  miss: 'PERDEU!',
};

/** Disputa de pênaltis — tensão alternada, marcadores acumulando, clímax na cobrança decisiva. */
function PenaltyShootout({
  theme,
  kicks,
  homeName,
  awayName,
  homeColor,
  awayColor,
  managedSide,
  onDone,
  continueLabel,
}: {
  theme: CupTheme;
  kicks: ShootoutKick[];
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
  managedSide: Side | null;
  onDone: () => void;
  continueLabel: string;
}): JSX.Element {
  // Sequência de momentos: cada cobrança = mira + chute; depois o vencedor.
  const moments = useMemo(() => {
    const out: Array<{ type: 'aim' | 'hit'; i: number } | { type: 'winner' }> = [];
    kicks.forEach((_, i) => {
      out.push({ type: 'aim', i });
      out.push({ type: 'hit', i });
    });
    out.push({ type: 'winner' });
    return out;
  }, [kicks]);

  const [m, setM] = useState(0);
  const moment = moments[m]!;

  useEffect(() => {
    if (moment.type === 'winner') return;
    const dur = moment.type === 'aim' ? 900 : 1500;
    const timer = setTimeout(() => setM((v) => Math.min(v + 1, moments.length - 1)), dur);
    return () => clearTimeout(timer);
  }, [m, moment, moments.length]);

  const resolved = (i: number): boolean => m >= i * 2 + 1;
  const indexed = kicks.map((k, i) => ({ ...k, i }));
  const homeKicks = indexed.filter((k) => k.team === 'home');
  const awayKicks = indexed.filter((k) => k.team === 'away');
  const homeScore = homeKicks.filter((k) => resolved(k.i) && k.scored).length;
  const awayScore = awayKicks.filter((k) => resolved(k.i) && k.scored).length;
  const suddenDeath = moment.type !== 'winner' && 'i' in moment && moment.i >= 10;

  const current = moment.type !== 'winner' ? kicks[(moment as { i: number }).i] : undefined;
  const kickingSide = current?.team ?? null;
  const kickerColor = kickingSide === 'home' ? homeColor : kickingSide === 'away' ? awayColor : theme.accent;
  const kickingName = kickingSide === 'home' ? homeName : kickingSide === 'away' ? awayName : '';
  const kickerName = current?.kicker ?? kickingName;

  // Geometria do chute (mira no centro; chute diverge no fim).
  const idx = moment.type !== 'winner' ? (moment as { i: number }).i : 0;
  const side = idx % 2 === 0 ? 'left' : 'right';
  const isSave = current ? !current.scored && idx % 3 !== 0 : false;
  const outcome: 'goal' | 'save' | 'miss' = current?.scored ? 'goal' : isSave ? 'save' : 'miss';
  let bx = 50;
  let by = 78;
  let bs = 1.15;
  let kx = 50;
  let ms = 480;
  let flash = false;
  if (moment.type === 'hit') {
    if (outcome === 'goal') {
      bx = side === 'left' ? 36 : 64;
      by = 24;
      bs = 0.55;
      kx = side === 'left' ? 60 : 40;
      ms = 340;
      flash = true;
    } else if (outcome === 'save') {
      bx = side === 'left' ? 44 : 56;
      by = 34;
      bs = 0.7;
      kx = side === 'left' ? 44 : 56;
      ms = 300;
    } else {
      bx = side === 'left' ? 14 : 86;
      by = 22;
      bs = 0.5;
      ms = 320;
    }
  }

  const winnerSide: Side = homeScore > awayScore ? 'home' : 'away';
  const winnerName = winnerSide === 'home' ? homeName : awayName;
  const winnerColor = winnerSide === 'home' ? homeColor : awayColor;
  const tone = (side2: Side): string => (managedSide === side2 ? 'text-accent' : 'text-white');

  // Marcadores: verde = converteu, vermelho × = perdeu (claro independente do time).
  const markerRow = (teamKicks: typeof homeKicks): JSX.Element => (
    <div className="flex items-center gap-1.5">
      {teamKicks.map((k) => {
        const done = resolved(k.i);
        if (!done) {
          return <span key={k.i} className="h-3.5 w-3.5 rounded-full border border-white/25" />;
        }
        return k.scored ? (
          <span key={k.i} className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: GOAL_COLOR }} />
        ) : (
          <span
            key={k.i}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] font-bold"
            style={{ borderColor: MISS_COLOR, color: MISS_COLOR }}
          >
            ×
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="relative z-10 flex flex-1 flex-col px-5 py-2 lg:px-8">
      <div className="text-center">
        <p className="font-display text-sm font-extrabold uppercase tracking-[0.4em]" style={{ color: theme.accent }}>
          {theme.label} · Pênaltis
        </p>
        {suddenDeath ? (
          <p className="mt-0.5 font-display text-xs font-bold uppercase tracking-broadcast text-live">
            Morte súbita
          </p>
        ) : null}
      </div>

      {/* Marcadores + placar dos pênaltis */}
      <div className="mx-auto mt-3 grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <span className={`flex items-center gap-2 font-display text-sm font-bold uppercase ${tone('home')}`}>
            {homeName}
            <span className="h-3.5 w-1.5 rounded-sm" style={{ backgroundColor: homeColor }} />
          </span>
          {markerRow(homeKicks)}
        </div>
        <span className="font-display text-3xl font-extrabold tabular-nums" style={{ color: theme.accent }}>
          {homeScore} <span className="text-white/30">×</span> {awayScore}
        </span>
        <div className="flex flex-col items-start gap-1">
          <span className={`flex items-center gap-2 font-display text-sm font-bold uppercase ${tone('away')}`}>
            <span className="h-3.5 w-1.5 rounded-sm" style={{ backgroundColor: awayColor }} />
            {awayName}
          </span>
          {markerRow(awayKicks)}
        </div>
      </div>

      {/* Cena */}
      <div className="flex flex-1 items-center justify-center py-3">
        {moment.type === 'winner' ? (
          <div className="cup-intro flex flex-col items-center text-center">
            <span className="mb-3 h-2 w-16 rounded-sm" style={{ backgroundColor: winnerColor }} />
            <p className="font-sans text-xs uppercase tracking-[0.4em] text-white/65">Classificado</p>
            <h2
              className="mt-1 font-display text-5xl font-extrabold uppercase leading-none lg:text-7xl"
              style={{ color: winnerColor, textShadow: '0 3px 18px rgba(0,0,0,0.7)' }}
            >
              {winnerName}
            </h2>
            <p className="mt-2 font-display text-2xl font-bold uppercase" style={{ color: theme.accent }}>
              {homeScore} × {awayScore} nos pênaltis
            </p>
            <button
              type="button"
              onClick={onDone}
              className="mt-7 border-2 px-8 py-3 font-display text-xl font-bold uppercase tracking-wide transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: theme.accent, color: theme.accentInk, borderColor: theme.accent }}
            >
              {continueLabel}
            </button>
          </div>
        ) : (
          <div
            className="relative w-full max-w-xl overflow-hidden border shadow-2xl"
            style={{ aspectRatio: '2 / 1', borderColor: theme.accent }}
          >
            {/* Fundo */}
            <div className="absolute inset-x-0 top-0 h-[40%]" style={{ background: `linear-gradient(${theme.bg}, oklch(0.28 0.03 255))` }} />
            <div
              className="absolute inset-x-0 bottom-0 top-[40%]"
              style={{
                background:
                  'repeating-linear-gradient(0deg, oklch(0.36 0.06 152) 0 10%, oklch(0.32 0.06 152) 10% 20%)',
              }}
            />
            {/* Gol */}
            <div className="absolute left-1/2 top-[14%] z-20 -translate-x-1/2" style={{ width: '46%', height: '28%' }}>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 7px)',
                }}
              />
              <div className="absolute inset-x-0 top-0 h-[8%] bg-white/90" />
              <div className="absolute inset-y-0 left-0 w-[2.5%] bg-white/90" />
              <div className="absolute inset-y-0 right-0 w-[2.5%] bg-white/90" />
              {flash ? (
                <div className="cup-flash absolute inset-0" style={{ backgroundColor: GOAL_COLOR }} aria-hidden="true" />
              ) : null}
            </div>
            {/* Goleiro (cor neutra de goleiro) */}
            <div
              className="absolute top-[26%] z-20 -translate-x-1/2"
              style={{
                left: `${kx}%`,
                width: '5%',
                height: '15%',
                transitionProperty: 'left',
                transitionDuration: '280ms',
                transitionTimingFunction: 'cubic-bezier(0.3,0,0.2,1)',
              }}
            >
              <div className="absolute bottom-0 h-[72%] w-full rounded-t-md" style={{ backgroundColor: KEEPER_COLOR }} />
              <div className="absolute left-1/2 top-0 h-[36%] w-[60%] -translate-x-1/2 rounded-full" style={{ backgroundColor: KEEPER_COLOR }} />
            </div>
            {/* Bola */}
            <div
              className="absolute z-30 rounded-full bg-white shadow-lg ring-1 ring-black/20"
              style={{
                left: `${bx}%`,
                top: `${by}%`,
                width: '4.5%',
                aspectRatio: '1',
                transform: `translate(-50%, -50%) scale(${bs})`,
                transitionProperty: 'left, top, transform',
                transitionDuration: `${ms}ms`,
                transitionTimingFunction: moment.type === 'hit' ? 'cubic-bezier(0.2,0,0.1,1)' : 'ease-in',
              }}
            />
            <div className="pointer-events-none absolute inset-0 z-30" style={{ boxShadow: 'inset 0 0 60px 18px rgba(0,0,0,0.5)' }} />

            {/* Texto: quem cobra (com o nome do jogador) / desfecho */}
            {moment.type === 'aim' ? (
              <div className="absolute inset-x-0 bottom-[5%] z-40 flex flex-col items-center text-center">
                <span className="flex items-center gap-2 font-sans text-xs uppercase tracking-broadcast text-white/75">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: kickerColor }} />
                  {kickingName} · cobra
                </span>
                <p
                  key={`kicker-${idx}`}
                  className="cup-shout font-display text-3xl font-extrabold uppercase leading-none text-white lg:text-4xl"
                  style={{ textShadow: '0 3px 16px rgba(0,0,0,0.8)' }}
                >
                  {kickerName}
                </p>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-x-0 top-[4%] z-40 flex flex-col items-center text-center">
                <p
                  key={`pen-${idx}`}
                  className="cup-shout font-display text-5xl font-extrabold uppercase leading-none lg:text-6xl"
                  style={{ color: OUTCOME_COLOR[outcome], textShadow: '0 3px 16px rgba(0,0,0,0.8)' }}
                >
                  {PEN_OUTCOME[outcome]}
                </p>
                <p className="mt-1 font-sans text-sm uppercase tracking-broadcast text-white/80">{kickerName}</p>
              </div>
            )}
          </div>
        )}
      </div>
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
  shootout,
  position,
  onDone,
  onSkipAll,
}: CupMatchCinematicProps): JSX.Element {
  const steps = useMemo(() => buildSteps(play), [play]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'match' | 'shootout'>('match');
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
      ) : phase === 'shootout' && shootout ? (
        <PenaltyShootout
          theme={theme}
          kicks={shootout}
          homeName={play.homeName}
          awayName={play.awayName}
          homeColor={homeColor}
          awayColor={awayColor}
          managedSide={managedSide}
          onDone={onDone}
          continueLabel={position.index + 1 < position.total ? 'Próximo jogo' : 'Continuar'}
        />
      ) : step.kind === 'fulltime' ? (
        /* FIM DE JOGO */
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Motif kind={theme.motif} className="mb-3 h-14 w-14" style={{ color: theme.accent }} />
          <p className="font-sans text-xs uppercase tracking-[0.4em] text-white/65">
            {theme.label} · {shootout ? 'Empate em 90′' : 'Fim de jogo'}
          </p>
          <div className="mt-3 grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-5">
            <span className={`truncate text-right font-display text-3xl font-bold uppercase ${teamTone('home')}`}>
              {play.homeName}
            </span>
            <span className="font-display text-6xl font-extrabold tabular-nums" style={{ color: theme.accent }}>
              {play.finalHome} <span className="text-white/30">×</span> {play.finalAway}
            </span>
            <span className={`truncate text-left font-display text-3xl font-bold uppercase ${teamTone('away')}`}>
              {play.awayName}
            </span>
          </div>
          {shootout ? (
            <button
              type="button"
              onClick={() => setPhase('shootout')}
              className="cup-pulse mt-8 border-2 px-8 py-3 font-display text-xl font-bold uppercase tracking-wide transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: theme.accent, color: theme.accentInk, borderColor: theme.accent }}
            >
              Disputa de pênaltis →
            </button>
          ) : (
            <button
              type="button"
              onClick={onDone}
              className="mt-8 border-2 px-8 py-3 font-display text-xl font-bold uppercase tracking-wide transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: theme.accent, color: theme.accentInk, borderColor: theme.accent }}
            >
              {position.index + 1 < position.total ? 'Próximo jogo' : 'Continuar'}
            </button>
          )}
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

          {/* Placar (grid 3 colunas: o × fica centralizado na tela; chip = cor do time) */}
          <div className="relative z-10 mx-auto mt-2 grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5">
            <span className="flex items-center justify-end gap-2 overflow-hidden">
              <span className={`truncate font-display text-xl font-bold uppercase lg:text-2xl ${teamTone('home')}`}>
                {play.homeName}
              </span>
              <span className="h-6 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: homeColor }} />
            </span>
            <span
              className="border-2 px-4 py-0.5 font-display text-3xl font-extrabold tabular-nums lg:text-4xl"
              style={{ color: theme.accent, borderColor: theme.accent }}
            >
              {step.scoreHome} <span className="text-white/40">×</span> {step.scoreAway}
            </span>
            <span className="flex items-center gap-2 overflow-hidden">
              <span className="h-6 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: awayColor }} />
              <span className={`truncate font-display text-xl font-bold uppercase lg:text-2xl ${teamTone('away')}`}>
                {play.awayName}
              </span>
            </span>
          </div>

          {/* Câmera de frente pro gol */}
          <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-3 lg:px-8">
            <GoalCam theme={theme} step={step} attackColor={attackColor} attackingName={attackingName} />
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
