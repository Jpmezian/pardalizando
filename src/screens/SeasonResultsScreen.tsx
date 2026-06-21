import { useMemo, useState } from 'react';
import type { Club, GameState, Player, PlayerSeasonStats } from '@/types';
import type { SeasonOutcome } from '@/engine/season';
import type { CupResult, CupTie } from '@/engine/cup';
import type { CompetitionResult } from '@/engine/competition';
import type { InjuryEvent } from '@/engine/injuries';
import { computeSeasonAwards } from '@/engine/awards';
import { BOARD_START, evaluateBoard } from '@/engine/board';
import { useGameStore, type CupsView, type ViewedCompetition } from '@/store/gameStore';
import { getAllPlayers, getClub } from '@/data/dataset';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { BroadcastButton } from '@/components/BroadcastButton';
import { ClubLink } from '@/components/ClubLink';
import { Poster } from '@/components/Poster';
import { findCaptainId, seasonYearLabel } from '@/lib/format';

type ResultsTab = 'table' | 'scorers' | 'squad' | 'cups' | 'prizes' | 'injuries';

export function SeasonResultsScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const season = useGameStore((state) => state.lastSeason);
  const cups = useGameStore((state) => state.lastCups);
  const injuries = useGameStore((state) => state.lastInjuries);
  const goToMarket = useGameStore((state) => state.goToMarket);
  const advanceSeason = useGameStore((state) => state.advanceSeason);
  const backToLineup = useGameStore((state) => state.backToLineup);
  const [tab, setTab] = useState<ResultsTab>('table');

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  if (!game || !managedClub || !season) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <BroadcastTopBar onBack={backToLineup} backLabel="Escalação" />
        <main className="flex flex-1 items-center justify-center px-5">
          <p className="font-sans text-ink-muted">Nenhuma temporada simulada ainda.</p>
        </main>
      </div>
    );
  }

  const position = season.table.findIndex((row) => row.clubId === managedClub.id) + 1;
  const isChampion = position === 1;
  const verdict = evaluateBoard(
    managedClub.reputation,
    season.table.length,
    position,
    game.boardConfidence ?? BOARD_START,
  );

  const trophies: Array<{ kicker: string; title: string; subtitle: string }> = [];
  if (isChampion) {
    trophies.push({
      kicker: 'Campeão da liga',
      title: managedClub.name,
      subtitle: seasonYearLabel(season.season),
    });
  }
  if (cups?.national.championId === managedClub.id) {
    trophies.push({ kicker: 'Copa Nacional', title: 'Conquistada', subtitle: 'Mata-mata' });
  }
  if (cups?.champions.championId === managedClub.id) {
    trophies.push({ kicker: 'Champions', title: 'Conquistada', subtitle: 'Elite da Europa' });
  }
  if (cups?.libertadores.championId === managedClub.id) {
    trophies.push({ kicker: 'Libertadores', title: 'Conquistada', subtitle: 'Glória sul-americana' });
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar
        onBack={backToLineup}
        backLabel="Escalação"
        rightLabel={`Temporada ${season.season}`}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              {managedClub.name} · {seasonYearLabel(season.season)}
            </p>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight lg:text-5xl">
              {isChampion ? 'Campeão!' : `${position}º lugar`}
            </h1>
          </div>
          {isChampion ? (
            <span className="border border-accent bg-accent px-3 py-1 font-display text-sm font-bold uppercase tracking-wide text-accent-ink">
              Título da liga
            </span>
          ) : null}
        </div>

        <div
          className={`mt-5 border px-4 py-3 ${verdict.fired ? 'border-live' : verdict.met ? 'border-accent' : 'border-line'}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-sans text-xs uppercase tracking-broadcast text-ink-faint">
                Objetivo: {verdict.objective.label}
              </p>
              <p
                className={`mt-0.5 font-display text-xl font-bold uppercase ${verdict.met ? 'text-accent' : 'text-live'}`}
              >
                {verdict.met ? 'Cumprido' : 'Não cumprido'}
                <span className="text-ink-muted"> · {position}º lugar</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-sans text-xs uppercase tracking-broadcast text-ink-faint">
                Confiança da diretoria
              </p>
              <p className="font-display text-xl font-bold tabular-nums">
                {verdict.confidenceBefore} → {verdict.confidenceAfter}{' '}
                <span className={verdict.delta >= 0 ? 'text-accent' : 'text-live'}>
                  ({verdict.delta >= 0 ? '+' : ''}
                  {verdict.delta})
                </span>
              </p>
            </div>
          </div>
          {verdict.fired ? (
            <p className="mt-2 font-sans text-sm font-semibold text-live">
              A diretoria perdeu a paciência. Ao avançar a temporada, você será demitido.
            </p>
          ) : null}
        </div>

        {trophies.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {trophies.map((trophy) => (
              <Poster
                key={trophy.kicker}
                kicker={trophy.kicker}
                title={trophy.title}
                subtitle={trophy.subtitle}
              />
            ))}
          </div>
        ) : null}

        <nav className="mt-5 flex flex-wrap gap-1 border-b border-line">
          <TabButton active={tab === 'table'} onClick={() => setTab('table')}>
            Tabela
          </TabButton>
          <TabButton active={tab === 'scorers'} onClick={() => setTab('scorers')}>
            Artilharia
          </TabButton>
          <TabButton active={tab === 'squad'} onClick={() => setTab('squad')}>
            Meu time
          </TabButton>
          <TabButton active={tab === 'cups'} onClick={() => setTab('cups')}>
            Copas
          </TabButton>
          <TabButton active={tab === 'prizes'} onClick={() => setTab('prizes')}>
            Prêmios
          </TabButton>
          <TabButton active={tab === 'injuries'} onClick={() => setTab('injuries')}>
            Lesões
          </TabButton>
        </nav>

        <div className="mt-5">
          {tab === 'table' ? <LeagueTable game={game} season={season} /> : null}
          {tab === 'scorers' ? <Scorers game={game} season={season} /> : null}
          {tab === 'squad' ? <SquadStats game={game} club={managedClub} /> : null}
          {tab === 'cups' ? <CupsTab game={game} cups={cups} managedId={managedClub.id} /> : null}
          {tab === 'prizes' ? <AwardsTab game={game} season={season} cups={cups} /> : null}
          {tab === 'injuries' ? <InjuriesTab injuries={injuries} /> : null}
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <BroadcastButton variant="primary" onClick={advanceSeason}>
            Avançar para a próxima temporada
          </BroadcastButton>
          <BroadcastButton variant="ghost" onClick={goToMarket}>
            Ir ao mercado
          </BroadcastButton>
        </div>
        <p className="mt-4 text-center font-sans text-xs text-ink-faint">
          Ao avançar: todos envelhecem, jovens evoluem, veteranos declinam, e você recebe a receita
          da temporada.
        </p>
      </main>
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

interface SeasonContentProps {
  game: GameState;
  season: SeasonOutcome;
}

function LeagueTable({ game, season }: SeasonContentProps): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-line text-left font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
          <th className="py-2 pr-2 text-right font-semibold">#</th>
          <th className="py-2 pl-3 font-semibold">Clube</th>
          <th className="py-2 px-2 text-right font-semibold">J</th>
          <th className="py-2 px-2 text-right font-semibold">V</th>
          <th className="py-2 px-2 text-right font-semibold">E</th>
          <th className="py-2 px-2 text-right font-semibold">D</th>
          <th className="py-2 px-2 text-right font-semibold">SG</th>
          <th className="py-2 pl-2 text-right font-semibold">P</th>
        </tr>
      </thead>
      <tbody>
        {season.table.map((row, index) => {
          const isManaged = row.clubId === game.managedClubId;
          const diff = row.goalsFor - row.goalsAgainst;
          return (
            <tr
              key={row.clubId}
              className={`border-b border-line tabular-nums ${isManaged ? 'bg-surface-raised' : ''}`}
            >
              <td className="py-2 pr-2 text-right font-display font-bold text-ink-faint">
                {index + 1}
              </td>
              <td className="py-2 pl-3 font-sans">
                <ClubLink
                  clubId={row.clubId}
                  name={game.clubs[row.clubId]?.name ?? row.clubId}
                  className={isManaged ? 'font-bold text-accent' : ''}
                />
              </td>
              <td className="py-2 px-2 text-right text-ink-muted">{row.played}</td>
              <td className="py-2 px-2 text-right text-ink-muted">{row.won}</td>
              <td className="py-2 px-2 text-right text-ink-muted">{row.drawn}</td>
              <td className="py-2 px-2 text-right text-ink-muted">{row.lost}</td>
              <td className="py-2 px-2 text-right text-ink-muted">
                {diff > 0 ? `+${diff}` : diff}
              </td>
              <td className="py-2 pl-2 text-right font-display text-lg font-bold">{row.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Scorers({ game, season }: SeasonContentProps): JSX.Element {
  const scorers = Object.entries(season.stats)
    .map(([playerId, stats]) => ({ player: game.players[playerId], stats }))
    .filter(
      (entry): entry is { player: Player; stats: PlayerSeasonStats } =>
        entry.player !== undefined && entry.stats.goals > 0,
    )
    .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists)
    .slice(0, 20);

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-line text-left font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
          <th className="py-2 pr-2 text-right font-semibold">#</th>
          <th className="py-2 pl-3 font-semibold">Jogador</th>
          <th className="py-2 px-2 font-semibold">Clube</th>
          <th className="py-2 px-2 text-right font-semibold">A</th>
          <th className="py-2 pl-2 text-right font-semibold">Gols</th>
        </tr>
      </thead>
      <tbody>
        {scorers.map((entry, index) => {
          const mine = entry.player.clubId === game.managedClubId;
          return (
            <tr
              key={entry.player.id}
              className={`border-b border-line tabular-nums ${mine ? 'bg-surface-raised' : ''}`}
            >
              <td className="py-2 pr-2 text-right font-display font-bold text-ink-faint">
                {index + 1}
              </td>
              <td className={`py-2 pl-3 font-sans ${mine ? 'font-bold text-accent' : ''}`}>
                {entry.player.name}
              </td>
              <td className="py-2 px-2 font-sans text-sm text-ink-muted">
                <ClubLink
                  clubId={entry.player.clubId}
                  name={game.clubs[entry.player.clubId]?.name ?? clubName(game, entry.player.clubId)}
                />
              </td>
              <td className="py-2 px-2 text-right text-ink-muted">{entry.stats.assists}</td>
              <td className="py-2 pl-2 text-right font-display text-lg font-bold text-accent">
                {entry.stats.goals}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface SquadStatsProps {
  game: GameState;
  club: Club;
}

type SortKey = 'apps' | 'goals' | 'assists' | 'rating';

function statValue(player: Player, key: SortKey): number {
  const stats = player.seasonStats!;
  if (key === 'rating') return stats.apps > 0 ? stats.ratingSum / stats.apps : 0;
  return stats[key];
}

function SquadStats({ game, club }: SquadStatsProps): JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>('goals');
  const [descending, setDescending] = useState(true);

  const players = club.squad
    .map((id) => game.players[id])
    .filter(
      (player): player is Player =>
        player?.seasonStats !== undefined && player.seasonStats.apps > 0,
    );

  const sorted = [...players].sort((a, b) => {
    const delta = statValue(b, sortKey) - statValue(a, sortKey);
    return descending ? delta : -delta;
  });

  const toggleSort = (key: SortKey): void => {
    if (key === sortKey) setDescending((value) => !value);
    else {
      setSortKey(key);
      setDescending(true);
    }
  };

  const captainId = findCaptainId(club.squad, game.players);

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-line text-left font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
          <th className="py-2 pr-3 font-semibold">Jogador</th>
          <th className="py-2 px-2 text-right font-semibold">Idade</th>
          <SortHeader label="Jogos" active={sortKey === 'apps'} descending={descending} onClick={() => toggleSort('apps')} />
          <SortHeader label="Gols" active={sortKey === 'goals'} descending={descending} onClick={() => toggleSort('goals')} />
          <SortHeader label="Assist." active={sortKey === 'assists'} descending={descending} onClick={() => toggleSort('assists')} />
          <SortHeader label="Nota" active={sortKey === 'rating'} descending={descending} onClick={() => toggleSort('rating')} />
        </tr>
      </thead>
      <tbody>
        {sorted.map((player) => {
          const stats = player.seasonStats!;
          const avg = stats.apps > 0 ? stats.ratingSum / stats.apps : 0;
          return (
            <tr key={player.id} className="border-b border-line tabular-nums">
              <td className="py-2 pr-3 font-sans">
                <span className="mr-2 font-display text-xs text-ink-faint">{player.subPos}</span>
                {player.name}
                {player.id === captainId ? (
                  <span className="ml-2 border border-accent px-1 font-display text-[10px] font-bold text-accent">
                    C
                  </span>
                ) : null}
              </td>
              <td className="py-2 px-2 text-right text-ink-muted">{player.age}</td>
              <td className="py-2 px-2 text-right text-ink-muted">{stats.apps}</td>
              <td className="py-2 px-2 text-right text-ink-muted">{stats.goals}</td>
              <td className="py-2 px-2 text-right text-ink-muted">{stats.assists}</td>
              <td className="py-2 pl-2 text-right font-display text-lg font-bold text-ink">
                {avg.toFixed(1)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  descending: boolean;
  onClick: () => void;
}

function SortHeader({ label, active, descending, onClick }: SortHeaderProps): JSX.Element {
  return (
    <th className="py-2 px-2 text-right font-semibold">
      <button
        type="button"
        onClick={onClick}
        className={`uppercase tracking-broadcast transition-colors duration-150 ${active ? 'text-accent' : 'hover:text-ink-muted'}`}
      >
        {label}
        {active ? (descending ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  );
}

const AWARD_DEFS = [
  { key: 'mvp', kicker: 'Bola de Ouro' },
  { key: 'topScorer', kicker: 'Chuteira de Ouro' },
  { key: 'topAssist', kicker: 'Garçom do ano' },
  { key: 'goldenGlove', kicker: 'Luva de Ouro' },
  { key: 'youngPlayer', kicker: 'Joia da temporada' },
] as const;

function awardSubtitle(
  key: (typeof AWARD_DEFS)[number]['key'],
  player: Player,
  stats: PlayerSeasonStats,
): string {
  const avg = stats.apps > 0 ? (stats.ratingSum / stats.apps).toFixed(1) : '0.0';
  switch (key) {
    case 'topScorer':
      return `${stats.goals} gols`;
    case 'topAssist':
      return `${stats.assists} assistências`;
    case 'goldenGlove':
      return `${stats.cleanSheets} jogos sem sofrer`;
    case 'youngPlayer':
      return `${player.age} anos · ${stats.goals}G ${stats.assists}A`;
    case 'mvp':
    default:
      return `${stats.goals}G · ${stats.assists}A · nota ${avg}`;
  }
}

function AwardsTab({
  game,
  season,
  cups,
}: SeasonContentProps & { cups: CupsView | null }): JSX.Element {
  // Mundo todo: jogadores do dataset, com a sua liga sobreposta pela versão evoluída.
  const worldPlayers = useMemo(() => {
    const byId = new Map(getAllPlayers().map((entry) => [entry.id, entry]));
    for (const entry of Object.values(game.players)) byId.set(entry.id, entry);
    return [...byId.values()];
  }, [game.players]);

  const awards = useMemo(
    () => computeSeasonAwards(worldPlayers, season.stats, cups?.champions, cups?.libertadores),
    [worldPlayers, season.stats, cups],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {AWARD_DEFS.map((def) => {
        const winner = awards[def.key];
        if (!winner) return null;
        const { player, stats } = winner;
        return (
          <div key={def.key}>
            <Poster
              kicker={def.kicker}
              title={player.name}
              subtitle={awardSubtitle(def.key, player, stats)}
            />
            <p className="mt-1.5 text-center font-sans text-xs text-ink-muted">
              <ClubLink
                clubId={player.clubId}
                name={clubName(game, player.clubId)}
                className="font-semibold text-ink"
              />
              {player.nationality ? (
                <span className="text-ink-faint"> · {player.nationality}</span>
              ) : null}
            </p>
            {player.clubId === game.managedClubId ? (
              <p className="mt-0.5 text-center font-sans text-xs uppercase tracking-broadcast text-accent">
                Do seu time
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function InjuriesTab({ injuries }: { injuries: InjuryEvent[] | null }): JSX.Element {
  if (!injuries || injuries.length === 0) {
    return (
      <p className="font-sans text-ink-muted">Nenhuma lesão nesta temporada — elenco inteiro à disposição.</p>
    );
  }

  const serious = injuries.filter((injury) => injury.serious);
  const minor = injuries.filter((injury) => !injury.serious);

  return (
    <div className="flex flex-col gap-5">
      {serious.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {serious.map((injury) => (
            <InjuryPoster key={injury.playerId} injury={injury} />
          ))}
        </div>
      ) : null}

      {minor.length > 0 ? (
        <div>
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
            Departamento médico
          </p>
          <ul className="border border-line">
            {minor.map((injury) => (
              <li
                key={injury.playerId}
                className="border-b border-line px-4 py-2 font-sans text-sm text-ink-muted last:border-b-0"
              >
                {injury.headline}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function InjuryPoster({ injury }: { injury: InjuryEvent }): JSX.Element {
  const careerEnding = injury.seasonsOut >= 99;
  return (
    <div
      className="poster-rise poster-shine relative overflow-hidden border border-live bg-surface px-5 py-6 text-center"
      style={{ boxShadow: '0 0 40px -12px var(--c-live)' }}
    >
      <p className="font-display text-xs font-bold uppercase tracking-broadcast text-live">
        {careerEnding ? 'Carreira encerrada' : 'Lesão grave'}
      </p>
      <p className="mt-3 font-display text-xl font-extrabold uppercase leading-tight">
        {injury.playerName}
      </p>
      <p className="mt-2 font-sans text-sm text-ink-muted">{injury.headline}</p>
    </div>
  );
}

function clubName(game: GameState, id: string): string {
  return game.clubs[id]?.name ?? getClub(id)?.name ?? id;
}

interface CupsTabProps {
  game: GameState;
  cups: CupsView | null;
  managedId: string;
}

function CupsTab({ game, cups, managedId }: CupsTabProps): JSX.Element {
  const goToCompetition = useGameStore((state) => state.goToCompetition);
  if (!cups) {
    return <p className="font-sans text-ink-muted">Sem copas nesta temporada.</p>;
  }

  const viewButton = (label: string, competition: ViewedCompetition): JSX.Element => (
    <button
      type="button"
      onClick={() => goToCompetition(competition)}
      className="mt-2 w-full border border-line px-3 py-2 font-sans text-sm font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:border-ink-faint hover:text-ink"
    >
      {label}
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div>
        <CupView game={game} cup={cups.national} title="Copa Nacional" managedId={managedId} />
        {viewButton('Ver chaveamento', 'national')}
      </div>
      <div>
        <CompetitionCard game={game} result={cups.champions} title="Champions" managedId={managedId} />
        {viewButton('Ver grupos & chaveamento', 'champions')}
      </div>
      <div>
        <CompetitionCard
          game={game}
          result={cups.libertadores}
          title="Libertadores"
          managedId={managedId}
        />
        {viewButton('Ver grupos & chaveamento', 'libertadores')}
      </div>
    </div>
  );
}

interface CompetitionCardProps {
  game: GameState;
  result: CompetitionResult;
  title: string;
  managedId: string;
}

function managedCompetitionRun(result: CompetitionResult, managedId: string): string {
  if (result.championId === managedId) return 'Você foi campeão!';
  let exit: string | null = null;
  for (const round of result.knockout) {
    const tie = round.ties.find(
      (candidate) =>
        !candidate.bye && (candidate.homeId === managedId || candidate.awayId === managedId),
    );
    if (tie) exit = round.name;
  }
  if (exit) return exit === 'Final' ? 'Você foi vice-campeão' : `Você caiu nas ${exit}`;
  if (result.groups.some((group) => group.table.some((row) => row.clubId === managedId))) {
    return 'Você caiu na fase de grupos';
  }
  return 'Seu time não disputou';
}

function CompetitionCard({ game, result, title, managedId }: CompetitionCardProps): JSX.Element {
  const youWon = result.championId === managedId;
  const run = managedCompetitionRun(result, managedId);

  return (
    <div className="border border-line bg-surface p-4">
      <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
        {title}
      </p>
      <h3
        className={`mt-1 font-display text-2xl font-extrabold uppercase leading-none ${youWon ? 'text-accent' : ''}`}
      >
        {youWon ? 'Campeão!' : 'Encerrada'}
      </h3>
      <p className="mt-2 flex items-center gap-1 font-sans text-sm text-ink-muted">
        Campeão:{' '}
        {result.championId ? (
          <ClubLink
            clubId={result.championId}
            name={clubName(game, result.championId)}
            className="font-semibold text-ink"
          />
        ) : (
          '—'
        )}
      </p>
      <p className={`mt-1 font-sans text-xs ${youWon ? 'text-accent' : 'text-ink-faint'}`}>{run}</p>
    </div>
  );
}

interface CupViewProps {
  game: GameState;
  cup: CupResult;
  title: string;
  managedId: string;
}

function CupView({ game, cup, title, managedId }: CupViewProps): JSX.Element {
  const isChampion = cup.championId === managedId;

  const myTies: Array<{ round: string; tie: CupTie }> = [];
  for (const round of cup.rounds) {
    const tie = round.ties.find(
      (candidate) =>
        !candidate.bye && (candidate.homeId === managedId || candidate.awayId === managedId),
    );
    if (tie) myTies.push({ round: round.name, tie });
  }

  let exitRound: string | null = null;
  for (const { round, tie } of myTies) {
    if (tie.winnerId !== managedId) {
      exitRound = round;
      break;
    }
  }

  return (
    <div className="border border-line bg-surface p-4">
      <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
        {title}
      </p>
      <h3
        className={`mt-1 font-display text-2xl font-extrabold uppercase leading-none ${isChampion ? 'text-accent' : ''}`}
      >
        {isChampion ? 'Campeão!' : exitRound ? `Caiu nas ${exitRound}` : 'Sem campanha'}
      </h3>
      <p className="mt-2 flex items-center gap-1 font-sans text-sm text-ink-muted">
        Vencedor:{' '}
        {cup.championId ? (
          <ClubLink clubId={cup.championId} name={clubName(game, cup.championId)} />
        ) : (
          '—'
        )}
      </p>

      <ul className="mt-4 flex flex-col gap-1.5">
        {myTies.map(({ round, tie }) => {
          const opponentId = tie.homeId === managedId ? tie.awayId : tie.homeId;
          const myGoals = tie.homeId === managedId ? tie.homeGoals : tie.awayGoals;
          const oppGoals = tie.homeId === managedId ? tie.awayGoals : tie.homeGoals;
          const won = tie.winnerId === managedId;
          return (
            <li key={round} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
              <span className="font-sans text-xs uppercase tracking-broadcast text-ink-faint">
                {round}
              </span>
              <ClubLink
                clubId={opponentId}
                name={clubName(game, opponentId)}
                className="truncate font-sans text-ink-muted"
              />
              <span className={`font-display font-bold tabular-nums ${won ? 'text-accent' : 'text-live'}`}>
                {myGoals}–{oppGoals}
                {tie.penalties ? ' p' : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
