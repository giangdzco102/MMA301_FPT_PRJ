import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Renders **bold** and *italic* spans inside one line. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <Text key={`${keyPrefix}-${i++}`} style={styles.bold}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else {
      parts.push(
        <Text key={`${keyPrefix}-${i++}`} style={styles.italic}>
          {token.slice(1, -1)}
        </Text>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * Minimal Markdown renderer for the subset the summary prompt asks for:
 * headings, bullets, numbered lists, checkboxes, bold/italic.
 */
export function MarkdownView({
  source,
  onToggleCheckbox,
}: {
  source: string;
  /** When given, tapping a checkbox calls this with its line index. */
  onToggleCheckbox?: (lineIndex: number) => void;
}) {
  const theme = useTheme();
  const lines = source.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((raw, idx) => {
        const key = `l${idx}`;
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={key} style={styles.spacer} />;

        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        if (heading) {
          const level = heading[1].length;
          return (
            <Text
              key={key}
              style={[
                level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3,
                { color: theme.text },
              ]}>
              {inline(heading[2], key)}
            </Text>
          );
        }

        const checkbox = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
        if (checkbox) {
          const checked = checkbox[2].toLowerCase() === 'x';
          return (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              disabled={!onToggleCheckbox}
              onPress={() => onToggleCheckbox?.(idx)}
              style={[styles.row, { paddingLeft: checkbox[1].length * 6 }]}>
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={18}
                color={checked ? theme.success : theme.textSecondary}
                style={styles.checkIcon}
              />
              <Text
                style={[
                  styles.body,
                  { color: checked ? theme.textSecondary : theme.text, flex: 1 },
                  checked && styles.strike,
                ]}>
                {inline(checkbox[3], key)}
              </Text>
            </Pressable>
          );
        }

        const bullet = /^(\s*)[-*•]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <View key={key} style={[styles.row, { paddingLeft: bullet[1].length * 6 }]}>
              <Text style={[styles.body, styles.marker, { color: theme.accent }]}>•</Text>
              <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{inline(bullet[2], key)}</Text>
            </View>
          );
        }

        const numbered = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line);
        if (numbered) {
          return (
            <View key={key} style={[styles.row, { paddingLeft: numbered[1].length * 6 }]}>
              <Text style={[styles.body, styles.marker, { color: theme.accent }]}>{numbered[2]}.</Text>
              <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{inline(numbered[3], key)}</Text>
            </View>
          );
        }

        return (
          <Text key={key} style={[styles.body, { color: theme.text }]}>
            {inline(line, key)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  spacer: {
    height: Spacing.one,
  },
  h1: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  h2: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  h3: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    marginTop: Spacing.one,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  marker: {
    minWidth: 14,
    fontWeight: '700',
  },
  checkIcon: {
    marginTop: 3,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
});
