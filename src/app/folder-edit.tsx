import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Button, Card, type IconName } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm, notify } from '@/lib/confirm';
import { FOLDER_COLORS, FOLDER_ICONS, createFolder, deleteFolder, getFolder, updateFolder } from '@/lib/folders-store';

/** Create a folder, or edit/delete one when `id` is given. */
export default function FolderEditScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = getFolder(id);
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? FOLDER_COLORS[0]);
  const [icon, setIcon] = useState<string>(existing?.icon ?? FOLDER_ICONS[0]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      notify('Thiếu tên', 'Hãy đặt tên cho thư mục.');
      return;
    }
    if (existing) await updateFolder(existing.id, { name: trimmed, color, icon });
    else await createFolder({ name: trimmed, color, icon });
    if (router.canGoBack()) router.back();
    else router.replace('/folders');
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm(
      `Xóa thư mục "${existing.name}"?`,
      'Các ghi chú bên trong vẫn được giữ lại và chuyển sang "Chưa phân loại".',
      'Xóa thư mục',
    );
    if (!ok) return;
    await deleteFolder(existing.id);
    router.dismissTo('/folders');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader back title={existing ? 'Sửa thư mục' : 'Thư mục mới'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.preview, { backgroundColor: `${color}1A` }]}>
          <View style={[styles.previewIcon, { backgroundColor: color }]}>
            <Ionicons name={icon as IconName} size={30} color="#fff" />
          </View>
          <Text style={[styles.previewName, { color: theme.text }]} numberOfLines={1}>
            {name.trim() || 'Tên thư mục'}
          </Text>
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ví dụ: Môn MMA301, Dự án nhóm, Họp công ty…"
          placeholderTextColor={theme.textSecondary}
          autoFocus={!existing}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={save}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        />

        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.text }]}>Màu</Text>
          <View style={styles.wrap}>
            {FOLDER_COLORS.map((c) => (
              <Pressable
                key={c}
                accessibilityLabel={`Màu ${c}`}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c }, color === c && { borderColor: theme.text }]}>
                {color === c && <Ionicons name="checkmark" size={18} color="#fff" />}
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Biểu tượng</Text>
          <View style={styles.wrap}>
            {FOLDER_ICONS.map((i) => (
              <Pressable
                key={i}
                accessibilityLabel={i}
                onPress={() => setIcon(i)}
                style={[
                  styles.iconChoice,
                  { backgroundColor: icon === i ? color : theme.backgroundSelected },
                ]}>
                <Ionicons name={i as IconName} size={20} color={icon === i ? '#fff' : theme.text} />
              </Pressable>
            ))}
          </View>
        </Card>

        <Button label={existing ? 'Lưu thay đổi' : 'Tạo thư mục'} icon="checkmark" onPress={save} />
        {existing && <Button label="Xóa thư mục" icon="trash-outline" variant="danger" onPress={remove} />}
      </ScrollView>
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
  preview: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    borderRadius: Radius.xl,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 18,
    fontWeight: '800',
    maxWidth: '80%',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 6,
    fontSize: 16,
  },
  card: {
    gap: Spacing.two + 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
