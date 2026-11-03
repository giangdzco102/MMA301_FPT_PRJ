import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { IconButton, type IconName } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';
import { useFolders } from '@/lib/folders-store';
import { useNotes } from '@/lib/notes-store';

/** Pseudo-folder id for notes without a folder (also used by folder/[id]). */
const UNFILED = 'none';

export default function FoldersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const folders = useFolders();
  const { notes } = useNotes();

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; duration: number }>();
    for (const n of notes) {
      if (n.deletedAt) continue;
      const key = n.folderId && folders.some((f) => f.id === n.folderId) ? n.folderId : UNFILED;
      const s = map.get(key) ?? { count: 0, duration: 0 };
      s.count += 1;
      s.duration += n.durationMs ?? 0;
      map.set(key, s);
    }
    return map;
  }, [notes, folders]);

  // Two columns on phones, more on wide screens.
  const columns = Math.max(2, Math.floor(Math.min(width, MaxContentWidth) / 190));
  const tileWidth = (Math.min(width, MaxContentWidth) - Spacing.three * 2 - Spacing.two * 2 * (columns - 1)) / columns;

  const tiles = [
    ...folders.map((f) => ({ id: f.id, name: f.name, color: f.color, icon: f.icon as IconName })),
    { id: UNFILED, name: 'Chưa phân loại', color: theme.textSecondary, icon: 'file-tray-outline' as IconName },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        large
        title="Thư mục"
        subtitle={`${folders.length} thư mục`}
        right={<IconButton icon="add-circle" label="Thư mục mới" size={32} color={theme.accent} onPress={() => router.push('/folder-edit')} />}
      />
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}>
        {tiles.map((t) => {
          const s = stats.get(t.id) ?? { count: 0, duration: 0 };
          return (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: '/folder/[id]', params: { id: t.id } })}
              onLongPress={() => t.id !== UNFILED && router.push({ pathname: '/folder-edit', params: { id: t.id } })}
              style={({ pressed }) => [
                styles.tile,
                { width: tileWidth, backgroundColor: theme.backgroundElement, borderColor: theme.border },
                shadow(theme.shadow),
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
              ]}>
              <View style={[styles.tileBand, { backgroundColor: `${t.color}1A` }]}>
                <View style={[styles.tileIcon, { backgroundColor: t.color }]}>
                  <Ionicons name={t.icon} size={22} color="#fff" />
                </View>
              </View>
              <View style={styles.tileBody}>
                <Text style={[styles.tileName, { color: theme.text }]} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={[styles.tileMeta, { color: theme.textSecondary }]}>
                  {s.count} ghi chú{s.duration ? ` · ${formatDuration(s.duration)}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.push('/folder-edit')}
          style={({ pressed }) => [
            styles.tile,
            styles.newTile,
            { width: tileWidth, borderColor: theme.accent },
            pressed && { opacity: 0.7 },
          ]}>
          <Ionicons name="add" size={30} color={theme.accent} />
          <Text style={[styles.tileName, { color: theme.accent }]}>Thư mục mới</Text>
        </Pressable>

        {folders.length === 0 && (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Tạo thư mục để xếp ghi chú theo môn học, dự án hay cuộc họp. Nhấn giữ một thư mục để sửa.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  tile: {
    borderRadius: Radius.lg + 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tileBand: {
    height: 74,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBody: {
    padding: Spacing.three,
    paddingTop: Spacing.two + 4,
    gap: 2,
  },
  tileName: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  tileMeta: {
    fontSize: 12.5,
  },
  newTile: {
    minHeight: 140,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  hint: {
    width: '100%',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
