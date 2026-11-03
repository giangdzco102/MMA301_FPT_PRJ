import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { newId } from './notes-store';
import type { Folder } from './types';

const STORAGE_KEY = 'voice-notes:folders:v1';

export const FOLDER_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#0EA5E9', '#8B5CF6', '#EF4444', '#14B8A6'];
export const FOLDER_ICONS = [
  'folder',
  'school',
  'briefcase',
  'people',
  'bulb',
  'heart',
  'book',
  'mic',
  'code-slash',
  'airplane',
  'cart',
  'musical-notes',
] as const;

let folders: Folder[] = [];
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

export function loadFolders() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      folders = raw ? JSON.parse(raw) : [];
    } catch {
      folders = [];
    }
    emit();
  })();
  return loadPromise;
}

export function getFolder(id: string | undefined) {
  return id ? folders.find((f) => f.id === id) : undefined;
}

export async function createFolder(input: Pick<Folder, 'name' | 'color' | 'icon'>) {
  const folder: Folder = { id: newId(), createdAt: Date.now(), ...input };
  folders = [...folders, folder];
  emit();
  await persist();
  return folder;
}

export async function updateFolder(id: string, patch: Partial<Pick<Folder, 'name' | 'color' | 'icon'>>) {
  folders = folders.map((f) => (f.id === id ? { ...f, ...patch } : f));
  emit();
  await persist();
}

/** Deletes the folder only; its notes stay and simply become unfiled. */
export async function deleteFolder(id: string) {
  folders = folders.filter((f) => f.id !== id);
  emit();
  await persist();
}

export function useFolders() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => folders,
    () => folders,
  );
}
