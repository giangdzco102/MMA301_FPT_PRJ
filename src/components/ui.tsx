import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing, shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NoteStatus } from '@/lib/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.accent, fg: theme.onAccent, border: theme.accent },
    secondary: { bg: theme.backgroundElement, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.accent, border: 'transparent' },
    danger: { bg: theme.dangerSoft, fg: theme.danger, border: theme.dangerSoft },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={palette.fg} />
      ) : null}
      <Text style={[styles.buttonLabel, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 22,
  color,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  color?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.iconButton, (pressed || disabled) && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={size} color={color ?? theme.text} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        shadow(theme.shadow),
        style,
      ]}>
      {children}
    </View>
  );
}

const STATUS_LABEL: Record<NoteStatus, string> = {
  pending: 'Đang chờ',
  transcribing: 'Đang chuyển giọng nói',
  summarizing: 'AI đang tóm tắt',
  done: 'Đã tóm tắt',
  error: 'Lỗi',
};

export function StatusBadge({ status }: { status: NoteStatus }) {
  const theme = useTheme();
  const colors = {
    pending: [theme.backgroundSelected, theme.textSecondary],
    transcribing: [theme.warningSoft, theme.warning],
    summarizing: [theme.accentSoft, theme.accent],
    done: [theme.successSoft, theme.success],
    error: [theme.dangerSoft, theme.danger],
  }[status];
  const busy = status === 'transcribing' || status === 'summarizing' || status === 'pending';
  return (
    <View style={[styles.badge, { backgroundColor: colors[0] }]}>
      {busy && <ActivityIndicator size="small" color={colors[1]} style={{ transform: [{ scale: 0.7 }] }} />}
      <Text style={[styles.badgeLabel, { color: colors[1] }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: theme.backgroundElement }]}>
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? theme.text : theme.textSecondary },
              ]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  onRemove,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Shows a small × that calls this. */
  onRemove?: () => void;
}) {
  const theme = useTheme();
  const fg = selected ? theme.onAccent : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
        },
        pressed && { opacity: 0.7 },
      ]}>
      {icon && <Ionicons name={icon} size={14} color={fg} />}
      <Text style={[styles.chipLabel, { color: fg }]}>{label}</Text>
      {onRemove && (
        <Pressable accessibilityLabel={`Bỏ ${label}`} hitSlop={8} onPress={onRemove}>
          <Ionicons name="close" size={14} color={theme.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + 4,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconButton: {
    padding: Spacing.one,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm + 1,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
