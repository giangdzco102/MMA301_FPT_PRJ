import Ionicons from '@expo/vector-icons/Ionicons';
import {
  IOSOutputFormat,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  type RecordingOptions,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm, notify } from '@/lib/confirm';
import { createNoteFromAudio } from '@/lib/create-note';
import { formatDuration } from '@/lib/format';
import { getFolder } from '@/lib/folders-store';

const BAR_COUNT = 40;

/**
 * The AI gateway only accepts WAV/MP3 audio. iOS can record WAV directly, so iPhone
 * recordings transcribe even in Expo Go. Android can't record WAV, so it records
 * mono 32 kbps AAC (.m4a), which the native decoder converts before transcription.
 */
const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

const RECORDED_FILE = Platform.select({
  ios: { fileName: 'recording.wav', mimeType: 'audio/wav' },
  web: { fileName: 'recording.webm', mimeType: 'audio/webm' },
  default: { fileName: 'recording.m4a', mimeType: 'audio/m4a' },
});

export default function RecordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { folderId } = useLocalSearchParams<{ folderId?: string }>();
  const folder = getFolder(folderId);
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const state = useAudioRecorderState(recorder, 100);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'paused' | 'saving'>('idle');
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  const [lastTick, setLastTick] = useState(0);

  // Push one waveform bar per recorder status tick (derived state, updated during render).
  if (phase === 'recording' && state.durationMillis !== lastTick) {
    setLastTick(state.durationMillis);
    // Metering is in dBFS (-160…0); map the useful -60…0 range to 0…1.
    const db = state.metering ?? -60;
    const level = Math.max(0, Math.min(1, (db + 60) / 60));
    setLevels((prev) => [...prev.slice(1), level]);
  }

  // Release the microphone if the screen closes mid-recording.
  useEffect(() => {
    return () => {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    };
  }, []);

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      notify('Cần quyền micro', 'Hãy cho phép ứng dụng dùng micro trong phần Cài đặt của máy.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');
  };

  const pauseOrResume = () => {
    if (phase === 'recording') {
      recorder.pause();
      setPhase('paused');
    } else if (phase === 'paused') {
      recorder.record();
      setPhase('recording');
    }
  };

  const finish = async () => {
    setPhase('saving');
    try {
      const durationMs = state.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error('Không tìm thấy file ghi âm.');
      const id = await createNoteFromAudio({
        uri,
        ...RECORDED_FILE,
        source: 'record',
        durationMs,
        folderId: folder?.id,
        bookmarks,
      });
      router.replace({ pathname: '/note/[id]', params: { id } });
    } catch (e) {
      setPhase('paused');
      notify('Không lưu được ghi âm', e instanceof Error ? e.message : String(e));
    }
  };

  const addBookmark = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBookmarks((prev) => [...prev, state.durationMillis]);
  };

  const close = async () => {
    if (phase === 'recording' || phase === 'paused') {
      const ok = await confirm('Hủy ghi âm?', 'Đoạn ghi âm hiện tại sẽ bị bỏ.', 'Bỏ ghi âm');
      if (!ok) return;
      await recorder.stop().catch(() => {});
    }
    router.back();
  };

  const active = phase === 'recording' || phase === 'paused';
  const statusText = {
    idle: 'Sẵn sàng ghi âm',
    recording: 'Đang ghi âm…',
    paused: 'Đã tạm dừng',
    saving: 'Đang lưu…',
  }[phase];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.four }]}>
      <View style={styles.topBar}>
        <IconButton icon="close" label="Đóng" onPress={close} size={28} />
        {folder && (
          <View style={[styles.folder, { backgroundColor: `${folder.color}1F` }]}>
            <Ionicons name="folder" size={13} color={folder.color} />
            <Text style={[styles.folderText, { color: folder.color }]} numberOfLines={1}>
              {folder.name}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.center}>
        <Text style={[styles.status, { color: phase === 'recording' ? theme.danger : theme.textSecondary }]}>
          {phase === 'recording' && '● '}
          {statusText}
        </Text>
        <Text style={[styles.timer, { color: theme.text }]}>{formatDuration(state.durationMillis)}</Text>
        {bookmarks.length > 0 && (
          <Text style={styles.bookmarkCount}>
            🔖 {bookmarks.length} mốc · {bookmarks.map((b) => formatDuration(b)).join(', ')}
          </Text>
        )}

        <View style={styles.wave}>
          {levels.map((l, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: 6 + l * 90,
                  backgroundColor: phase === 'recording' ? theme.record : theme.backgroundSelected,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.side}>
          {active && (
            <IconButton
              icon={phase === 'recording' ? 'pause' : 'play'}
              label={phase === 'recording' ? 'Tạm dừng' : 'Tiếp tục'}
              onPress={pauseOrResume}
              size={30}
            />
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={active ? 'Dừng và lưu' : 'Bắt đầu ghi âm'}
          disabled={phase === 'saving'}
          onPress={active ? finish : start}
          style={({ pressed }) => [
            styles.recordOuter,
            { borderColor: theme.record },
            pressed && { opacity: 0.8 },
          ]}>
          <View
            style={[
              active ? styles.recordStop : styles.recordInner,
              { backgroundColor: theme.record },
            ]}
          />
        </Pressable>

        <View style={styles.side}>
          {active && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đánh dấu mốc quan trọng"
              onPress={addBookmark}
              style={({ pressed }) => [styles.mark, pressed && { opacity: 0.6 }]}>
              <Ionicons name="bookmark" size={26} color="#F5A524" />
              <Text style={[styles.markLabel, { color: theme.textSecondary }]}>Đánh dấu</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        {active
          ? 'Bấm nút đỏ để dừng và lưu. Bấm 🔖 để đánh dấu đoạn quan trọng.'
          : 'Bấm nút đỏ để bắt đầu.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  folder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 4,
    height: 28,
    borderRadius: 14,
    maxWidth: 220,
  },
  folderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bookmarkCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C97E00',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  mark: {
    alignItems: 'center',
    gap: 2,
  },
  markLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
  },
  timer: {
    fontSize: 64,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  wave: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  side: {
    width: 56,
    alignItems: 'center',
  },
  recordOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  recordStop: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  hint: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: Spacing.four,
  },
});
