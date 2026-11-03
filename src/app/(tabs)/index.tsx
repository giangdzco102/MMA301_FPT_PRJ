import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddActions, useAddActionsInset } from '@/components/add-actions';
import { NoteCard } from '@/components/note-card';
import { Button, Card, Chip, IconButton, type IconName } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, WebTabBarInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isConfigured } from '@/lib/config';
import { confirm } from '@/lib/confirm';
import { useFolders } from '@/lib/folders-store';
import { collectTags, moveToTrash, setFavorite, useNotes } from '@/lib/notes-store';
import { collectTasks } from '@/lib/tasks';
import type { Note } from '@/lib/types';

type Filter = 'all' | 'favorite' | 'record' | 'upload' | 'text' | 'attention';
type Sort = 'newest' | 'oldest' | 'title' | 'longest';

const FILTERS: { value: Filter; label: string; icon: IconName }[] = [
  { value: 'all', label: 'Tất cả', icon: 'albums-outline' },
  { value: 'favorite', label: 'Yêu thích', icon: 'star' },
  { value: 'record', label: 'Ghi âm', icon: 'mic-outline' },
  { value: 'upload', label: 'Tải lên', icon: 'cloud-upload-outline' },
  { value: 'text', label: 'Văn bản', icon: 'create-outline' },
  { value: 'attention', label: 'Lỗi / đang xử lý', icon: 'alert-circle-outline' },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'title', label: 'Tên A → Z' },
  { value: 'longest', label: 'Dài nhất' },
];

function matchesFilter(n: Note, filter: Filter) {
  switch (filter) {
    case 'all':
      return true;
    case 'favorite':
      return Boolean(n.favorite);
    case 'attention':
      return n.status !== 'done';
    default:
      return n.source === filter;
  }
}

