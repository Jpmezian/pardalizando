import { create } from 'zustand';
import type {
  Club,
  Continent,
  FormationId,
  GameState,
  LeagueId,
  Lineup,
  Player,
  Rarity,
  SeasonRecord,
} from '@/types';
import {
  DATA_VERSION,
  getAllPlayers,
  getClub,
  getClubPlayers,
  getClubsByLeague,
  sliceLeague,
} from '@/data/dataset';
import { LEAGUES, continentOf } from '@/data/loaders';
import { clearSave, hasSavedGame, loadGame, persistGame } from '@/save/saveStore';
import { createRng, seedFromString } from '@/engine/rng';
import { pickBestXI, teamStrength, type FilledSlot, type SectorStrength } from '@/engine/ratings';
import { formationSubPositions } from '@/engine/formations';
import { simulateMatch } from '@/engine/match';
import {
  buildLineup,
  clubStrength,
  lineupFilledSlots,
  lineupStrength,
  reconcileLineup,
} from '@/engine/lineup';
import { buildMatchPlay, buildShootout, type MatchPlay, type ShootoutKick, type Side } from '@/engine/matchPlay';
import { CUP_THEMES, nationalCupName, type CupKey, type CupTheme } from '@/config/cupThemes';
import { simulateSeason as runSeason, type SeasonOutcome } from '@/engine/season';
import { simulateKnockout, type CupEntrant, type CupResult, type CupRound } from '@/engine/cup';
import { simulateCompetition, type CompetitionResult } from '@/engine/competition';
import { teamColorPair } from '@/lib/teamColor';
import { openPack as runOpenPack, sellValue } from '@/engine/market';
import { spinRoulette as runSpin } from '@/engine/roulette';
import { generateSeasonInjuries, type InjuryEvent } from '@/engine/injuries';
import { progressSeason, type TransferNews } from '@/engine/progression';
import { BOARD_START, cupConfidence, evaluateBoard } from '@/engine/board';
import {
  fullSeasonRewards,
  MIN_ROSTER,
  PACKS,
  ROSTER_LIMIT,
  ROULETTE_SPINS,
  STARTING_TICKETS,
} from '@/config/economy';

/**
 * Telas de nível superior (máquina de estados da navegação).
 * Fluxo M2: start → league-select → club-select → squad → lineup → match-result.
 */
export type Screen =
  | 'start'
  | 'league-select'
  | 'club-select'
  | 'squad'
  | 'lineup'
  | 'match-result'
  | 'simulating'
  | 'replay'
  | 'season-results'
  | 'market'
  | 'history'
  | 'league-view'
  | 'competition'
  | 'club'
  | 'cup-match'
  | 'fired';

export type ViewedCompetition =
  | 'national'
  | 'champions'
  | 'europa'
  | 'conference'
  | 'libertadores'
  | 'sudamericana'
  | 'mundial';

const DEFAULT_FORMATION: FormationId = '4-3-3';

/** Jogador revelado num pacote (transiente, pra animação de revelação). */
export interface PullView {
  player: Player;
  rarity: Rarity;
  isHigh: boolean;
}

/** Giro da roleta (transiente, pra animação da fita). */
export interface RouletteView {
  reel: Player[];
  winnerIndex: number;
  winner: Player;
  isHigh: boolean;
}

/** Resultados das copas da temporada (transiente, mostrado nos resultados). */
export interface CupsView {
  national: CupResult;
  champions: CompetitionResult;
  europa: CompetitionResult;
  conference: CompetitionResult;
  libertadores: CompetitionResult;
  sudamericana: CompetitionResult;
  /** Mundial de Clubes: campeões continentais se enfrentam pelo título mundial. */
  mundial: CupResult;
}

/** Cinematic de um jogo de copa em exibição (transiente). */
export interface CupMatchView {
  play: MatchPlay;
  theme: CupTheme;
  roundName: string;
  managedSide: Side | null;
  homeColor: string;
  awayColor: string;
  /** Disputa de pênaltis, se o jogo empatou e foi decidido nos pênaltis. */
  shootout?: ShootoutKick[];
}

/** Fila de cinematics tocando em sequência (durante a simulação ou re-assistindo). */
export interface CupQueue {
  matches: CupMatchView[];
  index: number;
  returnScreen: Screen;
}

/** Jogo de copa agendado pra uma rodada da liga (espalha as copas pelo calendário). */
export interface ScheduledCupMatch extends CupMatchView {
  /** Rodada da liga em que esse jogo de copa "acontece". */
  round: number;
}

/** Tie/jogo mínimo pra montar o cinematic. */
export interface WatchableMatch {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  /** Decidido nos pênaltis (empate no tempo normal). */
  penalties?: boolean;
  /** Quem venceu (clubId) — usado pra montar a disputa de pênaltis. */
  winnerId?: string;
}

/** Resultado de uma partida pronto pra exibição (transiente, não vai pro save). */
export interface MatchView {
  homeName: string;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
  homeStrength: SectorStrength;
  awayStrength: SectorStrength;
  lambdaHome: number;
  lambdaAway: number;
}

