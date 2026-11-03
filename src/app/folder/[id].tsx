import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { AddActions, useAddActionsInset } from '@/components/add-actions';
import { NoteCard } from '@/components/note-card';
import { ScreenHeader } from '@/components/screen-header';
import { IconButton, type IconName } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';
import { useFolders } from '@/lib/folders-store';
import { useNotes } from '@/lib/notes-store';

const UNFILED = 'none';

export default function FolderScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const folders = useFolders();
  const { notes } = useNotes();
  const [query, setQuery] = useState('');
  const bottomInset = useAddActionsInset();
  const folder = folders.find((f) => f.id === id);
  const unfiled = id === UNFILED;

  const list = useMemo(() => {
    const ids = new Set(folders.map((f) => f.id));
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !n.deletedAt)
      .filter((n) => (unfiled ? !n.folderId || !ids.has(n.folderId) : n.folderId === id))
      .filter((n) => !q || [n.title, n.summary, n.transcript].some((t) => t?.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, folders, id, unfiled, query]);

  if (!folder && !unfiled) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ScreenHeader back title="Không tìm thấy thư mục" />
      </View>
    );
  }

  const color = folder?.color ?? theme.textSecondary;
  const duration = list.reduce((s, n) => s + (n.durationMs ?? 0), 0);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        back
        title={folder?.name ?? 'Chưa phân loại'}
        subtitle={`${list.length} ghi chú${duration ? ` · ${formatDuration(duration)}` : ''}`}
        leading={
          <View style={[styles.icon, { backgroundColor: color }]}>
            <Ionicons name={(folder?.icon ?? 'file-tray-outline') as IconName} size={18} color="#fff" />
          </View>
        }
        right={
          folder && (
            <IconButton
              icon="create-outline"
              label="Sửa thư mục"
              onPress={() => router.push({ pathname: '/folder-edit', params: { id: folder.id } })}
            />
          )
        }
      />
      <FlatList
        data={list}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm trong thư mục…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={40} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {query ? 'Không có kết quả.' : 'Thư mục trống. Ghi âm hoặc viết ghi chú mới ngay tại đây.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <NoteCard note={item} />}
      />
      <AddActions folderId={folder?.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two + 4,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
    marginBottom: Spacing.one,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
