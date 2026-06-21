import { useEffect, useState } from 'react';
import type { Player } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { standingsFromRounds, type MatchResultRow } from '@/engine/season';
import { LEAGUES } from '@/data/loaders';
import { BroadcastTopBar } from '@/components/BroadcastTopBar';
import { BroadcastButton } from '@/components/BroadcastButton';
import { ClubLink } from '@/components/ClubLink';
import { roundDateLabel, seasonYearLabel } from '@/lib/format';

const ROUND_INTERVAL_MS = 650;

const SPEEDS: ReadonlyArray<{ label: string; ms: number }> = [
  { label: 'Lenta', ms: 1100 },
  { label: 'Normal', ms: 650 },
  { label: 'Rápida', ms: 320 },
  { label: 'Turbo', ms: 140 },
];

export function ReplayScreen(): JSX.Element {
  const game = useGameStore((state) => state.game);
  const season = useGameStore((state) => state.lastSeason);
  const goToSeasonResults = useGameStore((state) => state.goToSeasonResults);
  const backToLineup = useGameStore((state) => state.backToLineup);

  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [intervalMs, setIntervalMs] = useState(ROUND_INTERVAL_MS);

  const totalRounds = season?.rounds.length ?? 0;
  const finished = totalRounds > 0 && roundsPlayed >= totalRounds;

  useEffect(() => {
    if (!playing || roundsPlayed >= totalRounds) return;
    const timer = setTimeout(() => {
      setRoundsPlayed((current) => Math.min(current + 1, totalRounds));
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [playing, roundsPlayed, totalRounds, intervalMs]);

  const managedClub = game?.managedClubId ? game.clubs[game.managedClubId] : undefined;
  if (!game || !managedClub || !season) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <BroadcastTopBar onBack={backToLineup} backLabel="Escalação" />
        <main className="flex flex-1 items-center justify-center px-5">
          <p className="font-sans text-ink-muted">Nada pra reproduzir.</p>
        </main>
      </div>
    );
  }

  const clubIds = Object.keys(game.clubs);
  const standings = standingsFromRounds(season.rounds.slice(0, roundsPlayed), clubIds);
  const currentRound = roundsPlayed > 0 ? season.rounds[roundsPlayed - 1] : undefined;
  const progress = totalRounds > 0 ? (roundsPlayed / totalRounds) * 100 : 0;
  const leagueName = LEAGUES.find((league) => league.id === managedClub.leagueId)?.name ?? '';

  const playedRounds = season.rounds.slice(0, roundsPlayed);

  const myHistory: Array<{ round: number; match: MatchResultRow; home: boolean }> = [];
  playedRounds.forEach((round, index) => {
    const tie = round.find((m) => m.homeId === managedClub.id || m.awayId === managedClub.id);
    if (tie) myHistory.push({ round: index + 1, match: tie, home: tie.homeId === managedClub.id });
  });

  const namesWithCounts = (ids: string[]): string => {
    const counts = new Map<string, number>();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()]
      .map(([id, count]) => `${game.players[id]?.name ?? '?'}${count > 1 ? ` (${count})` : ''}`)
      .join(', ');
  };

  const goalCount = new Map<string, number>();
  for (const round of playedRounds) {
    for (const match of round) {
      for (const id of match.homeScorers) goalCount.set(id, (goalCount.get(id) ?? 0) + 1);
      for (const id of match.awayScorers) goalCount.set(id, (goalCount.get(id) ?? 0) + 1);
    }
  }
  const topScorers: Array<{ player: Player; goals: number }> = [];
  for (const [id, goals] of [...goalCount.entries()].sort((a, b) => b[1] - a[1])) {
    const player = game.players[id];
    if (player) topScorers.push({ player, goals });
    if (topScorers.length >= 8) break;
  }

  const orderedRound = currentRound
    ? [...currentRound].sort((a, b) => {
        const aMine = a.homeId === managedClub.id || a.awayId === managedClub.id ? 1 : 0;
        const bMine = b.homeId === managedClub.id || b.awayId === managedClub.id ? 1 : 0;
        return bMine - aMine;
      })
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <BroadcastTopBar onBack={backToLineup} backLabel="Escalação" rightLabel={managedClub.name} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-broadcast text-accent">
              {leagueName} · {seasonYearLabel(season.season)}
            </p>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">
              Rodada {roundsPlayed}
              <span className="text-ink-faint"> / {totalRounds}</span>
            </h1>
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full bg-surface-raised">
          <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-sans text-xs uppercase tracking-broadcast text-ink-faint">
            Velocidade
          </span>
          {SPEEDS.map((speed) => (
            <button
              key={speed.label}
              type="button"
              onClick={() => setIntervalMs(speed.ms)}
              className={`border px-2.5 py-1 font-sans text-xs font-semibold uppercase tracking-broadcast transition-colors duration-150 ${
                intervalMs === speed.ms
                  ? 'border-accent text-accent'
                  : 'border-line text-ink-muted hover:text-ink'
              }`}
            >
              {speed.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section>
            <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Classificação
            </h2>
            <ol className="border border-line">
              {standings.map((row, index) => {
                const isManaged = row.clubId === managedClub.id;
                return (
                  <li
                    key={row.clubId}
                    className={`flex items-center justify-between border-b border-line px-3 py-1.5 last:border-b-0 ${
                      isManaged ? 'bg-surface-raised' : ''
                    }`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <span className="w-5 text-right font-display text-sm font-bold tabular-nums text-ink-faint">
                        {index + 1}
                      </span>
                      <ClubLink
                        clubId={row.clubId}
                        name={game.clubs[row.clubId]?.name ?? row.clubId}
                        className={`font-sans text-sm ${isManaged ? 'font-bold text-accent' : ''}`}
                      />
                    </span>
                    <span className="font-display text-base font-bold tabular-nums">{row.points}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section>
            <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              {currentRound
                ? `Rodada ${roundsPlayed} · ${roundDateLabel(roundsPlayed - 1, totalRounds, season.season)}`
                : 'Aguardando o apito…'}
            </h2>
            <ul className="border border-line">
              {orderedRound.map((match) => {
                const managedIsHome = match.homeId === managedClub.id;
                const managedIsAway = match.awayId === managedClub.id;
                const involvesManaged = managedIsHome || managedIsAway;

                let scoreClass = 'text-ink';
                if (involvesManaged) {
                  const mine = managedIsHome ? match.homeGoals : match.awayGoals;
                  const theirs = managedIsHome ? match.awayGoals : match.homeGoals;
                  scoreClass = mine > theirs ? 'text-accent' : mine < theirs ? 'text-live' : 'text-ink-muted';
                }

                return (
                  <li
                    key={`${match.homeId}-${match.awayId}`}
                    className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line px-3 py-1.5 text-sm last:border-b-0 ${
                      involvesManaged ? 'border-l-2 border-l-accent bg-surface-raised' : ''
                    }`}
                  >
                    <span className="flex justify-end">
                      <ClubLink
                        clubId={match.homeId}
                        name={game.clubs[match.homeId]?.name ?? match.homeId}
                        className={`font-sans ${managedIsHome ? 'font-bold text-accent' : ''}`}
                      />
                    </span>
                    <span className={`px-2 font-display font-bold tabular-nums ${scoreClass}`}>
                      {match.homeGoals}–{match.awayGoals}
                    </span>
                    <ClubLink
                      clubId={match.awayId}
                      name={game.clubs[match.awayId]?.name ?? match.awayId}
                      className={`font-sans ${managedIsAway ? 'font-bold text-accent' : 'text-ink-muted'}`}
                    />
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
              Artilharia
            </h2>
            <ul className="border border-line">
              {topScorers.length === 0 ? (
                <li className="px-3 py-2 font-sans text-sm text-ink-faint">Sem gols ainda…</li>
              ) : (
                topScorers.map((entry, index) => {
                  const mine = entry.player.clubId === managedClub.id;
                  return (
                    <li
                      key={entry.player.id}
                      className={`flex items-center justify-between border-b border-line px-3 py-1.5 last:border-b-0 ${
                        mine ? 'bg-surface-raised' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="w-4 text-right font-display text-sm font-bold tabular-nums text-ink-faint">
                          {index + 1}
                        </span>
                        <span className={`truncate font-sans text-sm ${mine ? 'font-bold text-accent' : ''}`}>
                          {entry.player.name}
                        </span>
                      </span>
                      <span className="font-display text-base font-bold tabular-nums text-accent">
                        {entry.goals}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-broadcast text-ink-faint">
            Sua campanha
          </h2>
          {myHistory.length === 0 ? (
            <p className="font-sans text-sm text-ink-faint">Você ainda não entrou em campo.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {myHistory.map((entry) => {
                const { match, home } = entry;
                const myGoals = home ? match.homeGoals : match.awayGoals;
                const oppGoals = home ? match.awayGoals : match.homeGoals;
                const opponentId = home ? match.awayId : match.homeId;
                const myScorers = home ? match.homeScorers : match.awayScorers;
                const myAssisters = home ? match.homeAssisters : match.awayAssisters;
                const oppScorers = home ? match.awayScorers : match.homeScorers;
                const won = myGoals > oppGoals;
                const lost = myGoals < oppGoals;
                const cls = won
                  ? 'border-accent text-accent'
                  : lost
                    ? 'border-live text-live'
                    : 'border-line text-ink-muted';
                return (
                  <span key={entry.round} className="group relative inline-block">
                    <span
                      className={`block cursor-default border px-2 py-1 font-display text-sm font-bold tabular-nums ${cls}`}
                    >
                      {myGoals}–{oppGoals}
                    </span>
                    <span className="invisible absolute bottom-full left-1/2 z-[400] mb-1 w-60 -translate-x-1/2 border border-line bg-surface-raised p-3 text-left opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                      <span className="flex items-center gap-1 font-display text-sm font-bold uppercase">
                        {home ? 'vs' : '@'}
                        <ClubLink
                          clubId={opponentId}
                          name={game.clubs[opponentId]?.name ?? opponentId}
                          className="text-ink"
                        />
                      </span>
                      <span className="mt-1 block font-sans text-xs text-ink-muted">
                        Rodada {entry.round} · {home ? 'casa' : 'fora'} · {myGoals}–{oppGoals}
                      </span>
                      {myScorers.length > 0 ? (
                        <span className="mt-2 block font-sans text-xs">
                          <span className="text-ink-faint">Seus gols: </span>
                          {namesWithCounts(myScorers)}
                        </span>
                      ) : null}
                      {myAssisters.length > 0 ? (
                        <span className="block font-sans text-xs">
                          <span className="text-ink-faint">Assist.: </span>
                          {namesWithCounts(myAssisters)}
                        </span>
                      ) : null}
                      {oppScorers.length > 0 ? (
                        <span className="mt-1 block font-sans text-xs text-ink-faint">
                          Sofridos: {namesWithCounts(oppScorers)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          {finished ? (
            <BroadcastButton variant="primary" onClick={goToSeasonResults}>
              Ver tabela final &amp; stats
            </BroadcastButton>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                className="border border-line px-4 py-2 font-sans text-sm font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:border-ink-faint hover:text-ink"
              >
                {playing ? 'Pausar' : 'Continuar'}
              </button>
              <button
                type="button"
                onClick={() => setRoundsPlayed((current) => Math.min(current + 1, totalRounds))}
                className="border border-line px-4 py-2 font-sans text-sm font-semibold uppercase tracking-broadcast text-ink-muted transition-colors duration-150 hover:border-ink-faint hover:text-ink"
              >
                Próxima rodada
              </button>
              <BroadcastButton variant="primary" onClick={goToSeasonResults}>
                Pular pro fim
              </BroadcastButton>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
