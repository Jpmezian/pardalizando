import type { Club, FormationId, GameState, Lineup, Player } from '@/types';
import { formationSubPositions } from './formations';
import { pickBestXI, teamStrength, type FilledSlot, type SectorStrength } from './ratings';

/** Helpers que ligam o GameState ao motor de ratings. Puros, sem React. */

function clubPlayers(game: GameState, club: Club): Player[] {
  const result: Player[] = [];
  for (const playerId of club.squad) {
    const player = game.players[playerId];
    if (player) result.push(player);
  }
  return result;
}

const BENCH_SIZE = 7;

/** Melhor XI de um clube numa formação + banco. Lesionados ficam de fora. */
export function buildLineup(game: GameState, clubId: string, formationId: FormationId): Lineup {
  const club = game.clubs[clubId];
  const available = club ? clubPlayers(game, club).filter((player) => !player.injuredSeasons) : [];
  const xi = pickBestXI(available, formationSubPositions(formationId));
  const usedIds = new Set(xi.map((slot) => slot.player.id));
  const bench = available
    .filter((player) => !usedIds.has(player.id))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, BENCH_SIZE)
    .map((player) => player.id);

  return {
    formation: formationId,
    slots: xi.map((slot) => ({ subPos: slot.subPos, playerId: slot.player.id })),
    bench,
  };
}

export function lineupFilledSlots(game: GameState, lineup: Lineup): FilledSlot[] {
  const filled: FilledSlot[] = [];
  for (const slot of lineup.slots) {
    if (!slot.playerId) continue;
    const player = game.players[slot.playerId];
    if (player) filled.push({ subPos: slot.subPos, player });
  }
  return filled;
}

export function lineupStrength(game: GameState, lineup: Lineup): SectorStrength {
  return teamStrength(lineupFilledSlots(game, lineup));
}

/** Força do XI ideal de um clube controlado pela IA. */
export function clubStrength(game: GameState, club: Club): SectorStrength {
  return teamStrength(pickBestXI(clubPlayers(game, club), formationSubPositions('4-3-3')));
}
