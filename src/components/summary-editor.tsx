import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputSelectionChangeEvent,
} from 'react-native';

import { MarkdownView } from '@/components/markdown-view';
import { Button, SegmentedControl, type IconName } from '@/components/ui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Selection = { start: number; end: number };

/** Toggles "- [ ]" ⇄ "- [x]" on one line. */
export function toggleCheckboxLine(markdown: string, lineIndex: number) {
  const lines = markdown.split('\n');
  const line = lines[lineIndex];
  if (line === undefined) return markdown;
  lines[lineIndex] = line.replace(/\[([ xX])\]/, (_, c: string) => (c === ' ' ? '[x]' : '[ ]'));
  return lines.join('\n');
}

function lineStart(text: string, pos: number) {
  return text.lastIndexOf('\n', pos - 1) + 1;
}

/** Adds a prefix to every selected line, or removes it if all lines already have it. */
function togglePrefix(text: string, sel: Selection, prefix: string) {
  const start = lineStart(text, sel.start);
  const endIdx = text.indexOf('\n', sel.end);
  const end = endIdx === -1 ? text.length : endIdx;
  const block = text.slice(start, end);
  const lines = block.split('\n');
  const stripped = lines.map((l) => l.replace(/^(#{1,3}\s|-\s\[[ xX]\]\s|-\s|\d+\.\s)/, ''));
  const allHave = lines.every((l) => l.startsWith(prefix));
  const next = allHave
    ? stripped.join('\n')
    : stripped.map((l, i) => (prefix === '1. ' ? `${i + 1}. ` : prefix) + l).join('\n');
  const result = text.slice(0, start) + next + text.slice(end);
  return { text: result, selection: { start: start + next.length, end: start + next.length } };
}

function wrap(text: string, sel: Selection, marker: string) {
  const selected = text.slice(sel.start, sel.end) || 'chữ đậm';
  const inserted = `${marker}${selected}${marker}`;
  const result = text.slice(0, sel.start) + inserted + text.slice(sel.end);
  return {
    text: result,
    selection: { start: sel.start + marker.length, end: sel.start + marker.length + selected.length },
  };
}

type ToolKind = 'heading' | 'bold' | 'bullet' | 'numbered' | 'todo';

const TOOL_PREFIX: Record<Exclude<ToolKind, 'bold'>, string> = {
  heading: '## ',
  bullet: '- ',
  numbered: '1. ',
  todo: '- [ ] ',
};

const TOOLS: { kind: ToolKind; label: string; icon?: IconName; text?: string }[] = [
  { kind: 'heading', label: 'Tiêu đề', text: 'H' },
  { kind: 'bold', label: 'In đậm', text: 'B' },
  { kind: 'bullet', label: 'Gạch đầu dòng', icon: 'list' },
  { kind: 'numbered', label: 'Danh sách số', text: '1.' },
  { kind: 'todo', label: 'Việc cần làm', icon: 'checkbox-outline' },
];

type Props = {
  value: string;
  onSave: (text: string) => Promise<void> | void;
  /** Reports unsaved changes so the screen can warn before leaving. */
  onDirtyChange?: (dirty: boolean) => void;
  initialMode?: 'preview' | 'edit';
};

export function SummaryEditor({ value, onSave, onDirtyChange, initialMode = 'preview' }: Props) {
  const theme = useTheme();
  const [mode, setMode] = useState<'preview' | 'edit'>(initialMode);
  const [draft, setDraft] = useState(value);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const dirty = draft !== value;

  // A new summary from the AI (re-summarize) replaces the draft when nothing is pending.
  const [baseValue, setBaseValue] = useState(value);
  if (value !== baseValue) {
    setBaseValue(value);
    if (draft === baseValue) setDraft(value);
  }

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const runTool = (kind: ToolKind) => {
    const r = kind === 'bold' ? wrap(draft, selection, '**') : togglePrefix(draft, selection, TOOL_PREFIX[kind]);
    setDraft(r.text);
    setSelection(r.selection);
    inputRef.current?.focus();
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setMode('preview');
    } finally {
      setSaving(false);
    }
  };

  const toggleInPreview = async (lineIndex: number) => {
    const next = toggleCheckboxLine(draft, lineIndex);
    setDraft(next);
    if (!dirty) await onSave(next);
  };

  return (
    <View style={styles.container}>
      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { value: 'preview', label: 'Xem' },
          { value: 'edit', label: 'Chỉnh sửa' },
        ]}
      />

      {mode === 'edit' ? (
        <View style={[styles.editorBox, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={[styles.toolbar, { borderBottomColor: theme.border }]}>
            {TOOLS.map((t) => (
              <Pressable
                key={t.kind}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                onPress={() => runTool(t.kind)}
                style={({ pressed }) => [
                  styles.tool,
                  { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
                ]}>
                {t.icon ? (
                  <Ionicons name={t.icon} size={18} color={theme.text} />
                ) : (
                  <Text style={[styles.toolText, { color: theme.text }]}>{t.text}</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            selection={Platform.OS === 'web' ? undefined : selection}
            onSelectionChange={(e: TextInputSelectionChangeEvent) =>
              setSelection(e.nativeEvent.selection)
            }
            multiline
            textAlignVertical="top"
            placeholder="Viết hoặc chỉnh sửa bản tóm tắt…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
      ) : draft.trim() ? (
        <MarkdownView source={draft} onToggleCheckbox={toggleInPreview} />
      ) : (
        <Text style={{ color: theme.textSecondary }}>Chưa có nội dung tóm tắt.</Text>
      )}

      {dirty && (
        <View style={styles.actions}>
          <Button
            label="Hoàn tác"
            icon="arrow-undo"
            variant="secondary"
            onPress={() => setDraft(value)}
            style={styles.flex}
          />
          <Button label="Lưu" icon="checkmark" onPress={save} loading={saving} style={styles.flex} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  editorBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
  },
  tool: {
    minWidth: 40,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  toolText: {
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    minHeight: 280,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