/** Seed uint32 a partir do relógio + ruído — guardada no save pra reprodutibilidade. */
function generateSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function buildGameForClub(clubId: string): GameState {
  const club = getClub(clubId);
  if (!club) throw new Error(`Clube não encontrado: ${clubId}`);

  const { clubs, players } = sliceLeague(club.leagueId);
  return {
    seed: generateSeed(),
    dataVersion: DATA_VERSION,
    managedClubId: clubId,
    currentSeason: 1,
    phase: 'lineup',
    lineup: null,
    clubs,
    players,
    history: [],
    packs: { goldenTickets: STARTING_TICKETS, goldPity: 0 },
    boardConfidence: BOARD_START,
    transferredOut: [],
  };
}

const SCORER_WEIGHT: Record<string, number> = {
  ST: 1.0,
  LW: 0.8,
  RW: 0.8,
  AM: 0.6,
  CM: 0.35,
  DM: 0.2,
  LB: 0.15,
  RB: 0.15,
  CB: 0.1,
  GK: 0.02,
};

/** Monta o time pro cinematic: nome + finalizadores ponderados (posição × overall). */
function clubPlayTeam(game: GameState, clubId: string): { name: string; scorers: { name: string; weight: number }[] } {
  const inGame = game.clubs[clubId];
  const name = inGame?.name ?? getClub(clubId)?.name ?? clubId;
  let xi: FilledSlot[] = [];
  if (clubId === game.managedClubId && game.lineup) {
    xi = lineupFilledSlots(game, game.lineup);
  } else if (inGame) {
    const players = inGame.squad
      .map((id) => game.players[id])
      .filter((player): player is Player => player !== undefined);
    xi = pickBestXI(players, formationSubPositions('4-3-3'));
  } else {
    const dataset = getClub(clubId);
    if (dataset) xi = pickBestXI(getClubPlayers(dataset), formationSubPositions('4-3-3'));
  }
  const scorers = xi.map((slot) => ({
    name: slot.player.name,
    weight: (SCORER_WEIGHT[slot.subPos] ?? 0.2) * slot.player.ovr ** 2,
  }));
  return { name, scorers };
}

/** Monta o cinematic de um jogo de copa (narração + tema + cores dos times). */
function makeCupMatchView(
  game: GameState,
  match: WatchableMatch,
  competition: CupKey,
  roundName: string,
): CupMatchView {
  const rng = createRng(
    seedFromString(
      `${game.seed}:cupmatch:${competition}:${match.homeId}:${match.awayId}:${match.homeGoals}:${match.awayGoals}`,
    ),
  );
  const home = clubPlayTeam(game, match.homeId);
  const away = clubPlayTeam(game, match.awayId);
  const play = buildMatchPlay(home, away, match.homeGoals, match.awayGoals, rng);
  const managedSide: Side | null =
    match.homeId === game.managedClubId ? 'home' : match.awayId === game.managedClubId ? 'away' : null;
  const colors = teamColorPair(match.homeId, match.awayId);
  const base = CUP_THEMES[competition];
  // A copa nacional ganha o nome real do país (Copa do Brasil, FA Cup…).
  const theme: CupTheme =
    competition === 'national'
      ? { ...base, label: nationalCupName(game.clubs[match.homeId]?.leagueId) }
      : base;
  // Empate decidido nos pênaltis → monta a disputa (seeded pelo jogo) + batedores.
  let shootout: ShootoutKick[] | undefined;
  if (match.penalties && match.winnerId) {
    const penWinner: Side = match.winnerId === match.homeId ? 'home' : 'away';
    const penRng = createRng(
      seedFromString(`${game.seed}:pens:${competition}:${match.homeId}:${match.awayId}:${roundName}`),
    );
    const raw = buildShootout(penWinner, penRng);
    // Batedores: os melhores do elenco cobram primeiro, depois repete a lista.
    const homeTakers = [...home.scorers].sort((a, b) => b.weight - a.weight).map((s) => s.name);
    const awayTakers = [...away.scorers].sort((a, b) => b.weight - a.weight).map((s) => s.name);
    let hi = 0;
    let ai = 0;
    shootout = raw.map((kick) => {
      if (kick.team === 'home') {
        const name = homeTakers[hi % homeTakers.length] ?? home.name;
        hi += 1;
        return { ...kick, kicker: name };
      }
      const name = awayTakers[ai % awayTakers.length] ?? away.name;
      ai += 1;
      return { ...kick, kicker: name };
    });
  }
  return {
    play,
    theme,
    roundName,
    managedSide,
    homeColor: colors.home,
    awayColor: colors.away,
    ...(shootout ? { shootout } : {}),
  };
}

/** Junta os jogos de copa do clube gerido pra tocar em sequência durante a simulação. */
/**
 * Fração do estágio dentro da copa (0 = fase inicial, 1 = final). Os estágios
 * específicos vêm ANTES do "final" genérico — "Oitavas/Quartas de final" também
 * contêm a palavra "final" e cairiam no fim da temporada por engano.
 */
