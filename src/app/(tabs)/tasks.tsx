import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { toggleCheckboxLine } from '@/components/summary-editor';
import { Card, SegmentedControl } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getNote, updateNote, useNotes } from '@/lib/notes-store';
import { collectTasks, type Task } from '@/lib/tasks';

type Show = 'open' | 'done' | 'all';

/** Every "- [ ]" item from all summaries in one checklist, grouped by note. */
export default function TasksScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { notes } = useNotes();
  const [show, setShow] = useState<Show>('open');

  const tasks = useMemo(() => collectTasks(notes), [notes]);
  const doneCount = tasks.filter((t) => t.done).length;

  const sections = useMemo(() => {
    const byNote = new Map<string, Task[]>();
    for (const t of tasks) {
      if (show === 'open' && t.done) continue;
      if (show === 'done' && !t.done) continue;
      byNote.set(t.noteId, [...(byNote.get(t.noteId) ?? []), t]);
    }
    return [...byNote.values()]
      .sort((a, b) => b[0].createdAt - a[0].createdAt)
      .map((data) => ({ title: data[0].noteTitle, noteId: data[0].noteId, data }));
  }, [tasks, show]);

  const toggle = (task: Task) => {
    const note = getNote(task.noteId);
    if (!note?.summary) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    void updateNote(note.id, { summary: toggleCheckboxLine(note.summary, task.line), summaryEdited: true });
  };

  const progress = tasks.length ? doneCount / tasks.length : 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader large title="Việc cần làm" subtitle={`${doneCount}/${tasks.length} việc đã xong`} />
      <SectionList
        sections={sections}
        keyExtractor={(t) => `${t.noteId}:${t.line}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            {tasks.length > 0 && (
              <Card style={styles.progressCard}>
                <View style={styles.progressTop}>
                  <Text style={[styles.progressValue, { color: theme.text }]}>{Math.round(progress * 100)}%</Text>
                  <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                    {tasks.length - doneCount} việc đang chờ
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                  <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: theme.success }]} />
                </View>
              </Card>
            )}
            <SegmentedControl<Show>
              value={show}
              onChange={setShow}
              options={[
                { value: 'open', label: 'Chưa xong' },
                { value: 'done', label: 'Đã xong' },
                { value: 'all', label: 'Tất cả' },
              ]}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/note/[id]', params: { id: section.noteId } })}
            style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {section.title}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
          </Pressable>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.done }}
            onPress={() => toggle(item)}
            style={({ pressed }) => [
              styles.task,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && { opacity: 0.7 },
            ]}>
            <Ionicons
              name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={item.done ? theme.success : theme.textSecondary}
            />
            <Text
              style={[
                styles.taskText,
                { color: item.done ? theme.textSecondary : theme.text },
                item.done && styles.strike,
              ]}>
              {item.text}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.successSoft }]}>
              <Ionicons name="checkmark-done" size={34} color={theme.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {tasks.length ? 'Không còn việc nào ở đây 🎉' : 'Chưa có việc cần làm'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Việc cần làm được lấy tự động từ các ô “- [ ]” trong bản tóm tắt. Dùng kiểu tóm tắt “Biên bản họp” để AI
              liệt kê việc và người phụ trách.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  progressCard: {
    gap: Spacing.two + 4,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  progressValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  progressLabel: {
    fontSize: 14,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.three,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: Spacing.three,
    borderRadius: Radius.md + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  taskText: {
    flex: 1,
    fontSize: 15.5,
    lineHeight: 22,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
