import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      tintColor={colors.accent}
      backgroundColor={colors.backgroundElement}
      indicatorColor={colors.accentSoft}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Ghi chú</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'waveform', selected: 'waveform' }} md="graphic_eq" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="folders">
        <NativeTabs.Trigger.Label>Thư mục</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'folder', selected: 'folder.fill' }} md="folder" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tasks">
        <NativeTabs.Trigger.Label>Việc cần làm</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' }} md="task_alt" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Cài đặt</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
