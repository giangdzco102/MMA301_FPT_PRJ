import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { FolderOptions, Sheet } from '@/components/sheet';
import { TagEditor } from '@/components/tag-editor';
import { Button, Card } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notify } from '@/lib/confirm';
import { createTextNote } from '@/lib/create-note';
import { useFolders } from '@/lib/folders-store';
import { collectTags, useNotes } from '@/lib/notes-store';

/** Add a note by typing or pasting text (e.g. a transcript from elsewhere). */
export default function NewTextNoteScreen() {
  const theme = useTheme();
  const { notes } = useNotes();
  const folders = useFolders();
  const params = useLocalSearchParams<{ folderId?: string }>();
  const [folderId, setFolderId] = useState<string | undefined>(params.folderId);
  const [folderSheet, setFolderSheet] = useState(false);
  const folder = folders.find((f) => f.id === folderId);
  const allTags = useMemo(() => collectTags(notes), [notes]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [summarize, setSummarize] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) {
      notify('Chưa có nội dung', 'Hãy nhập hoặc dán nội dung cần lưu.');
      return;
    }
    setSaving(true);
    try {
      const id = await createTextNote({ title, text, tags, summarize, folderId: folder?.id });
      router.replace({ pathname: '/note/[id]', params: { id } });
    } finally {
      setSaving(false);
    }
  };

  const inputColors = { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement };
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}>
      <ScreenHeader back title="Ghi chú văn bản" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Tiêu đề (để trống để AI tự đặt)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.titleInput, inputColors]}
        />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Nhập hoặc dán nội dung: ghi chú cuộc họp, bài giảng, đoạn hội thoại…"
          placeholderTextColor={theme.textSecondary}
          multiline
          textAlignVertical="top"
          style={[styles.body, inputColors]}
        />
        <Text style={[styles.counter, { color: theme.textSecondary }]}>{words} từ</Text>

        <Text style={[styles.label, { color: theme.text }]}>Thư mục</Text>
        <Button
          label={folder?.name ?? 'Chưa phân loại'}
          icon="folder-outline"
          variant="secondary"
          onPress={() => setFolderSheet(true)}
        />

        <Text style={[styles.label, { color: theme.text }]}>Thẻ</Text>
        <TagEditor tags={tags} onChange={setTags} suggestions={allTags} />

        <Card style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={[styles.label, { color: theme.text }]}>Tóm tắt bằng AI</Text>
            <Text style={[styles.help, { color: theme.textSecondary }]}>
              AI (DeepSeek/Grok) sẽ tóm tắt và đặt tiêu đề sau khi lưu.
            </Text>
          </View>
          <Switch
            value={summarize}
            onValueChange={setSummarize}
            trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
          />
        </Card>

        <Button label="Lưu ghi chú" icon="checkmark" onPress={save} loading={saving} />
      </ScrollView>
      <Sheet visible={folderSheet} onClose={() => setFolderSheet(false)} title="Chọn thư mục">
        <FolderOptions
          value={folderId}
          onSelect={(id) => {
            setFolderId(id);
            setFolderSheet(false);
          }}
        />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    minHeight: 260,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 24,
  },
  counter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: -Spacing.two,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  help: {
    fontSize: 13,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
