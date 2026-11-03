import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFolders } from '@/lib/folders-store';
import { SUMMARY_STYLES } from '@/lib/summarize';
import type { SummaryStyle } from '@/lib/types';

/** Bottom sheet built on Modal – works the same in Expo Go, dev builds and web. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

function Option({
  icon,
  iconColor,
  label,
  description,
  selected,
  onPress,
}: {
  icon: IconName;
  iconColor: string;
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
        },
        pressed && { opacity: 0.75 },
      ]}>
      <View style={[styles.optionIcon, { backgroundColor: `${iconColor}1F` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
        {!!description && <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>{description}</Text>}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />}
    </Pressable>
  );
}

/** List of summary styles as selectable cards. */
export function SummaryStyleOptions({ value, onSelect }: { value?: SummaryStyle; onSelect: (s: SummaryStyle) => void }) {
  const theme = useTheme();
  return (
    <>
      {(Object.keys(SUMMARY_STYLES) as SummaryStyle[]).map((s) => (
        <Option
          key={s}
          icon={SUMMARY_STYLES[s].icon as IconName}
          iconColor={theme.accent}
          label={SUMMARY_STYLES[s].label}
          description={SUMMARY_STYLES[s].description}
          selected={value === s}
          onPress={() => onSelect(s)}
        />
      ))}
    </>
  );
}

export function FolderOptions({ value, onSelect }: { value?: string; onSelect: (id: string | undefined) => void }) {
  const theme = useTheme();
  const folders = useFolders();
  return (
    <>
      <Option
        icon="file-tray-outline"
        iconColor={theme.textSecondary}
        label="Chưa phân loại"
        selected={!value || !folders.some((f) => f.id === value)}
        onPress={() => onSelect(undefined)}
      />
      {folders.map((f) => (
        <Option
          key={f.id}
          icon={f.icon as IconName}
          iconColor={f.color}
          label={f.name}
          selected={value === f.id}
          onPress={() => onSelect(f.id)}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Spacing.two + 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: Spacing.three,
  },
  body: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md + 2,
    borderWidth: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 13,
    marginTop: 1,
  },
});