function stageFraction(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('oitavas')) return 0.45;
  if (n.includes('quartas')) return 0.62;
  if (n.includes('semi')) return 0.8;
  if (n.includes('playoff')) return 0.32;
  if (n.includes('64') || n.includes('128')) return 0.08;
  if (n.includes('32')) return 0.22;
  if (n.includes('final')) return 1; // só "Final" puro chega aqui
  return 0.3;
}

/**
 * Janela do calendário (fração da temporada) de cada competição — espelha o real:
 * copa nacional espalha cedo→tarde, continental concentra no 2º turno, mundial no fim.
 * (Champions: fase de liga set–jan, mata-mata fev–maio; Copa do Brasil: 3ª fase
 * abr/mai → final nov.)
 */
function cupWindow(key: CupKey): [number, number] {
  if (key === 'national') return [0.12, 0.86];
  if (key === 'mundial') return [1, 1];
  return [0.5, 0.98]; // continental (knockout)
}

/**
 * Agenda os jogos de copa do clube gerido em rodadas da liga, espalhados pelo
 * calendário (não todos no começo). Cada jogo "acontece" numa rodada.
 */
function scheduleCupMatches(game: GameState, cups: CupsView, totalRounds: number): ScheduledCupMatch[] {
  const managedId = game.managedClubId;
  if (!managedId || totalRounds < 1) return [];
  const found: { key: CupKey; round: string; match: WatchableMatch; matchday: number }[] = [];
  const collect = (key: CupKey, rounds: CupRound[]): void => {
    const [a, b] = cupWindow(key);
    for (const round of rounds) {
      for (const tie of round.ties) {
        if (tie.bye) continue;
        if (tie.homeId === managedId || tie.awayId === managedId) {
          const frac = a + (b - a) * stageFraction(round.name);
          const matchday = Math.min(totalRounds, Math.max(1, Math.round(frac * totalRounds)));
          found.push({
            key,
            round: round.name,
            matchday,
            match: {
              homeId: tie.homeId,
              awayId: tie.awayId,
              homeGoals: tie.homeGoals,
              awayGoals: tie.awayGoals,
              penalties: tie.penalties,
              winnerId: tie.winnerId,
            },
          });
        }
      }
    }
  };
  collect('national', cups.national.rounds);
  collect('champions', cups.champions.knockout);
  collect('europa', cups.europa.knockout);
  collect('conference', cups.conference.knockout);
  collect('libertadores', cups.libertadores.knockout);
  collect('sudamericana', cups.sudamericana.knockout);
  collect('mundial', cups.mundial.rounds);

  // Espalha colisões: dois jogos na mesma rodada empurram o seguinte +1.
  found.sort((x, y) => x.matchday - y.matchday);
  let last = 0;
  return found.map((entry) => {
    const round = entry.matchday <= last ? Math.min(totalRounds, last + 1) : entry.matchday;
    last = round;
    return { ...makeCupMatchView(game, entry.match, entry.key, entry.round), round };
  });
}

/** Força de um clube a partir dos dados embarcados (pra adversários de outras ligas). */
function datasetStrength(club: Club, out?: Set<string>): SectorStrength {
  const players =
    out && out.size > 0 ? getClubPlayers(club).filter((p) => !out.has(p.id)) : getClubPlayers(club);
  return teamStrength(pickBestXI(players, formationSubPositions('4-3-3')));
}

/** Participantes da Copa Nacional: todos os clubes da sua liga. */
function nationalCupEntrants(game: GameState, lineup: Lineup): CupEntrant[] {
  return Object.values(game.clubs).map((club) => ({
    clubId: club.id,
    strength: club.id === game.managedClubId ? lineupStrength(game, lineup) : clubStrength(game, club),
  }));
}

const TIER_SIZE = 36;

/**
 * Divide TODOS os clubes do continente em tiers de competição pela força:
 *   Europa  → [Champions, Europa League, Conference League]
 *   América → [Libertadores, Sudamericana]
 * O seu clube cai no tier que a força dele alcança (Galatasaray pode jogar a
 * Europa/Conference em vez da Champions), e é garantido em algum tier.
 */
