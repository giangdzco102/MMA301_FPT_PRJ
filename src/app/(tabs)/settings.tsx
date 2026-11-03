import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { SummaryStyleOptions } from "@/components/sheet";
import { Button, Card, SegmentedControl } from "@/components/ui";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { apiConfig, isConfigured } from "@/lib/config";
import { formatDuration } from "@/lib/format";
import { useNotes } from "@/lib/notes-store";
import { saveSettings, useSettings } from "@/lib/settings";
import { AI_MODEL_LABELS } from "@/lib/summarize";
import type { AiModelChoice, SummaryLanguage } from "@/lib/types";

export default function SettingsScreen() {
  const theme = useTheme();
  const settings = useSettings();
  const { notes } = useNotes();

  const stats = useMemo(() => {
    const active = notes.filter((n) => !n.deletedAt);
    return {
      total: active.length,
      favorites: active.filter((n) => n.favorite).length,
      duration: active.reduce((s, n) => s + (n.durationMs ?? 0), 0),
      trash: notes.length - active.length,
    };
  }, [notes]);

  const fallback: AiModelChoice =
    settings.aiModel === "grok" ? "deepseek" : "grok";
  const services = [
    { label: "Chuyển giọng nói", model: apiConfig.transcribeModels.join(", ") },
    { label: "Tóm tắt", model: apiConfig.summaryModels[settings.aiModel] },
    { label: "Dự phòng", model: apiConfig.summaryModels[fallback] },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader large title="Cài đặt" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={[styles.heading, { color: theme.text }]}>
            Model AI tóm tắt
          </Text>
          <SegmentedControl<AiModelChoice>
            value={settings.aiModel}
            onChange={(v) => saveSettings({ ...settings, aiModel: v })}
            options={(Object.keys(AI_MODEL_LABELS) as AiModelChoice[]).map(
              (k) => ({
                value: k,
                label: AI_MODEL_LABELS[k],
              }),
            )}
          />
          <Text style={[styles.help, { color: theme.textSecondary }]}>
            Nếu model này lỗi, app tự chuyển sang {AI_MODEL_LABELS[fallback]}.
          </Text>
          <Text style={[styles.heading, { color: theme.text }]}>
            Kiểu tóm tắt mặc định
          </Text>
          <SummaryStyleOptions
            value={settings.summaryStyle}
            onSelect={(v) => saveSettings({ ...settings, summaryStyle: v })}
          />
          <Text style={[styles.heading, { color: theme.text }]}>Ngôn ngữ</Text>
          <SegmentedControl<SummaryLanguage>
            value={settings.language}
            onChange={(v) => saveSettings({ ...settings, language: v })}
            options={[
              { value: "auto", label: "Tự nhận" },
              { value: "vi", label: "Tiếng Việt" },
              { value: "en", label: "English" },
            ]}
          />
          <Text style={[styles.help, { color: theme.textSecondary }]}>
            Áp dụng cho ghi chú mới. Khi bấm “Tóm tắt lại” trong một ghi chú,
            bạn chọn được kiểu khác.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.heading, { color: theme.text }]}>
            Dữ liệu trên máy
          </Text>
          <View style={styles.stats}>
            <Stat label="Ghi chú" value={String(stats.total)} />
            <Stat label="Yêu thích" value={String(stats.favorites)} />
            <Stat
              label="Tổng thời lượng"
              value={formatDuration(stats.duration)}
            />
          </View>
          <Button
            label={`Thùng rác (${stats.trash})`}
            icon="trash-outline"
            variant="secondary"
            onPress={() => router.push("/trash")}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.serviceRow}>
            <Text style={[styles.heading, styles.flex, { color: theme.text }]}>
              Dịch vụ AI
            </Text>
            <Ionicons
              name={isConfigured ? "checkmark-circle" : "alert-circle"}
              size={18}
              color={isConfigured ? theme.success : theme.warning}
            />
            <Text
              style={[
                styles.help,
                { color: isConfigured ? theme.success : theme.warning },
              ]}
            >
              {isConfigured ? "Đã cấu hình" : "Thiếu API key"}
            </Text>
          </View>
          {services.map((s) => (
            <View key={s.label} style={styles.serviceRow}>
              <Text
                style={[styles.serviceLabel, { color: theme.textSecondary }]}
              >
                {s.label}
              </Text>
              <Text style={[styles.model, { color: theme.text }]}>
                {s.model}
              </Text>
            </View>
          ))}
          <Text style={[styles.help, { color: theme.textSecondary }]}>
            Địa chỉ máy chủ, API key và tên model được cấu hình trong file
            .env.local của dự án.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.help, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: 120,
    gap: Spacing.three,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  card: {
    gap: Spacing.two + 4,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
  },
  help: {
    fontSize: 13,
    lineHeight: 18,
  },
  stats: {
    flexDirection: "row",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  serviceLabel: {
    flex: 1,
    fontSize: 14,
  },
  model: {
    fontSize: 14,
    fontWeight: "600",
  },
  flex: {
    flex: 1,
  },
});
