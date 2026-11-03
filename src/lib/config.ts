import { Platform } from 'react-native';

import type { AiModelChoice } from './types';

/**
 * AI settings are configured once for the whole project in `.env.local`
 * (see `.env.example`). Expo inlines EXPO_PUBLIC_* variables into the bundle at
 * build time, so they must be read with the full `process.env.NAME` expression.
 */
const BASE_URL = (process.env.EXPO_PUBLIC_AI_BASE_URL ?? '').trim().replace(/\/+$/, '');
const API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY?.trim() ?? '';

export const apiConfig = {
  // The gateway rejects browser CORS preflights, so the web dev build goes through
  // the local proxy in metro.config.js. Native apps call the gateway directly.
  baseUrl: Platform.OS === 'web' && __DEV__ ? '/__ai' : BASE_URL,
  apiKey: API_KEY,
  summaryModels: {
    deepseek: process.env.EXPO_PUBLIC_DEEPSEEK_MODEL?.trim() || 'deepseek-v4-pro',
    grok: process.env.EXPO_PUBLIC_GROK_MODEL?.trim() || 'grok-4.7',
  } satisfies Record<AiModelChoice, string>,
  // Comma-separated; later models are fallbacks when the first one is down.
  transcribeModels: (process.env.EXPO_PUBLIC_TRANSCRIBE_MODEL || 'gemini-3.7-flash,gemini-3.6-flash')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
};

export const isConfigured = Boolean(BASE_URL && API_KEY);
