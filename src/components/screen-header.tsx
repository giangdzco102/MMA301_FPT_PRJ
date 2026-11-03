import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, WebTabBarInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Our own header instead of the native one. On iOS 26 the native header is
 * translucent and content slid under the Dynamic Island; this one always sits
 * below the safe-area inset (status bar / notch / Dynamic Island).
 */
export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
  large,
  leading,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  /** Big page title (tab screens). */
  large?: boolean;
  /** Shown before the title, e.g. a folder icon. */
  leading?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/' as Href));

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + Spacing.two + (large ? WebTabBarInset : 0), backgroundColor: theme.background },
      ]}>
      <View style={styles.inner}>
        <View style={styles.row}>
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={goBack}
              hitSlop={10}
              style={({ pressed }) => [
                styles.back,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                pressed && { opacity: 0.6 },
              ]}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </Pressable>
          )}
          {leading}
          <View style={styles.titles}>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[large ? styles.large : styles.title, { color: theme.text }]}>
              {title}
            </Text>
            {!!subtitle && (
              <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>
          {right && <View style={styles.right}>{right}</View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    minHeight: 44,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  large: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
