import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, IconButton } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import { deleteForever, restoreFromTrash, TRASH_RETENTION_DAYS, useNotes } from '@/lib/notes-store';

const DAY = 24 * 3600 * 1000;

export default function TrashScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { notes } = useNotes();
  // Captured once per visit so "days left" stays stable across re-renders.
  const [now] = useState(() => Date.now());
  const trashed = useMemo(
    () => notes.filter((n) => n.deletedAt).sort((a, b) => b.deletedAt! - a.deletedAt!),
    [notes],
  );

  const emptyTrash = async () => {
    const ok = await confirm(
      'Dọn sạch thùng rác?',
      `${trashed.length} ghi chú và file ghi âm sẽ bị xóa vĩnh viễn.`,
      'Xóa vĩnh viễn',
    );
    if (ok) await deleteForever(trashed.map((n) => n.id));
  };

  const removeOne = async (id: string) => {
    const ok = await confirm('Xóa vĩnh viễn?', 'Không thể khôi phục sau khi xóa.', 'Xóa');
    if (ok) await deleteForever([id]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader
        back
        title="Thùng rác"
        subtitle={`${trashed.length} ghi chú`}
        right={trashed.length > 0 && <Button label="Dọn sạch" variant="ghost" onPress={emptyTrash} />}
      />
      <FlatList
        data={trashed}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.five + insets.bottom }]}
        ListHeaderComponent={
          trashed.length > 0 ? (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Ghi chú trong thùng rác sẽ tự xóa sau {TRASH_RETENTION_DAYS} ngày.
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trash-outline" size={40} color={theme.textSecondary} />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Thùng rác trống.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const daysLeft = Math.max(
            0,
            Math.ceil((item.deletedAt! + TRASH_RETENTION_DAYS * DAY - now) / DAY),
          );
          return (
            <Pressable onPress={() => router.push({ pathname: '/note/[id]', params: { id: item.id } })}>
              <Card style={styles.card}>
                <View style={styles.flex}>
                  <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>
                    Xóa lúc {formatDate(item.deletedAt!)} · còn {daysLeft} ngày
                  </Text>
                </View>
                <IconButton icon="arrow-undo" label="Khôi phục" color={theme.accent} onPress={() => restoreFromTrash([item.id])} />
                <IconButton icon="close-circle-outline" label="Xóa vĩnh viễn" color={theme.danger} onPress={() => removeOne(item.id)} />
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two + 4,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
});
