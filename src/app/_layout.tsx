import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { loadFolders } from '@/lib/folders-store';
import { loadNotes } from '@/lib/notes-store';
import { loadSettings } from '@/lib/settings';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  useEffect(() => {
    Promise.all([loadNotes(), loadFolders(), loadSettings()]).finally(() => SplashScreen.hideAsync());
  }, []);

  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={{
          ...navTheme,
          colors: {
            ...navTheme.colors,
            primary: colors.accent,
            background: colors.background,
            card: colors.background,
            text: colors.text,
            border: colors.border,
          },
        }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {/* Every screen draws its own ScreenHeader inside the safe area (see screen-header.tsx). */}
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="record" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="note/[id]" />
          <Stack.Screen name="folder/[id]" />
          <Stack.Screen name="folder-edit" />
          <Stack.Screen name="new-text" />
          <Stack.Screen name="trash" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