function continentalTiers(
  game: GameState,
  lineup: Lineup,
  continent: Continent,
  tierCount: number,
): CupEntrant[][] {
  const managedId = game.managedClubId;
  const managedClub = managedId ? game.clubs[managedId] : undefined;
  const managedContinent = managedClub ? continentOf(managedClub.leagueId) : undefined;

  const out = new Set(game.transferredOut ?? []);
  const clubs: Club[] = [];
  for (const league of LEAGUES) {
    if (league.continent !== continent) continue;
    clubs.push(...getClubsByLeague(league.id));
  }
  if (managedClub && managedContinent === continent && !clubs.some((c) => c.id === managedClub.id)) {
    clubs.push(managedClub);
  }

  const entrants: CupEntrant[] = clubs.map((club) => ({
    clubId: club.id,
    strength: club.id === managedId ? lineupStrength(game, lineup) : datasetStrength(club, out),
  }));
  const force = (s: SectorStrength): number => s.atk + s.mid + s.def;
  const ranked = entrants.sort((a, b) => force(b.strength) - force(a.strength));

  // Garante o clube do usuário dentro de algum tier (não pode ficar de fora).
  if (managedId && managedContinent === continent) {
    const idx = ranked.findIndex((e) => e.clubId === managedId);
    const maxIdx = tierCount * TIER_SIZE - 1;
    if (idx > maxIdx) {
      const [me] = ranked.splice(idx, 1);
      if (me) ranked.splice(maxIdx, 0, me);
    }
  }

  const tiers: CupEntrant[][] = [];
  for (let t = 0; t < tierCount; t += 1) {
    tiers.push(ranked.slice(t * TIER_SIZE, (t + 1) * TIER_SIZE));
  }
  return tiers;
}

interface GameStore {
  screen: Screen;
  game: GameState | null;
  selectedLeagueId: LeagueId | null;
  lastMatch: MatchView | null;
  lastSeason: SeasonOutcome | null;
  lastPull: PullView | null;
  /** Giro da roleta em revelação (transiente). */
  lastSpin: RouletteView | null;
  /** Copas da última temporada simulada (transiente). */
  lastCups: CupsView | null;
  /** Lesões da última temporada simulada (transiente). */
  lastInjuries: InjuryEvent[] | null;
  /** Transferências da IA na última virada de temporada (transiente). */
  lastTransfers: TransferNews[] | null;
  /** Fila de cinematics de copa em exibição (transiente). */
  cupQueue: CupQueue | null;
  /** Jogos de copa do clube agendados nas rodadas da liga (tocam durante o replay). */
  seasonCupMatches: ScheduledCupMatch[] | null;
  /** Qual competição está aberta na tela de chaveamento. */
  viewedCompetition: ViewedCompetition | null;
  /** Clube aberto na tela de clube + de onde veio (pra voltar). */
  viewedClubId: string | null;
  clubReturnScreen: Screen;
  /** Contador transiente de amistosos — varia o sorteio a cada "nova partida". */
  friendlyCount: number;
  /** Contador transiente de aberturas de pacote — varia o sorteio. */
  pullCount: number;
  /** Contador de simulações de temporada — cada simulação re-rola liga/copas/prêmios. */
  seasonSimCount: number;
  hasSave: boolean;
  saveChecked: boolean;

  checkForSave: () => Promise<void>;
  startNewGame: () => void;
  selectLeague: (leagueId: LeagueId) => void;
  selectClub: (clubId: string) => Promise<void>;
  continueGame: () => Promise<void>;
  goToLineup: () => void;
  setFormation: (formationId: FormationId) => void;
  assignPlayerToSlot: (slotIndex: number, playerId: string) => void;
  autoFillLineup: () => void;
  simulateFriendly: () => void;
  simulateSeason: () => void;
  finishSimulating: () => void;
  goToMarket: () => void;
  openPack: (rarity: Rarity) => void;
  sellPlayer: (playerId: string) => void;
  clearPull: () => void;
  spinRoulette: (spinId: string) => void;
  clearSpin: () => void;
  advanceSeason: (destination?: 'squad' | 'market') => void;
  clearTransfers: () => void;
  goToHistory: () => void;
  goToLeagueView: () => void;
  goToCompetition: (competition: ViewedCompetition) => void;
  watchCupMatch: (match: WatchableMatch, competition: CupKey, roundName: string) => void;
  advanceCupMatch: () => void;
  skipCupCinematics: () => void;
  backToSeasonResults: () => void;
  goToClub: (clubId: string) => void;
  backFromClub: () => void;
  backToStart: () => void;
  restartCareer: () => void;
  backToLeagueSelect: () => void;
  backToSquad: () => void;
  backToLineup: () => void;
  goToSeasonResults: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  /** Atualiza a escalação no estado e persiste o save. */
  function commitLineup(lineup: Lineup): void {
    const { game } = get();
    if (!game) return;
    const next = { ...game, lineup };
    set({ game: next });
    void persistGame(next);
  }

