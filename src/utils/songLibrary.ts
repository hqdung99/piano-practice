import { useSyncExternalStore } from 'react';
import { SONGS } from './songs';
import type { SongSource } from './songs';
import { profileKey } from './profiles';

/**
 * Built-in songs plus the ones the learner imported (MIDI / MusicXML), which
 * are kept in this browser per profile.
 */

const STORAGE_KEY = 'piano.importedSongs';

function loadImported(): SongSource[] {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(STORAGE_KEY)) ?? '[]') as SongSource[];
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

let imported = loadImported();
let all: SongSource[] = [...SONGS, ...imported];
const listeners = new Set<() => void>();

function commit(next: SongSource[]): boolean {
  try {
    localStorage.setItem(profileKey(STORAGE_KEY), JSON.stringify(next));
  } catch {
    return false;
  }
  imported = next;
  all = [...SONGS, ...imported];
  listeners.forEach((l) => l());
  return true;
}

/** Adds an imported song; returns false when it couldn't be saved (storage full) */
export function addImportedSong(song: SongSource): boolean {
  return commit([...imported.filter((s) => s.id !== song.id), song]);
}

export function removeImportedSong(id: string) {
  commit(imported.filter((s) => s.id !== id));
}

export function allSongs(): SongSource[] {
  return all;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSongLibrary(): SongSource[] {
  return useSyncExternalStore(subscribe, allSongs);
}
