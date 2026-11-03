import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function normalizeTag(raw: string) {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').slice(0, 30);
}

/** Tag chips with remove buttons, an input to add new ones and suggestions from other notes. */
export function TagEditor({
  tags,
  onChange,
  suggestions = [],
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const theme = useTheme();
  const [input, setInput] = useState('');

  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    setInput('');
    if (!tag || tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...tags, tag]);
  };

  const query = normalizeTag(input).toLowerCase();
  const unused = suggestions
    .filter((s) => !tags.includes(s) && (!query || s.toLowerCase().includes(query)))
    .slice(0, 8);

  return (
    <View style={styles.container}>
      <View style={styles.wrap}>
        {tags.map((t) => (
          <Chip key={t} label={`#${t}`} onRemove={() => onChange(tags.filter((x) => x !== t))} />
        ))}
        <TextInput
          value={input}
          onChangeText={(v) => (v.endsWith(',') ? add(v.slice(0, -1)) : setInput(v))}
          onSubmitEditing={() => add(input)}
          placeholder="+ Thêm thẻ"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          submitBehavior="submit"
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
      </View>
      {unused.length > 0 && (
        <View style={styles.wrap}>
          {unused.map((s) => (
            <Chip key={s} label={`+ ${s}`} onPress={() => add(s)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    minWidth: 110,
    height: 32,
    paddingHorizontal: Spacing.two + 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    fontSize: 13,
  },
});
