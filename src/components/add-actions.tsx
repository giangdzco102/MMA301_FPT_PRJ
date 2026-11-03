import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notify } from '@/lib/confirm';
import { createNoteFromAudio } from '@/lib/create-note';

/**
 * Floating "Tải lên · Ghi âm · Viết" bar. `aboveTabBar` lifts it over the iOS
 * native tab bar, which overlays the screen content.
 */
export function AddActions({ folderId, aboveTabBar }: { folderId?: string; aboveTabBar?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);

  const tap = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const upload = async () => {
    tap();
    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const id = await createNoteFromAudio({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType ?? 'audio/mpeg',
        source: 'upload',
        folderId,
      });
      router.push({ pathname: '/note/[id]', params: { id } });
    } catch (e) {
      notify('Không tải được file', e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const bottom = aboveTabBar && Platform.OS === 'ios' ? insets.bottom + 58 : Math.max(insets.bottom, Spacing.three);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, shadow(theme.shadow, 'high')]}>
        <Pressable
          accessibilityRole="button"
          onPress={upload}
          disabled={uploading}
          style={({ pressed }) => [styles.side, pressed && styles.pressed]}>
          {uploading ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={22} color={theme.text} />
          )}
          <Text style={[styles.sideLabel, { color: theme.textSecondary }]}>Tải lên</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ghi âm"
          onPress={() => {
            tap();
            router.push(folderId ? { pathname: '/record', params: { folderId } } : '/record');
          }}
          style={({ pressed }) => [
            styles.record,
            { backgroundColor: theme.record, borderColor: theme.backgroundElement },
            shadow(theme.record, 'high'),
            pressed && styles.pressed,
          ]}>
          <Ionicons name="mic" size={30} color="#fff" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tap();
            router.push(folderId ? { pathname: '/new-text', params: { folderId } } : '/new-text');
          }}
          style={({ pressed }) => [styles.side, pressed && styles.pressed]}>
          <Ionicons name="create-outline" size={22} color={theme.text} />
          <Text style={[styles.sideLabel, { color: theme.textSecondary }]}>Viết</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Bottom padding a list needs so its last item can scroll above the floating bar. */
export function useAddActionsInset(aboveTabBar?: boolean) {
  const insets = useSafeAreaInsets();
  return (aboveTabBar && Platform.OS === 'ios' ? insets.bottom + 58 : insets.bottom) + 110;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    height: 64,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  side: {
    alignItems: 'center',
    gap: 2,
    minWidth: 56,
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  record: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginTop: -26,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
