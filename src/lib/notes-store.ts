import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { deleteAudio } from './audio-files';
import type { Note } from './types';

/**
 * All notes live on the device: metadata in AsyncStorage, audio files in the
 * app's document directory (see audio-files.ts). No backend involved.
 */
const STORAGE_KEY = 'voice-notes:notes:v1';
export const TRASH_RETENTION_DAYS = 30;

let notes: Note[] = [];
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function loadNotes(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: Note[] = raw ? JSON.parse(raw) : [];
      // A note stuck mid-processing (app was killed) is marked as failed so it can be retried.
      notes = parsed.map((n) =>
        n.status === 'transcribing' || n.status === 'summarizing' || n.status === 'pending'
          ? { ...n, status: 'error', error: 'Xử lý bị gián đoạn. Hãy thử lại.' }
          : n,
      );
    } catch {
      notes = [];
    }
    // Notes left in the trash past the retention period are removed for good.
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 3600 * 1000;
    const expired = notes.filter((n) => n.deletedAt && n.deletedAt < cutoff);
    if (expired.length) await deleteForever(expired.map((n) => n.id));
    loaded = true;
    emit();
  })();
  return loadPromise;
}

export function getNote(id: string): Note | undefined {
  return notes.find((n) => n.id === id);
}

export async function addNote(note: Note) {
  notes = [note, ...notes];
  emit();
  await persist();
}

export async function updateNote(id: string, patch: Partial<Note>) {
  notes = notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n));
  emit();
  await persist();
}

/** Applies the same patch to several notes without touching their updatedAt. */
async function patchMany(ids: string[], patch: Partial<Note>) {
  const set = new Set(ids);
  notes = notes.map((n) => (set.has(n.id) ? { ...n, ...patch } : n));
  emit();
  await persist();
}

export function setFavorite(ids: string[], favorite: boolean) {
  return patchMany(ids, { favorite });
}

export function moveToTrash(ids: string[]) {
  return patchMany(ids, { deletedAt: Date.now() });
}

export function restoreFromTrash(ids: string[]) {
  return patchMany(ids, { deletedAt: undefined });
}

export async function deleteForever(ids: string[]) {
  const set = new Set(ids);
  for (const n of notes) {
    if (set.has(n.id) && n.audioUri) deleteAudio(n.audioUri);
  }
  notes = notes.filter((n) => !set.has(n.id));
  emit();
  await persist();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotes() {
  const list = useSyncExternalStore(subscribe, () => notes, () => notes);
  const isLoaded = useSyncExternalStore(subscribe, () => loaded, () => loaded);
  return { notes: list, isLoaded };
}

export function useNote(id: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => (id ? getNote(id) : undefined),
    () => (id ? getNote(id) : undefined),
  );
}

/** Every tag used by notes that are not in the trash, alphabetically. */
export function collectTags(list: Note[]) {
  const tags = new Set<string>();
  for (const n of list) {
    if (!n.deletedAt) for (const t of n.tags ?? []) tags.add(t);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, 'vi'));
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
