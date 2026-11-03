import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MarkdownView } from '@/components/markdown-view';
import { Chip } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { CHAT_SUGGESTIONS, appendChatTurn, askAboutNote } from '@/lib/note-chat';
import { getNote, updateNote } from '@/lib/notes-store';
import type { Note } from '@/lib/types';

/** "Hỏi AI" tab: a saved conversation with DeepSeek/Grok about one note. */
export function NoteChat({ note }: { note: Note }) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = note.chat ?? [];
  const canAsk = Boolean(note.transcript || note.summary);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    setError(null);
    setBusy(true);
    await appendChatTurn(note.id, 'user', q);
    try {
      const answer = await askAboutNote(getNote(note.id) ?? note, history, q);
      await appendChatTurn(note.id, 'assistant', answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (await confirm('Xóa cuộc trò chuyện?', 'Các câu hỏi và trả lời về ghi chú này sẽ bị xóa.', 'Xóa')) {
      await updateNote(note.id, { chat: undefined });
    }
  };

  if (!canAsk) {
    return (
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Khi có bản ghi hoặc bản tóm tắt, bạn có thể hỏi AI bất cứ điều gì về ghi chú này.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {history.length === 0 && (
        <View style={[styles.intro, { backgroundColor: theme.accentSoft }]}>
          <Ionicons name="sparkles" size={20} color={theme.accent} />
          <Text style={[styles.introText, { color: theme.text }]}>
            Hỏi AI về nội dung ghi chú: tìm ý chính, ai làm gì, soạn email, tạo câu hỏi ôn tập…
          </Text>
        </View>
      )}

      {history.map((turn, i) => (
        <View
          key={`${turn.at}-${i}`}
          style={[
            styles.bubble,
            turn.role === 'user'
              ? [styles.mine, { backgroundColor: theme.accent }]
              : [styles.theirs, { backgroundColor: theme.backgroundElement, borderColor: theme.border }],
          ]}>
          {turn.role === 'user' ? (
            <Text style={[styles.mineText, { color: theme.onAccent }]}>{turn.content}</Text>
          ) : (
            <MarkdownView source={turn.content} />
          )}
        </View>
      ))}

      {busy && (
        <View style={[styles.bubble, styles.theirs, styles.thinking, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={{ color: theme.textSecondary }}>AI đang trả lời…</Text>
        </View>
      )}
      {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

      <View style={styles.suggestions}>
        {CHAT_SUGGESTIONS.map((s) => (
          <Chip key={s} label={s} onPress={() => ask(s)} />
        ))}
      </View>

      <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Hỏi về ghi chú này…"
          placeholderTextColor={theme.textSecondary}
          multiline
          onSubmitEditing={() => ask(input)}
          submitBehavior="submit"
          returnKeyType="send"
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi câu hỏi"
          disabled={!input.trim() || busy}
          onPress={() => ask(input)}
          style={[styles.send, { backgroundColor: input.trim() && !busy ? theme.accent : theme.backgroundSelected }]}>
          <Ionicons name="arrow-up" size={20} color={input.trim() && !busy ? theme.onAccent : theme.textSecondary} />
        </Pressable>
      </View>

      {history.length > 0 && (
        <Pressable onPress={clear} style={styles.clear} hitSlop={8}>
          <Text style={[styles.clearText, { color: theme.textSecondary }]}>Xóa cuộc trò chuyện</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two + 4,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  intro: {
    flexDirection: 'row',
    gap: Spacing.two + 4,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  introText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radius.lg,
  },
  mine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  theirs: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mineText: {
    fontSize: 15.5,
    lineHeight: 22,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  error: {
    fontSize: 14,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.lg + 4,
    paddingLeft: Spacing.three,
    padding: Spacing.one + 2,
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    maxHeight: 120,
    paddingVertical: Spacing.two,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clear: {
    alignSelf: 'center',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
