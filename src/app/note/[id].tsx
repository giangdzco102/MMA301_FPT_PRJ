import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AudioPlayer, type AudioPlayerHandle } from '@/components/audio-player';
import { NoteChat } from '@/components/note-chat';
import { ScreenHeader } from '@/components/screen-header';
import { FolderOptions, Sheet, SummaryStyleOptions } from '@/components/sheet';
import { SummaryEditor } from '@/components/summary-editor';
import { TagEditor } from '@/components/tag-editor';
import { Button, Card, IconButton, SegmentedControl, StatusBadge, type IconName } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDate, formatDuration } from '@/lib/format';
import { useFolders } from '@/lib/folders-store';
import {
  collectTags,
  deleteForever,
  moveToTrash,
  restoreFromTrash,
  setFavorite,
  updateNote,
  useNote,
  useNotes,
} from '@/lib/notes-store';
import { processNote } from '@/lib/process-note';
import { SUMMARY_STYLES } from '@/lib/summarize';
import type { SummaryStyle } from '@/lib/types';

const SOURCE_LABEL = { record: 'Ghi âm', upload: 'Tải lên', text: 'Văn bản' } as const;

type Tab = 'summary' | 'transcript' | 'chat';

export default function NoteScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useNote(id);
  const { notes } = useNotes();
  const folders = useFolders();
  const allTags = useMemo(() => collectTags(notes), [notes]);
  const player = useRef<AudioPlayerHandle>(null);
  const [tab, setTab] = useState<Tab>('summary');
  // null = not editing, so AI-generated titles show up as soon as they arrive.
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [sheet, setSheet] = useState<'style' | 'folder' | null>(null);

  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  if (!note) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <ScreenHeader back title="Không tìm thấy ghi chú" />
      </View>
    );
  }

  const busy = note.status === 'pending' || note.status === 'transcribing' || note.status === 'summarizing';
  const inTrash = Boolean(note.deletedAt);
  const folder = folders.find((f) => f.id === note.folderId);
  const sourceTab = note.source === 'text' ? 'Nội dung' : 'Bản ghi';

  const saveTitle = () => {
    const t = titleDraft?.trim();
    if (t && t !== note.title) updateNote(note.id, { title: t, titleEdited: true });
    setTitleDraft(null);
  };

  const share = () => {
    const tags = note.tags?.length ? note.tags.map((t) => `#${t}`).join(' ') : '';
    const body = [note.title, tags, '', note.summary ?? '', note.transcript ? `\n---\n${sourceTab}:\n${note.transcript}` : '']
      .join('\n')
      .trim();
    Share.share({ title: note.title, message: body }).catch(() => {});
  };

  const resummarize = async (style: SummaryStyle) => {
    setSheet(null);
    if (note.summaryEdited || dirty) {
      const ok = await confirm('Tóm tắt lại?', 'Bản tóm tắt bạn đã chỉnh sửa sẽ bị thay bằng bản mới từ AI.', 'Tóm tắt lại');
      if (!ok) return;
    }
    setTab('summary');
    processNote(note.id, { resummarize: true, style });
  };

  const saveTranscript = async () => {
    const text = transcriptDraft?.trim() ?? '';
    setTranscriptDraft(null);
    if (!text || text === note.transcript) return;
    await updateNote(note.id, { transcript: text });
    if (note.summary !== undefined) setSheet('style');
  };

  const trash = async () => {
    await moveToTrash([note.id]);
    router.back();
  };

  const removeForever = async () => {
    const ok = await confirm('Xóa vĩnh viễn?', 'Ghi chú và file ghi âm sẽ bị xóa khỏi máy, không thể khôi phục.', 'Xóa');
    if (!ok) return;
    await deleteForever([note.id]);
    router.back();
  };

  const styleLabel = note.summaryStyle ? SUMMARY_STYLES[note.summaryStyle].label : null;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        back
        title=""
        right={
          !inTrash && (
            <>
              <IconButton
                icon={note.favorite ? 'star' : 'star-outline'}
                label={note.favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                color={note.favorite ? '#F5A524' : theme.text}
                onPress={() => setFavorite([note.id], !note.favorite)}
              />
              <IconButton icon="share-outline" label="Chia sẻ" onPress={share} />
              <IconButton icon="trash-outline" label="Chuyển vào thùng rác" color={theme.danger} onPress={trash} />
            </>
          )
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {inTrash && (
          <Card style={[styles.statusCard, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerSoft }]}>
            <Text style={[styles.statusText, { color: theme.danger }]}>Ghi chú này đang ở trong thùng rác.</Text>
            <View style={styles.row}>
              <Button label="Khôi phục" icon="arrow-undo" onPress={() => restoreFromTrash([note.id])} style={styles.flex} />
              <Button label="Xóa vĩnh viễn" variant="danger" onPress={removeForever} style={styles.flex} />
            </View>
          </Card>
        )}

        <TextInput
          value={titleDraft ?? note.title}
          onChangeText={setTitleDraft}
          onBlur={saveTitle}
          onSubmitEditing={saveTitle}
          editable={!inTrash}
          // Web textareas don't auto-grow and default to two rows.
          multiline={Platform.OS !== 'web'}
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          style={[styles.title, { color: theme.text }]}
          placeholder="Tiêu đề"
          placeholderTextColor={theme.textSecondary}
        />

        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {formatDate(note.createdAt)}
            {note.durationMs ? ` · ${formatDuration(note.durationMs)}` : ''}
            {` · ${SOURCE_LABEL[note.source]}`}
          </Text>
          {!inTrash && (
            <Pressable
              onPress={() => setSheet('folder')}
              style={[styles.folderPill, { backgroundColor: folder ? `${folder.color}1F` : theme.backgroundSelected }]}>
              <Ionicons
                name={(folder?.icon ?? 'folder-outline') as IconName}
                size={13}
                color={folder?.color ?? theme.textSecondary}
              />
              <Text style={[styles.folderText, { color: folder?.color ?? theme.textSecondary }]} numberOfLines={1}>
                {folder?.name ?? 'Thêm vào thư mục'}
              </Text>
              <Ionicons name="chevron-down" size={12} color={folder?.color ?? theme.textSecondary} />
            </Pressable>
          )}
        </View>

        {!inTrash && (
          <TagEditor tags={note.tags ?? []} suggestions={allTags} onChange={(tags) => updateNote(note.id, { tags })} />
        )}

        {note.audioUri && (
          <AudioPlayer ref={player} uri={note.audioUri} fallbackDurationMs={note.durationMs} bookmarks={note.bookmarks} />
        )}

        {!!note.bookmarks?.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookmarks}>
            {note.bookmarks.map((b, i) => (
              <Pressable
                key={b}
                onPress={() => player.current?.playFrom(b)}
                style={[styles.bookmark, { backgroundColor: '#F5A5241F' }]}>
                <Ionicons name="bookmark" size={13} color="#C97E00" />
                <Text style={styles.bookmarkText}>
                  Mốc {i + 1} · {formatDuration(b)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {note.status !== 'done' && (
          <Card
            style={[
              styles.statusCard,
              note.status === 'error' && { backgroundColor: theme.dangerSoft, borderColor: theme.dangerSoft },
            ]}>
            <StatusBadge status={note.status} />
            {note.status === 'error' ? (
              <>
                <Text style={[styles.statusText, { color: theme.danger }]}>{note.error}</Text>
                <Button label="Thử lại" icon="refresh" onPress={() => processNote(note.id)} />
              </>
            ) : (
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                {note.status === 'summarizing'
                  ? 'AI đang đọc nội dung và viết tóm tắt…'
                  : `Đang chuyển giọng nói thành văn bản${note.progress ? ` (đoạn ${note.progress})` : ''}…`}
              </Text>
            )}
          </Card>
        )}

        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'summary', label: 'Tóm tắt' },
            { value: 'transcript', label: sourceTab },
            { value: 'chat', label: '✨ Hỏi AI' },
          ]}
        />

        {tab === 'summary' &&
          (note.summary !== undefined ? (
            <View style={styles.section}>
              {note.transcript && !inTrash && (
                <View style={[styles.resummarize, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="sparkles" size={18} color={theme.accent} />
                  <Text style={[styles.resummarizeText, { color: theme.text }]} numberOfLines={1}>
                    {styleLabel ? `Kiểu: ${styleLabel}` : 'Bản tóm tắt AI'}
                    {note.summaryEdited ? ' · đã sửa' : ''}
                  </Text>
                  <Button label="Tóm tắt lại" variant="ghost" onPress={() => setSheet('style')} disabled={busy} />
                </View>
              )}
              <SummaryEditor
                key={note.id}
                value={note.summary}
                initialMode={note.summary ? 'preview' : 'edit'}
                onDirtyChange={onDirtyChange}
                onSave={(text) => updateNote(note.id, { summary: text, summaryEdited: true })}
              />
            </View>
          ) : busy ? (
            <Placeholder busy text="" />
          ) : (
            <View style={styles.section}>
              <Placeholder busy={false} text="Chưa có bản tóm tắt." />
              {note.transcript && <Button label="Tóm tắt bằng AI" icon="sparkles-outline" onPress={() => setSheet('style')} />}
              <Button
                label="Tự viết tóm tắt"
                icon="create-outline"
                variant="secondary"
                onPress={() => updateNote(note.id, { summary: '', summaryEdited: true })}
              />
            </View>
          ))}

        {tab === 'transcript' &&
          (transcriptDraft !== null ? (
            <View style={styles.section}>
              <TextInput
                value={transcriptDraft}
                onChangeText={setTranscriptDraft}
                multiline
                autoFocus
                textAlignVertical="top"
                style={[styles.transcriptInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              />
              <View style={styles.row}>
                <Button label="Hủy" variant="secondary" onPress={() => setTranscriptDraft(null)} style={styles.flex} />
                <Button label="Lưu" icon="checkmark" onPress={saveTranscript} style={styles.flex} />
              </View>
            </View>
          ) : note.transcript ? (
            <View style={styles.section}>
              <Text selectable style={[styles.transcript, { color: theme.text }]}>
                {note.transcript}
              </Text>
              {!inTrash && !busy && (
                <Button label="Sửa nội dung" icon="create-outline" variant="ghost" onPress={() => setTranscriptDraft(note.transcript ?? '')} />
              )}
            </View>
          ) : (
            <Placeholder busy={busy} text="Bản ghi sẽ xuất hiện ở đây." />
          ))}

        {tab === 'chat' && <NoteChat note={note} />}
      </ScrollView>

      <Sheet visible={sheet === 'style'} onClose={() => setSheet(null)} title="Chọn kiểu tóm tắt">
        <SummaryStyleOptions value={note.summaryStyle} onSelect={resummarize} />
      </Sheet>
      <Sheet visible={sheet === 'folder'} onClose={() => setSheet(null)} title="Chuyển vào thư mục">
        <FolderOptions
          value={note.folderId}
          onSelect={(folderId) => {
            setSheet(null);
            void updateNote(note.id, { folderId });
          }}
        />
        <Button
          label="Tạo thư mục mới"
          icon="add"
          variant="ghost"
          onPress={() => {
            setSheet(null);
            router.push('/folder-edit');
          }}
        />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function Placeholder({ busy, text }: { busy: boolean; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.placeholder}>
      <Ionicons name={busy ? 'hourglass-outline' : 'document-text-outline'} size={28} color={theme.textSecondary} />
      <Text style={{ color: theme.textSecondary }}>{busy ? 'Đang xử lý…' : text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    paddingVertical: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  meta: {
    fontSize: 13,
  },
  folderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 2,
    height: 26,
    borderRadius: Radius.pill,
    maxWidth: 200,
  },
  folderText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  bookmarks: {
    gap: Spacing.two,
  },
  bookmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 4,
    height: 30,
    borderRadius: Radius.pill,
  },
  bookmarkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#C97E00',
    fontVariant: ['tabular-nums'],
  },
  statusCard: {
    gap: Spacing.two,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  resummarize: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    borderRadius: Radius.md + 2,
  },
  resummarizeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  transcript: {
    fontSize: 16,
    lineHeight: 26,
  },
  transcriptInput: {
    minHeight: 240,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 24,
  },
  placeholder: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
});
