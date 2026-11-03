import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Settings } from './types';

const PREFS_KEY = 'voice-notes:settings:v1';

export const DEFAULT_SETTINGS: Settings = {
  aiModel: 'deepseek',
  summaryStyle: 'detailed',
  language: 'auto',
};

let settings: Settings = DEFAULT_SETTINGS;
let loadPromise: Promise<Settings> | null = null;
const listeners = new Set<() => void>();

export function loadSettings(): Promise<Settings> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      const prefs = raw ? JSON.parse(raw) : {};
      settings = {
        aiModel: prefs.aiModel === 'grok' ? 'grok' : 'deepseek',
        summaryStyle: prefs.summaryStyle ?? DEFAULT_SETTINGS.summaryStyle,
        language: prefs.language ?? DEFAULT_SETTINGS.language,
      };
    } catch {
      settings = DEFAULT_SETTINGS;
    }
    for (const l of listeners) l();
    return settings;
  })();
  return loadPromise;
}

export async function saveSettings(next: Settings) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  settings = next;
  for (const l of listeners) l();
}

export function useSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
    () => settings,
  );
}
