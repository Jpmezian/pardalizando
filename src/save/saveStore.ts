import { get, set, del } from 'idb-keyval';
import type { GameState } from '@/types';

/**
 * Persistência do save em IndexedDB (via idb-keyval).
 * 1 slot no MVP (spec §10). A chave inclui versão pra futuras migrações.
 */
const SAVE_KEY = 'pardalizando/save/v1';

export async function loadGame(): Promise<GameState | null> {
  const saved = await get<GameState>(SAVE_KEY);
  return saved ?? null;
}

export async function persistGame(game: GameState): Promise<void> {
  await set(SAVE_KEY, game);
}

export async function hasSavedGame(): Promise<boolean> {
  return (await get<GameState>(SAVE_KEY)) !== undefined;
}

export async function clearSave(): Promise<void> {
  await del(SAVE_KEY);
}
