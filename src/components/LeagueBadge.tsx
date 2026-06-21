import type { LeagueId } from '@/types';

/** Cores visíveis-no-escuro que evocam a bandeira do país (para colorir letras e a bandeira). */
const LEAGUE_LETTER_COLORS: Record<LeagueId, string[]> = {
  'premier-league': ['#ffffff', '#e63946'],
  'la-liga': ['#ffc400', '#e63946'],
  'serie-a': ['#43d17a', '#ffffff', '#e63946'],
  bundesliga: ['#ffce00', '#e63946', '#d8d8d8'],
  'ligue-1': ['#5b8cff', '#ffffff', '#e63946'],
  eredivisie: ['#ff7a00', '#ffffff', '#5b8cff'],
  'primeira-liga': ['#43d17a', '#e63946'],
  'super-lig': ['#e63946', '#ffffff'],
  allsvenskan: ['#5b8cff', '#ffce00'],
  'super-league-gr': ['#5b8cff', '#ffffff'],
  brasileirao: ['#43d17a', '#ffce00', '#5b8cff'],
  'liga-argentina': ['#75c7f0', '#ffffff'],
  'primera-uruguay': ['#75c7f0', '#ffffff', '#ffce00'],
  'primera-chile': ['#e63946', '#ffffff', '#5b8cff'],
  'primera-venezuela': ['#ffce00', '#5b8cff', '#e63946'],
  'primera-colombia': ['#ffce00', '#5b8cff', '#e63946'],
  'primera-paraguay': ['#e63946', '#ffffff', '#5b8cff'],
};

interface LeagueFlagProps {
  leagueId: LeagueId;
  className?: string;
}

/** Bandeira simplificada do país da liga (SVG, sem imagem externa). */
export function LeagueFlag({ leagueId, className = 'h-4 w-6' }: LeagueFlagProps): JSX.Element {
  return (
    <svg viewBox="0 0 3 2" className={`${className} border border-line`} aria-hidden="true">
      {renderFlag(leagueId)}
    </svg>
  );
}

function stripeFlag(leagueId: LeagueId): JSX.Element {
  const colors = LEAGUE_LETTER_COLORS[leagueId];
  const band = 2 / colors.length;
  return (
    <>
      {colors.map((color, index) => (
        <rect key={color + index} y={band * index} width="3" height={band} fill={color} />
      ))}
    </>
  );
}

function renderFlag(leagueId: LeagueId): JSX.Element {
  switch (leagueId) {
    case 'la-liga':
      return (
        <>
          <rect width="3" height="2" fill="#c60b1e" />
          <rect y="0.5" width="3" height="1" fill="#ffc400" />
        </>
      );
    case 'serie-a':
      return (
        <>
          <rect width="1" height="2" fill="#008c45" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#cd212a" />
        </>
      );
    case 'ligue-1':
      return (
        <>
          <rect width="1" height="2" fill="#0055a4" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#ef4135" />
        </>
      );
    case 'bundesliga':
      return (
        <>
          <rect width="3" height="0.667" fill="#1a1a1a" />
          <rect y="0.667" width="3" height="0.667" fill="#dd0000" />
          <rect y="1.333" width="3" height="0.667" fill="#ffce00" />
        </>
      );
    case 'brasileirao':
      return (
        <>
          <rect width="3" height="2" fill="#009c3b" />
          <polygon points="1.5,0.2 2.75,1 1.5,1.8 0.25,1" fill="#ffdf00" />
          <circle cx="1.5" cy="1" r="0.42" fill="#002776" />
        </>
      );
    case 'premier-league':
      return (
        <>
          <rect width="3" height="2" fill="#ffffff" />
          <rect x="1.3" width="0.4" height="2" fill="#cf142b" />
          <rect y="0.8" width="3" height="0.4" fill="#cf142b" />
        </>
      );
    default:
      return stripeFlag(leagueId);
  }
}

interface LeagueNameProps {
  leagueId: LeagueId;
  name: string;
  className?: string;
}

/** Nome da liga com cada letra numa cor da bandeira do país. */
export function LeagueName({ leagueId, name, className = '' }: LeagueNameProps): JSX.Element {
  const colors = LEAGUE_LETTER_COLORS[leagueId];
  let letterIndex = 0;
  return (
    <span className={className} aria-label={name}>
      {[...name].map((char, index) => {
        if (char === ' ') return <span key={index}>&nbsp;</span>;
        const color = colors[letterIndex % colors.length];
        letterIndex += 1;
        return (
          <span key={index} style={{ color }} aria-hidden="true">
            {char}
          </span>
        );
      })}
    </span>
  );
}
