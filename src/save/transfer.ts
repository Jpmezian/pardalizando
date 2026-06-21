import type { GameState } from '@/types';
import { loadGame, persistGame } from './saveStore';

/** Exporta o save atual como arquivo JSON (backup/portabilidade — spec §10). */
export async function exportSaveToFile(): Promise<boolean> {
  const game = await loadGame();
  if (!game) return false;

  const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pardalizando-temporada-${game.currentSeason}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

function looksLikeSave(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.seed === 'number' &&
    typeof candidate.clubs === 'object' &&
    typeof candidate.players === 'object'
  );
}

/** Importa um save de um arquivo JSON e persiste no IndexedDB. */
export async function importSaveFromFile(file: File): Promise<boolean> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return false;
  }
  if (!looksLikeSave(parsed)) return false;

  await persistGame(parsed);
  return true;
}
