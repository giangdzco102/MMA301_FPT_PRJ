import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, IconButton, StatusBadge, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatDuration, plainPreview } from '@/lib/format';
import { setFavorite } from '@/lib/notes-store';
import type { Folder, Note } from '@/lib/types';

const SOURCE_ICON: Record<Note['source'], IconName> = {
  record: 'mic',
  upload: 'musical-notes',
  text: 'document-text',
};

export function NoteCard({
  note,
  folder,
  selecting = false,
  selected = false,
  onToggleSelect,
  onTagPress,
}: {
  note: Note;
  folder?: Folder;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onTagPress?: (tag: string) => void;
}) {
  const theme = useTheme();
  const preview = note.status === 'error' ? note.error : plainPreview(note.summary || note.transcript);
  const tile = {
    record: [theme.recordSoft, theme.record],
    upload: [theme.accentSoft, theme.accent],
    text: [theme.successSoft, theme.success],
  }[note.source];

  return (
    <Pressable
      onPress={() =>
        selecting && onToggleSelect
          ? onToggleSelect()
          : router.push({ pathname: '/note/[id]', params: { id: note.id } })
      }
      onLongPress={onToggleSelect}
      delayLongPress={300}
      style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }}>
      <Card style={[styles.card, selected && { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}>
        <View style={[styles.tile, { backgroundColor: selecting ? 'transparent' : tile[0] }]}>
          {selecting ? (
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={26}
              color={selected ? theme.accent : theme.textSecondary}
            />
          ) : (
            <Ionicons name={SOURCE_ICON[note.source]} size={20} color={tile[1]} />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.top}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {note.title}
            </Text>
            {!selecting && (
              <IconButton
                icon={note.favorite ? 'star' : 'star-outline'}
                label={note.favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                size={19}
                color={note.favorite ? '#F5A524' : theme.textSecondary}
                onPress={() => setFavorite([note.id], !note.favorite)}
              />
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {formatDate(note.createdAt)}
              {note.durationMs ? ` · ${formatDuration(note.durationMs)}` : ''}
            </Text>
            {folder && (
              <View style={[styles.folder, { backgroundColor: `${folder.color}1F` }]}>
                <Ionicons name={folder.icon as IconName} size={11} color={folder.color} />
                <Text style={[styles.folderText, { color: folder.color }]} numberOfLines={1}>
                  {folder.name}
                </Text>
              </View>
            )}
          </View>

          {!!preview && (
            <Text
              style={[styles.preview, { color: note.status === 'error' ? theme.danger : theme.textSecondary }]}
              numberOfLines={2}>
              {preview}
            </Text>
          )}

          {(note.status !== 'done' || (note.tags?.length ?? 0) > 0) && (
            <View style={styles.footer}>
              {note.status !== 'done' && <StatusBadge status={note.status} />}
              {note.tags?.map((t) => (
                <Pressable key={t} onPress={() => onTagPress?.(t)} disabled={selecting || !onTagPress} hitSlop={4}>
                  <Text style={[styles.tag, { color: theme.accent, backgroundColor: theme.accentSoft }]}>#{t}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.two + 4,
    borderRadius: Radius.lg + 2,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: 12.5,
  },
  folder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    maxWidth: 140,
  },
  folderText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
});
