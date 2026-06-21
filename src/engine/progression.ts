import type { Club, GameState, Player, SubPos } from '@/types';
import type { Rng } from './rng';
import { ROSTER_LIMIT } from '@/config/economy';

const YOUTH_POSITIONS: SubPos[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'];

/** Progressão entre temporadas (spec §7): envelhecimento, evolução/declínio, IA leve. */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Valor de mercado derivado de OVR + idade (mesma curva do pré-processamento). */
export function playerValue(ovr: number, age: number): number {
  const ageFactor = age <= 23 ? 1.15 : age <= 28 ? 1 : age <= 31 ? 0.7 : 0.4;
  const base = Math.max(0, ovr - 45) ** 3 * 650;
  return Math.max(50_000, Math.round((base * ageFactor) / 50_000) * 50_000);
}

/** OVR-alvo médio de um clube pela reputação (referência pra IA). */
function reputationOvr(reputation: number): number {
  return [0, 69, 72, 75, 78, 82][clamp(reputation, 1, 5)] ?? 72;
}

/** Envelhece e evolui/declina um jogador. Jovens sobem rumo ao potencial; veteranos caem. */
export function progressPlayer(player: Player, rng: Rng): Player {
  const age = player.age + 1;
  const playedFactor = player.seasonStats ? clamp(player.seasonStats.apps / 25, 0, 1) : 0.3;
  let ovr = player.ovr;

  if (age <= 23 && player.ovr < player.pot) {
    const gap = player.pot - player.ovr;
    const growth = (0.5 + playedFactor) * (gap / 6) + rng.range(-0.4, 0.8);
    ovr = Math.min(player.pot, player.ovr + Math.max(0, Math.round(growth)));
  } else if (age >= 31) {
    const decline = (age - 30) * 0.5 + rng.range(0, 1.2);
    ovr = player.ovr - Math.max(0, Math.round(decline));
  } else {
    ovr = player.ovr + Math.round(rng.range(-1, 1));
  }

  ovr = clamp(ovr, 40, 99);
  return {
    ...player,
    age,
    ovr,
    form: rng.int(-3, 3),
    value: playerValue(ovr, age),
    seasonStats: undefined,
  };
}

const REGEN_FIRST = [
  'Léo', 'Bruno', 'Caio', 'Enzo', 'Theo', 'Noah', 'Hugo', 'Rafa', 'Nico', 'Yuri',
  'Vitor', 'Igor', 'Davi', 'Dado', 'Pepe',
];
const REGEN_LAST = [
  'Souza', 'Costa', 'Berg', 'Rossi', 'Nunes', 'Vidal', 'Lima', 'Falk', 'Vega', 'Mensah',
  'Reyes', 'Stein', 'Conti', 'Wolff', 'Haas',
];

function posOfSubPos(subPos: SubPos): Player['pos'] {
  if (subPos === 'GK') return 'GK';
  if (subPos === 'CB' || subPos === 'LB' || subPos === 'RB') return 'DF';
  if (subPos === 'DM' || subPos === 'CM' || subPos === 'AM') return 'MF';
  return 'FW';
}

function makeRegen(club: Club, subPos: SubPos, rng: Rng, id: string): Player {
  const target = reputationOvr(club.reputation);
  const ovr = clamp(target - 6 + rng.int(0, 6), 55, 82);
  const pot = clamp(ovr + rng.int(4, 14), ovr, 92);
  const age = 17 + rng.int(0, 3);
  const first = REGEN_FIRST[rng.int(0, REGEN_FIRST.length - 1)]!;
  const last = REGEN_LAST[rng.int(0, REGEN_LAST.length - 1)]!;
  return {
    id,
    name: `${first} ${last}`,
    clubId: club.id,
    pos: posOfSubPos(subPos),
    subPos,
    ovr,
    pot,
    age,
    value: playerValue(ovr, age),
    form: rng.int(-3, 3),
  };
}

/** Joia da base do clube: cru (OVR baixo) mas com potencial alto, bem jovem. */
function makeYouth(club: Club, subPos: SubPos, rng: Rng, id: string): Player {
  const target = reputationOvr(club.reputation);
  const ovr = clamp(target - 14 + rng.int(0, 8), 48, 72);
  const pot = clamp(ovr + rng.int(8, 22), ovr + 6, 91);
  const age = 16 + rng.int(0, 2);
  const first = REGEN_FIRST[rng.int(0, REGEN_FIRST.length - 1)]!;
  const last = REGEN_LAST[rng.int(0, REGEN_LAST.length - 1)]!;
  return {
    id,
    name: `${first} ${last}`,
    clubId: club.id,
    pos: posOfSubPos(subPos),
    subPos,
    ovr,
    pot,
    age,
    value: playerValue(ovr, age),
    form: rng.int(-3, 3),
  };
}

const RETIREMENT_AGE = 35;
const MAX_REGENS_PER_CLUB = 3;

export interface AdvancedState {
  players: Record<string, Player>;
  clubs: Record<string, Club>;
  currentSeason: number;
}

/**
 * Fecha a temporada: envelhece/evolui todo mundo e, nos clubes da IA, repõe
 * veteranos aposentados por crias (transferências simples). O clube do jogador
 * não é mexido — quem cuida do elenco é ele.
 */
export function progressSeason(game: GameState, rng: Rng): AdvancedState {
  const players: Record<string, Player> = {};
  for (const [id, player] of Object.entries(game.players)) {
    players[id] = progressPlayer(player, rng);
  }

  const clubs: Record<string, Club> = {};
  for (const [id, club] of Object.entries(game.clubs)) {
    clubs[id] = { ...club, squad: [...club.squad] };
  }

  for (const club of Object.values(clubs)) {
    if (club.id === game.managedClubId) continue;

    let regens = 0;
    for (let i = 0; i < club.squad.length && regens < MAX_REGENS_PER_CLUB; i += 1) {
      const playerId = club.squad[i]!;
      const player = players[playerId];
      if (!player || player.age < RETIREMENT_AGE) continue;

      const regenId = `regen-${game.currentSeason}-${club.id}-${regens}`;
      const regen = makeRegen(club, player.subPos, rng, regenId);
      delete players[playerId];
      players[regenId] = regen;
      club.squad[i] = regenId;
      regens += 1;
    }
  }

  // Academia do clube do usuário: 1 joia da base por temporada (se houver espaço).
  const managedClub = game.managedClubId ? clubs[game.managedClubId] : undefined;
  if (managedClub && managedClub.squad.length < ROSTER_LIMIT) {
    const subPos = YOUTH_POSITIONS[rng.int(0, YOUTH_POSITIONS.length - 1)]!;
    const youthId = `youth-${game.currentSeason}-${managedClub.id}`;
    players[youthId] = makeYouth(managedClub, subPos, rng, youthId);
    managedClub.squad = [...managedClub.squad, youthId];
  }

  return { players, clubs, currentSeason: game.currentSeason + 1 };
}
