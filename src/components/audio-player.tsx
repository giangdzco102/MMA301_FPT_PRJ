import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useImperativeHandle, useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';

export type AudioPlayerHandle = {
  /** Jumps to `ms` and starts playing (used by recording bookmarks). */
  playFrom: (ms: number) => void;
};

const RATES = [1, 1.25, 1.5, 2, 0.75];

export function AudioPlayer({
  uri,
  fallbackDurationMs,
  bookmarks,
  ref,
}: {
  uri: string;
  fallbackDurationMs?: number;
  bookmarks?: number[];
  ref?: Ref<AudioPlayerHandle>;
}) {
  const theme = useTheme();
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [barWidth, setBarWidth] = useState(0);
  const [rate, setRate] = useState(1);

  const duration = status.duration > 0 ? status.duration : (fallbackDurationMs ?? 0) / 1000;
  const progress = duration > 0 ? Math.min(status.currentTime / duration, 1) : 0;

  useImperativeHandle(ref, () => ({
    playFrom: (ms: number) => {
      void player.seekTo(ms / 1000);
      player.play();
    },
  }));

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (duration > 0 && status.currentTime >= duration - 0.1)) {
      await player.seekTo(0);
    }
    player.play();
  };

  const seekBy = (delta: number) => {
    const target = Math.max(0, Math.min(duration, status.currentTime + delta));
    void player.seekTo(target);
  };

  const nextRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    player.setPlaybackRate(next);
    setRate(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Tạm dừng' : 'Phát'}
          onPress={toggle}
          style={({ pressed }) => [styles.play, { backgroundColor: theme.accent }, pressed && { opacity: 0.8 }]}>
          <Ionicons name={status.playing ? 'pause' : 'play'} size={24} color={theme.onAccent} style={!status.playing && { marginLeft: 3 }} />
        </Pressable>

        <View style={styles.middle}>
          <Pressable
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            onPress={(e) => {
              if (barWidth > 0 && duration > 0) void player.seekTo((e.nativeEvent.locationX / barWidth) * duration);
            }}
            style={styles.barHit}>
            <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
            </View>
            {duration > 0 &&
              bookmarks?.map((b) => (
                <View
                  key={b}
                  pointerEvents="none"
                  style={[styles.mark, { left: `${Math.min(b / 1000 / duration, 1) * 100}%`, backgroundColor: '#F5A524' }]}
                />
              ))}
          </Pressable>
          <View style={styles.times}>
            <Text style={[styles.time, { color: theme.textSecondary }]}>{formatDuration(status.currentTime * 1000)}</Text>
            <Text style={[styles.time, { color: theme.textSecondary }]}>{formatDuration(duration * 1000)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <IconButton icon="play-back" label="Lùi 10 giây" onPress={() => seekBy(-10)} color={theme.text} />
        <IconButton icon="play-forward" label="Tới 10 giây" onPress={() => seekBy(10)} color={theme.text} />
        <View style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi tốc độ phát"
          onPress={nextRate}
          style={[styles.rate, { backgroundColor: rate === 1 ? theme.backgroundSelected : theme.accentSoft }]}>
          <Ionicons name="speedometer-outline" size={14} color={rate === 1 ? theme.text : theme.accent} />
          <Text style={[styles.rateText, { color: rate === 1 ? theme.text : theme.accent }]}>{rate}x</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderRadius: Radius.lg + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  play: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  barHit: {
    paddingVertical: Spacing.two,
    justifyContent: 'center',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
  },
  mark: {
    position: 'absolute',
    top: Spacing.two - 3,
    width: 4,
    height: 12,
    marginLeft: -2,
    borderRadius: 2,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  rate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 2,
    height: 30,
    borderRadius: Radius.pill,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
