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
  clubAverageOvr,
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
import { pickBestXI, teamStrength, type SectorStrength } from '@/engine/ratings';
import { formationSubPositions } from '@/engine/formations';
import { simulateMatch } from '@/engine/match';
import { buildLineup, clubStrength, lineupStrength, reconcileLineup } from '@/engine/lineup';
import { simulateSeason as runSeason, type SeasonOutcome } from '@/engine/season';
import { simulateKnockout, type CupEntrant, type CupResult } from '@/engine/cup';
import { simulateCompetition, type CompetitionResult } from '@/engine/competition';
import { openPack as runOpenPack, sellValue } from '@/engine/market';
import { spinRoulette as runSpin } from '@/engine/roulette';
import { generateSeasonInjuries, type InjuryEvent } from '@/engine/injuries';
import { progressSeason } from '@/engine/progression';
import { BOARD_START, evaluateBoard } from '@/engine/board';
import {
  MIN_ROSTER,
  PACKS,
  ROSTER_LIMIT,
  ROULETTE_SPINS,
  seasonReward,
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
  | 'fired';

export type ViewedCompetition = 'national' | 'champions' | 'libertadores';

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
  libertadores: CompetitionResult;
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
  };
}

/** Força de um clube a partir dos dados embarcados (pra adversários de outras ligas). */
function datasetStrength(club: Club): SectorStrength {
  return teamStrength(pickBestXI(getClubPlayers(club), formationSubPositions('4-3-3')));
}

/** Participantes da Copa Nacional: todos os clubes da sua liga. */
function nationalCupEntrants(game: GameState, lineup: Lineup): CupEntrant[] {
  return Object.values(game.clubs).map((club) => ({
    clubId: club.id,
    strength: club.id === game.managedClubId ? lineupStrength(game, lineup) : clubStrength(game, club),
  }));
}

/** Participantes de uma copa continental: top clubes das ligas do continente + o seu clube. */
function continentalField(game: GameState, lineup: Lineup, continent: Continent): CupEntrant[] {
  const managedId = game.managedClubId;
  const managedClub = managedId ? game.clubs[managedId] : undefined;
  const managedContinent = managedClub ? continentOf(managedClub.leagueId) : undefined;

  const field: Club[] = [];
  for (const league of LEAGUES) {
    if (league.continent !== continent) continue;
    const top = getClubsByLeague(league.id)
      .map((club) => ({ club, avg: clubAverageOvr(club) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4)
      .map((entry) => entry.club);
    field.push(...top);
  }
  if (managedClub && managedContinent === continent && !field.some((club) => club.id === managedClub.id)) {
    field.push(managedClub);
  }

  return field.map((club) => ({
    clubId: club.id,
    strength: club.id === managedId ? lineupStrength(game, lineup) : datasetStrength(club),
  }));
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
  /** Qual competição está aberta na tela de chaveamento. */
  viewedCompetition: ViewedCompetition | null;
  /** Clube aberto na tela de clube + de onde veio (pra voltar). */
  viewedClubId: string | null;
  clubReturnScreen: Screen;
  /** Contador transiente de amistosos — varia o sorteio a cada "nova partida". */
  friendlyCount: number;
  /** Contador transiente de aberturas de pacote — varia o sorteio. */
  pullCount: number;
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
  advanceSeason: () => void;
  goToHistory: () => void;
  goToLeagueView: () => void;
  goToCompetition: (competition: ViewedCompetition) => void;
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
    const { game } = get();
    if (!game?.managedClubId || !game.lineup) return;

    const rng = createRng(seedFromString(`${game.seed}:season:${game.currentSeason}`));
    const outcome = runSeason(game, game.lineup, rng);

    const players = { ...game.players };
    for (const [playerId, seasonStats] of Object.entries(outcome.stats)) {
      const player = players[playerId];
      if (player) players[playerId] = { ...player, seasonStats };
    }

    const cupRng = createRng(seedFromString(`${game.seed}:cups:${game.currentSeason}`));
    const national = simulateKnockout(nationalCupEntrants(game, game.lineup), cupRng);
    const champions = simulateCompetition(continentalField(game, game.lineup, 'europe'), cupRng);
    const libertadores = simulateCompetition(
      continentalField(game, game.lineup, 'south-america'),
      cupRng,
    );

    const injuryRng = createRng(seedFromString(`${game.seed}:injuries:${game.currentSeason}`));
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
      lastCups: { national, champions, libertadores },
      lastInjuries: injuries,
      screen: targetScreen,
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
    viewedCompetition: null,
    viewedClubId: null,
    clubReturnScreen: 'squad',
    friendlyCount: 0,
    pullCount: 0,
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
      // Normaliza saves antigos que não tinham o pity do mercado (M5).
      const game: GameState = {
        ...loaded,
        packs: { goldenTickets: loaded.packs.goldenTickets, goldPity: loaded.packs.goldPity ?? 0 },
        lineup: loaded.lineup ? { ...loaded.lineup, bench: loaded.lineup.bench ?? [] } : null,
        boardConfidence: loaded.boardConfidence ?? BOARD_START,
      };
      const managedClub = game.managedClubId ? game.clubs[game.managedClubId] : undefined;
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
      set({ screen: 'replay' });
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

      const pool = getAllPlayers().filter((player) => game.players[player.id] === undefined);
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

      const next: GameState = { ...game, players, clubs, packs };
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

      const pool = getAllPlayers().filter((player) => game.players[player.id] === undefined);
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

      const next: GameState = { ...game, players, clubs, packs };
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

    advanceSeason() {
      const { game, lastSeason, lastCups, lastInjuries } = get();
      if (!game?.managedClubId || !lastSeason) return;
      const managedId = game.managedClubId;

      const position = lastSeason.table.findIndex((row) => row.clubId === managedId) + 1;
      const row = position > 0 ? lastSeason.table[position - 1] : undefined;
      const nationalCupWon = lastCups?.national.championId === managedId;
      const championsWon = lastCups?.champions.championId === managedId;
      const libertadoresWon = lastCups?.libertadores.championId === managedId;
      const continentalWon = championsWon || libertadoresWon;

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

      const reward = seasonReward(position, lastSeason.table.length);
      const cupBudget = (nationalCupWon ? 20_000_000 : 0) + (continentalWon ? 40_000_000 : 0);
      const cupTickets = continentalWon ? 2 : 0;
      const managed = clubs[managedId];
      const rewardedClubs = managed
        ? { ...clubs, [managedId]: { ...managed, budget: managed.budget + reward.budget + cupBudget } }
        : clubs;
      const packs = {
        ...game.packs,
        goldenTickets: game.packs.goldenTickets + reward.tickets + cupTickets,
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

      // Veredito da diretoria: cumpriu o objetivo? Atualiza a confiança; zerou = demitido.
      const managedReputation = game.clubs[managedId]?.reputation ?? 3;
      const verdict = evaluateBoard(
        managedReputation,
        lastSeason.table.length,
        position,
        game.boardConfidence ?? BOARD_START,
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
        screen: verdict.fired ? 'fired' : 'squad',
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