  /** Simula a temporada e leva pra tela alvo (resultado instantâneo ou replay). */
  function runSeasonInto(targetScreen: Screen): void {
    const { game, seasonSimCount } = get();
    if (!game?.managedClubId || !game.lineup) return;

    // Nonce por simulação: cada "Simular Temporada" re-rola tudo (liga/copas/prêmios),
    // mesmo re-simulando a mesma temporada — antes a seed era fixa e dava sempre igual.
    const nonce = seasonSimCount;
    const rng = createRng(seedFromString(`${game.seed}:season:${game.currentSeason}:${nonce}`));
    const outcome = runSeason(game, game.lineup, rng);

    const players = { ...game.players };
    for (const [playerId, seasonStats] of Object.entries(outcome.stats)) {
      const player = players[playerId];
      if (player) players[playerId] = { ...player, seasonStats };
    }

    const cupRng = createRng(seedFromString(`${game.seed}:cups:${game.currentSeason}:${nonce}`));
    const national = simulateKnockout(nationalCupEntrants(game, game.lineup), cupRng);
    const euroTiers = continentalTiers(game, game.lineup, 'europe', 3);
    const champions = simulateCompetition(euroTiers[0] ?? [], cupRng);
    const europa = simulateCompetition(euroTiers[1] ?? [], cupRng);
    const conference = simulateCompetition(euroTiers[2] ?? [], cupRng);
    const saTiers = continentalTiers(game, game.lineup, 'south-america', 2);
    const libertadores = simulateCompetition(saTiers[0] ?? [], cupRng);
    const sudamericana = simulateCompetition(saTiers[1] ?? [], cupRng);

    // Mundial de Clubes: os campeões continentais se enfrentam pelo título mundial.
    const out = new Set(game.transferredOut ?? []);
    const myLineup = game.lineup;
    const mundialEntrants: CupEntrant[] = [
      champions,
      libertadores,
      europa,
      conference,
      sudamericana,
    ]
      .map((result) => result.championId)
      .filter((id): id is string => id !== null)
      .map((id) => {
        if (id === game.managedClubId) {
          return { clubId: id, strength: lineupStrength(game, myLineup) };
        }
        const club = getClub(id);
        return { clubId: id, strength: club ? datasetStrength(club, out) : { atk: 0, mid: 0, def: 0 } };
      });
    const mundial = simulateKnockout(mundialEntrants, cupRng);

    const injuryRng = createRng(seedFromString(`${game.seed}:injuries:${game.currentSeason}:${nonce}`));
    const managed = game.clubs[game.managedClubId];
    const managedSquad = managed
      ? managed.squad
          .map((id) => game.players[id])
          .filter((player): player is Player => player !== undefined)
      : [];
    const injuries = generateSeasonInjuries(managedSquad, injuryRng);

    const next: GameState = { ...game, players, phase: 'results' };
    set({
      game: next,
      lastSeason: outcome,
      lastCups: { national, champions, europa, conference, libertadores, sudamericana, mundial },
      lastInjuries: injuries,
      screen: targetScreen,
      seasonSimCount: nonce + 1,
    });
    void persistGame(next);
  }