function compare(sort: Sort) {
  return (a: Note, b: Note) => {
    switch (sort) {
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'title':
        return a.title.localeCompare(b.title, 'vi');
      case 'longest':
        return (b.durationMs ?? 0) - (a.durationMs ?? 0);
      default:
        return b.createdAt - a.createdAt;
    }
  };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function NotesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = useAddActionsInset(true);
  const { notes, isLoaded } = useNotes();
  const folders = useFolders();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('newest');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hello] = useState(greeting);

  const active = useMemo(() => notes.filter((n) => !n.deletedAt), [notes]);
  const trashCount = notes.length - active.length;
  const tags = useMemo(() => collectTags(notes), [notes]);
  const openTasks = useMemo(() => collectTasks(active).filter((t) => !t.done).length, [active]);
  const totalMinutes = Math.round(active.reduce((s, n) => s + (n.durationMs ?? 0), 0) / 60000);
  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const selecting = selectMode || selected.size > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return active
      .filter((n) => matchesFilter(n, filter))
      .filter((n) => !folderId || n.folderId === folderId)
      .filter((n) => !tag || n.tags?.includes(tag))
      .filter(
        (n) =>
          !q ||
          [n.title, n.summary, n.transcript, ...(n.tags ?? [])].some((t) => t?.toLowerCase().includes(q)),
      )
      .sort(compare(sort));
  }, [active, filter, folderId, tag, query, sort]);

  const isFiltered = Boolean(query.trim() || filter !== 'all' || tag || folderId);

  const exitSelection = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearFilters = () => {
    setQuery('');
    setFilter('all');
    setTag(null);
    setFolderId(null);
  };

  const trashSelected = async () => {
    const ids = [...selected];
    const ok = await confirm(
      `Chuyển ${ids.length} ghi chú vào thùng rác?`,
      'Bạn có thể khôi phục trong Thùng rác.',
      'Chuyển vào thùng rác',
    );
    if (!ok) return;
    await moveToTrash(ids);
    exitSelection();
  };

  const favoriteSelected = async () => {
    const ids = [...selected];
    const allStarred = ids.every((id) => active.find((n) => n.id === id)?.favorite);
    await setFavorite(ids, !allStarred);
    exitSelection();
  };

  const sortLabel = SORTS.find((s) => s.value === sort)!.label;
  const nextSort = () => {
    const i = SORTS.findIndex((s) => s.value === sort);
    setSort(SORTS[(i + 1) % SORTS.length].value);
  };
  const allSelected = selected.size > 0 && selected.size === filtered.length;

  const header = (
    <View style={styles.header}>
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.flex}>
            <Text style={styles.heroHello}>{hello} 👋</Text>
            <Text style={styles.heroTitle}>Ghi chú giọng nói</Text>
          </View>
          <Pressable
            accessibilityLabel="Thùng rác"
            onPress={() => router.push('/trash')}
            style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.7 }]}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            {trashCount > 0 && (
              <View style={[styles.dot, { backgroundColor: theme.record }]}>
                <Text style={styles.dotText}>{trashCount > 99 ? '99+' : trashCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={styles.stats}>
          <Stat value={active.length} label="ghi chú" />
          <View style={styles.statDivider} />
          <Stat value={totalMinutes} label="phút ghi âm" />
          <View style={styles.statDivider} />
          <Pressable style={styles.flex} onPress={() => router.push('/tasks')}>
            <Stat value={openTasks} label="việc chưa xong" />
          </Pressable>
        </View>
      </LinearGradient>

      {!isConfigured && (
        <Card style={[styles.banner, { backgroundColor: theme.warningSoft, borderColor: theme.warningSoft }]}>
          <Ionicons name="key-outline" size={20} color={theme.warning} />
          <Text style={[styles.bannerText, { color: theme.warning }]}>
            Dự án chưa cấu hình AI. Điền file .env.local rồi khởi động lại Expo.
          </Text>
        </Card>
      )}

      {active.length > 0 && (
        <>
          <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm tiêu đề, nội dung, thẻ…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {query.length > 0 && (
              <IconButton icon="close-circle" label="Xóa tìm kiếm" size={18} color={theme.textSecondary} onPress={() => setQuery('')} />
            )}
          </View>

          {folders.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {folders.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setFolderId(folderId === f.id ? null : f.id)}
                  style={[
                    styles.folderChip,
                    { borderColor: folderId === f.id ? f.color : theme.border, backgroundColor: folderId === f.id ? `${f.color}22` : theme.backgroundElement },
                  ]}>
                  <Ionicons name={f.icon as IconName} size={14} color={f.color} />
                  <Text style={[styles.folderChipText, { color: theme.text }]}>{f.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((f) => (
              <Chip key={f.value} label={f.label} icon={f.icon} selected={filter === f.value} onPress={() => setFilter(f.value)} />
            ))}
          </ScrollView>

          {tags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {tags.map((t) => (
                <Chip key={t} label={`#${t}`} selected={tag === t} onPress={() => setTag(tag === t ? null : t)} />
              ))}
            </ScrollView>
          )}

          <View style={styles.summaryRow}>
            {selecting ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Đã chọn {selected.size}</Text>
                <View style={styles.flex} />
                <Pressable
                  hitSlop={8}
                  onPress={() => setSelected(allSelected ? new Set() : new Set(filtered.map((n) => n.id)))}>
                  <Text style={[styles.link, { color: theme.accent }]}>{allSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={exitSelection}>
                  <Text style={[styles.link, { color: theme.textSecondary }]}>Xong</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {isFiltered ? `${filtered.length} kết quả` : 'Gần đây'}
                </Text>
                {isFiltered && (
                  <Pressable onPress={clearFilters} hitSlop={8}>
                    <Text style={[styles.link, { color: theme.accent }]}>Xóa lọc</Text>
                  </Pressable>
                )}
                <View style={styles.flex} />
                <Pressable onPress={() => setSelectMode(true)} hitSlop={8} style={styles.inline}>
                  <Ionicons name="checkmark-done" size={16} color={theme.accent} />
                  <Text style={[styles.link, { color: theme.accent }]}>Chọn</Text>
                </Pressable>
                <Pressable onPress={nextSort} hitSlop={8} style={styles.inline} accessibilityLabel="Đổi cách sắp xếp">
                  <Ionicons name="swap-vertical" size={16} color={theme.accent} />
                  <Text style={[styles.link, { color: theme.accent }]}>{sortLabel}</Text>
                </Pressable>
              </>
            )}
          </View>

          {selecting && (
            <View style={styles.bulkRow}>
              <Button label="Yêu thích" icon="star-outline" variant="secondary" onPress={favoriteSelected} disabled={!selected.size} style={styles.flex} />
              <Button label="Xóa" icon="trash-outline" variant="danger" onPress={trashSelected} disabled={!selected.size} style={styles.flex} />
            </View>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + Spacing.two + WebTabBarInset, paddingBottom: bottomInset }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoaded ? (
            active.length === 0 ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.recordSoft }]}>
                  <Ionicons name="mic" size={38} color={theme.record} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Bắt đầu ghi chú đầu tiên</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Bấm nút micro bên dưới để ghi âm, hoặc tải lên file / viết văn bản. AI sẽ chép lại và tóm tắt giúp bạn.
                </Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Không có ghi chú phù hợp.</Text>
                <Button label="Xóa bộ lọc" variant="ghost" onPress={clearFilters} />
              </View>
            )
          ) : undefined
        }
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            folder={item.folderId ? folderById.get(item.folderId) : undefined}
            selecting={selecting}
            selected={selected.has(item.id)}
            onToggleSelect={() => toggleSelect(item.id)}
            onTagPress={(t) => setTag(t)}
          />
        )}
      />
      {!selecting && <AddActions aboveTabBar />}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    paddingHorizontal: Spacing.three,
    gap: Spacing.two + 4,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.two + 6,
    marginBottom: Spacing.one,
  },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.three + 4,
    gap: Spacing.three + 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroHello: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.two + 4,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.two,
  },
  chips: {
    gap: Spacing.two,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  folderChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bulkRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