  return {
    screen: 'start',
    game: null,
    selectedLeagueId: null,
    lastMatch: null,
    lastSeason: null,
    lastPull: null,
    lastSpin: null,
    lastCups: null,
    lastInjuries: null,
    lastTransfers: null,
    cupQueue: null,
    seasonCupMatches: null,
    viewedCompetition: null,
    viewedClubId: null,
    clubReturnScreen: 'squad',
    friendlyCount: 0,
    pullCount: 0,
    seasonSimCount: 0,
    hasSave: false,
    saveChecked: false,

    async checkForSave() {
      const exists = await hasSavedGame();
      set({ hasSave: exists, saveChecked: true });
    },

    startNewGame() {
      set({ screen: 'league-select', game: null, selectedLeagueId: null });
    },

    selectLeague(leagueId) {
      set({ selectedLeagueId: leagueId, screen: 'club-select' });
    },

    async selectClub(clubId) {
      const game = buildGameForClub(clubId);
      set({ game, screen: 'squad' });
      await persistGame(game);
      set({ hasSave: true });
    },

    async continueGame() {
      const loaded = await loadGame();
      if (!loaded) return;
      // Re-sincroniza posição e nacionalidade com o dataset atual (corrige saves
      // antigos com posições erradas, ex.: ponta caído em CM). NÃO toca em
      // ovr/idade/valor — esses evoluem na progressão.
      const datasetById = new Map(getAllPlayers().map((player) => [player.id, player]));
      const players: Record<string, Player> = {};
      for (const [id, player] of Object.entries(loaded.players)) {
        const ref = datasetById.get(id);
        players[id] = ref
          ? { ...player, subPos: ref.subPos, pos: ref.pos, nationality: ref.nationality }
          : player;
      }
      // Normaliza saves antigos que não tinham o pity do mercado (M5).
      const game: GameState = {
        ...loaded,
        players,
        packs: { goldenTickets: loaded.packs.goldenTickets, goldPity: loaded.packs.goldPity ?? 0 },
        lineup: loaded.lineup ? { ...loaded.lineup, bench: loaded.lineup.bench ?? [] } : null,
        boardConfidence: loaded.boardConfidence ?? BOARD_START,
        transferredOut: loaded.transferredOut ?? [],
      };
      const managedClub = game.managedClubId ? game.clubs[game.managedClubId] : undefined;

      // Remove jogadores repetidos por NOME no elenco (bug antigo de pacote/roleta — 2 Xhaka).
      if (game.managedClubId && managedClub) {
        const seen = new Set<string>();
        const dedupedSquad: string[] = [];
        for (const id of managedClub.squad) {
          const player = game.players[id];
          if (!player) continue;
          if (seen.has(player.name)) {
            delete game.players[id];
            continue;
          }
          seen.add(player.name);
          dedupedSquad.push(id);
        }
        if (dedupedSquad.length !== managedClub.squad.length) {
          game.clubs = {
            ...game.clubs,
            [game.managedClubId]: { ...managedClub, squad: dedupedSquad },
          };
          if (game.lineup) {
            const keep = new Set(dedupedSquad);
            game.lineup = {
              ...game.lineup,
              slots: game.lineup.slots.map((slot) =>
                slot.playerId && keep.has(slot.playerId) ? slot : { ...slot, playerId: null },
              ),
              bench: game.lineup.bench.filter((id) => keep.has(id)),
            };
          }
        }
      }

      set({
        game,
        selectedLeagueId: managedClub?.leagueId ?? null,
        screen: 'squad',
      });
    },

    goToLineup() {
      const { game } = get();
      if (!game?.managedClubId) return;
      const lineup = game.lineup ?? buildLineup(game, game.managedClubId, DEFAULT_FORMATION);
      const next = { ...game, lineup };
      set({ game: next, screen: 'lineup' });
      void persistGame(next);
    },

    setFormation(formationId) {
      const { game } = get();
      if (!game?.managedClubId) return;
      commitLineup(buildLineup(game, game.managedClubId, formationId));
    },

    assignPlayerToSlot(slotIndex, playerId) {
      const { game } = get();
      if (!game?.lineup) return;

      const slots = game.lineup.slots.map((slot) => ({ ...slot }));
      const target = slots[slotIndex];
      if (!target) return;

      const currentIndex = slots.findIndex((slot) => slot.playerId === playerId);
      if (currentIndex === slotIndex) return;
      // Se o jogador já estava em outro slot, troca os dois (o do alvo vai pra lá).
      if (currentIndex >= 0) {
        slots[currentIndex] = { ...slots[currentIndex]!, playerId: target.playerId };
      }
      slots[slotIndex] = { ...target, playerId };

      commitLineup({ ...game.lineup, slots });
    },

    autoFillLineup() {
      const { game } = get();
      if (!game?.managedClubId || !game.lineup) return;
      commitLineup(buildLineup(game, game.managedClubId, game.lineup.formation));
    },

    simulateFriendly() {
      const { game, friendlyCount } = get();
      if (!game?.managedClubId || !game.lineup) return;

      const myClub = game.clubs[game.managedClubId];
      if (!myClub) return;
      const opponents = Object.values(game.clubs).filter((club) => club.id !== myClub.id);
      if (opponents.length === 0) return;

      const rng = createRng(seedFromString(`${game.seed}:friendly:${friendlyCount}`));
      const opponent = opponents[rng.int(0, opponents.length - 1)]!;

      const homeStrength = lineupStrength(game, game.lineup);
      const awayStrength = clubStrength(game, opponent);
      const result = simulateMatch(homeStrength, awayStrength, rng);

      set({
        lastMatch: {
          homeName: myClub.name,
          awayName: opponent.name,
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          homeStrength,
          awayStrength,
          lambdaHome: result.lambdaHome,
          lambdaAway: result.lambdaAway,
        },
        screen: 'match-result',
        friendlyCount: friendlyCount + 1,
      });
    },

    simulateSeason() {
      runSeasonInto('simulating');
    },

    finishSimulating() {
      // As copas agora tocam DURANTE o replay, na rodada certa do calendário.
      const { game, lastCups, lastSeason } = get();
      const totalRounds = lastSeason?.rounds.length ?? 0;
      const scheduled =
        game && lastCups ? scheduleCupMatches(game, lastCups, totalRounds) : [];
      set({ seasonCupMatches: scheduled.length > 0 ? scheduled : null, screen: 'replay' });
    },

    backToStart() {
      set({ screen: 'start' });
    },

    async restartCareer() {
      await clearSave();
      set({ game: null, selectedLeagueId: null, hasSave: false, screen: 'league-select' });
    },

    backToLeagueSelect() {
      set({ screen: 'league-select', selectedLeagueId: null });
    },

    backToSquad() {
      set({ screen: 'squad' });
    },

    backToLineup() {
      set({ screen: 'lineup' });
    },

    goToSeasonResults() {
      set({ screen: 'season-results' });
    },

    goToMarket() {
      set({ screen: 'market' });
    },

    openPack(rarity) {
      const { game, pullCount } = get();
      if (!game?.managedClubId) return;
      const managed = game.clubs[game.managedClubId];
      if (!managed) return;

      const config = PACKS[rarity];
      if (managed.squad.length >= ROSTER_LIMIT) return;
      if (config.currency === 'budget' && managed.budget < config.cost) return;
      if (config.currency === 'tickets' && game.packs.goldenTickets < config.cost) return;

      const ownedNames = new Set(Object.values(game.players).map((player) => player.name));
      const gone = new Set(game.transferredOut ?? []);
      const pool = getAllPlayers().filter(
        (player) =>
          game.players[player.id] === undefined &&
          !ownedNames.has(player.name) &&
          !gone.has(player.id),
      );
      const rng = createRng(seedFromString(`${game.seed}:pack:${rarity}:${pullCount}`));
      const { result, newPityCount } = runOpenPack(pool, rarity, rng, game.packs.goldPity);
      if (!result) return;

      const newId = `pull-${game.seed}-${pullCount}`;
      const pulled: Player = {
        ...result.template,
        id: newId,
        clubId: managed.id,
        form: 0,
        seasonStats: undefined,
      };

      const players = { ...game.players, [newId]: pulled };
      const clubs = {
        ...game.clubs,
        [managed.id]: {
          ...managed,
          budget: config.currency === 'budget' ? managed.budget - config.cost : managed.budget,
          squad: [...managed.squad, newId],
        },
      };
      const packs = {
        goldenTickets:
          config.currency === 'tickets'
            ? game.packs.goldenTickets - config.cost
            : game.packs.goldenTickets,
        goldPity: newPityCount,
      };

      const next: GameState = {
        ...game,
        players,
        clubs,
        packs,
        transferredOut: [...(game.transferredOut ?? []), result.template.id],
      };
      set({
        game: next,
        lastPull: { player: pulled, rarity, isHigh: result.isHigh },
        pullCount: pullCount + 1,
      });
      void persistGame(next);
    },

    sellPlayer(playerId) {
      const { game } = get();
      if (!game?.managedClubId) return;
      const managed = game.clubs[game.managedClubId];
      if (!managed || managed.squad.length <= MIN_ROSTER) return;
      const player = game.players[playerId];
      if (!player || !managed.squad.includes(playerId)) return;

      const players = { ...game.players };
      delete players[playerId];
      const clubs = {
        ...game.clubs,
        [managed.id]: {
          ...managed,
          budget: managed.budget + sellValue(player),
          squad: managed.squad.filter((id) => id !== playerId),
        },
      };
      const lineup: Lineup | null = game.lineup
        ? {
            ...game.lineup,
            slots: game.lineup.slots.map((slot) =>
              slot.playerId === playerId ? { ...slot, playerId: null } : slot,
            ),
          }
        : game.lineup;

      const next: GameState = { ...game, players, clubs, lineup };
      set({ game: next });
      void persistGame(next);
    },

    clearPull() {
      set({ lastPull: null });
    },

    spinRoulette(spinId) {
      const { game, pullCount } = get();
      if (!game?.managedClubId) return;
      const managed = game.clubs[game.managedClubId];
      if (!managed) return;

      const config = ROULETTE_SPINS[spinId];
      if (!config) return;
      if (managed.squad.length >= ROSTER_LIMIT) return;
      if (config.currency === 'budget' && managed.budget < config.cost) return;
      if (config.currency === 'tickets' && game.packs.goldenTickets < config.cost) return;

      const ownedNames = new Set(Object.values(game.players).map((player) => player.name));
      const gone = new Set(game.transferredOut ?? []);
      const pool = getAllPlayers().filter(
        (player) =>
          game.players[player.id] === undefined &&
          !ownedNames.has(player.name) &&
          !gone.has(player.id),
      );
      const rng = createRng(seedFromString(`${game.seed}:spin:${spinId}:${pullCount}`));
      const result = runSpin(pool, config, rng, game.packs.goldPity);
      if (!result) return;

      const newId = `spin-${game.seed}-${pullCount}`;
      const winner: Player = {
        ...result.winner,
        id: newId,
        clubId: managed.id,
        form: 0,
        seasonStats: undefined,
      };

      const players = { ...game.players, [newId]: winner };
      const clubs = {
        ...game.clubs,
        [managed.id]: {
          ...managed,
          budget: config.currency === 'budget' ? managed.budget - config.cost : managed.budget,
          squad: [...managed.squad, newId],
        },
      };
      const packs = {
        goldenTickets:
          config.currency === 'tickets'
            ? game.packs.goldenTickets - config.cost
            : game.packs.goldenTickets,
        goldPity: result.newPity,
      };

      const next: GameState = {
        ...game,
        players,
        clubs,
        packs,
        transferredOut: [...(game.transferredOut ?? []), result.winner.id],
      };
      set({
        game: next,
        lastSpin: { reel: result.reel, winnerIndex: result.winnerIndex, winner, isHigh: result.isHigh },
        pullCount: pullCount + 1,
      });
      void persistGame(next);
    },

    clearSpin() {
      set({ lastSpin: null });
    },

    clearTransfers() {
      set({ lastTransfers: null });
    },

    advanceSeason(destination = 'squad') {
      const { game, lastSeason, lastCups, lastInjuries } = get();
      if (!game?.managedClubId || !lastSeason) return;
      const managedId = game.managedClubId;

      const position = lastSeason.table.findIndex((row) => row.clubId === managedId) + 1;
      const row = position > 0 ? lastSeason.table[position - 1] : undefined;
      const nationalCupWon = lastCups?.national.championId === managedId;
      const championsWon = lastCups?.champions.championId === managedId;
      const libertadoresWon = lastCups?.libertadores.championId === managedId;
      const topContinental = championsWon || libertadoresWon;
      const midContinental =
        lastCups?.europa.championId === managedId || lastCups?.sudamericana.championId === managedId;
      const lowContinental = lastCups?.conference.championId === managedId;
      const mundialWon = lastCups?.mundial.championId === managedId;

      const rng = createRng(seedFromString(`${game.seed}:progress:${game.currentSeason}`));
      const progressed = progressSeason(game, rng);
      const clubs = progressed.clubs;
      const currentSeason = progressed.currentSeason;

      // Lesões: marca as longas desta temporada; quem já estava fora recupera 1 temporada.
      const newInjuries = new Map<string, number>();
      for (const injury of lastInjuries ?? []) {
        if (injury.seasonsOut > 0) newInjuries.set(injury.playerId, injury.seasonsOut);
      }
      const players: Record<string, Player> = {};
      for (const [id, player] of Object.entries(progressed.players)) {
        const fresh = newInjuries.get(id);
        const remaining = fresh ?? Math.max(0, (player.injuredSeasons ?? 0) - 1);
        players[id] =
          remaining > 0 ? { ...player, injuredSeasons: remaining } : { ...player, injuredSeasons: undefined };
      }

      const cupFlags = {
        nationalCup: nationalCupWon,
        topContinental,
        midContinental,
        lowContinental,
        mundial: mundialWon,
      };
      const rewards = fullSeasonRewards(position, lastSeason.table.length, cupFlags);
      const managed = clubs[managedId];
      const rewardedClubs = managed
        ? { ...clubs, [managedId]: { ...managed, budget: managed.budget + rewards.budget } }
        : clubs;
      const packs = {
        ...game.packs,
        goldenTickets: game.packs.goldenTickets + rewards.tickets,
      };

      const history: SeasonRecord[] = row
        ? [
            ...game.history,
            {
              season: game.currentSeason,
              leagueId: lastSeason.leagueId,
              finalPosition: position,
              points: row.points,
              won: row.won,
              drawn: row.drawn,
              lost: row.lost,
              goalsFor: row.goalsFor,
              goalsAgainst: row.goalsAgainst,
              champion: position === 1,
              nationalCupWon,
              championsWon,
              libertadoresWon,
            },
          ]
        : game.history;

      // Veredito da diretoria: cumpriu o objetivo? Taças dão bônus. Confiança 0 = demitido.
      const managedReputation = game.clubs[managedId]?.reputation ?? 3;
      const verdict = evaluateBoard(
        managedReputation,
        lastSeason.table.length,
        position,
        game.boardConfidence ?? BOARD_START,
        cupConfidence(cupFlags),
      );

      const baseGame: GameState = {
        ...game,
        players,
        clubs: rewardedClubs,
        currentSeason,
        phase: 'lineup',
        packs,
        history,
        boardConfidence: verdict.confidenceAfter,
      };
      // Preserva a escalação do usuário (só repõe quem saiu/lesionou); banco refeito.
      const newLineup = game.lineup
        ? reconcileLineup(baseGame, managedId, game.lineup)
        : buildLineup(baseGame, managedId, '4-3-3');
      const next: GameState = { ...baseGame, lineup: newLineup };

      set({
        game: next,
        lastSeason: null,
        lastCups: null,
        lastInjuries: null,
        lastTransfers: progressed.transfers,
        seasonCupMatches: null,
        screen: verdict.fired ? 'fired' : destination,
      });
      void persistGame(next);
    },

    goToHistory() {
      set({ screen: 'history' });
    },

    goToLeagueView() {
      set({ screen: 'league-view' });
    },

    goToCompetition(competition) {
      set({ viewedCompetition: competition, screen: 'competition' });
    },

    watchCupMatch(match, competition, roundName) {
      const { game, screen } = get();
      if (!game) return;
      const view = makeCupMatchView(game, match, competition, roundName);
      set({
        cupQueue: {
          matches: [view],
          index: 0,
          returnScreen: screen === 'cup-match' ? 'competition' : screen,
        },
        screen: 'cup-match',
      });
    },

    advanceCupMatch() {
      const { cupQueue } = get();
      if (!cupQueue) return;
      if (cupQueue.index + 1 < cupQueue.matches.length) {
        set({ cupQueue: { ...cupQueue, index: cupQueue.index + 1 } });
      } else {
        set({ screen: cupQueue.returnScreen, cupQueue: null });
      }
    },

    skipCupCinematics() {
      const { cupQueue } = get();
      set({ screen: cupQueue?.returnScreen ?? 'replay', cupQueue: null });
    },

    backToSeasonResults() {
      set({ screen: 'season-results' });
    },

    goToClub(clubId) {
      const { screen } = get();
      set({ viewedClubId: clubId, clubReturnScreen: screen, screen: 'club' });
    },

    backFromClub() {
      const { clubReturnScreen } = get();
      set({ screen: clubReturnScreen });
    },
  };
});
