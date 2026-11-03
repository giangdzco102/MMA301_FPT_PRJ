import { File } from 'expo-file-system';
import { TurboModuleRegistry } from 'react-native';

import { parseWav, type DecodedAudio } from './wav';

/** Either PCM ready to be chunked, or a small file the gateway accepts as-is. */
export type PreparedAudio =
  | { kind: 'pcm'; audio: DecodedAudio }
  | { kind: 'raw'; base64: string; format: 'mp3' };

// Without the native decoder an MP3 can't be split, so it goes up in one request.
const MAX_RAW_MP3_BYTES = 8 * 1024 * 1024;

/**
 * react-native-audio-api is native code that Expo Go doesn't ship, and importing it
 * there crashes. Checking the registry first keeps the app usable in Expo Go;
 * only formats like m4a/aac need a development build.
 */
export const hasNativeDecoder = TurboModuleRegistry.get('AudioAPIModule') != null;

function extensionOf(uri: string) {
  return /\.([a-z0-9]+)(?:\?.*)?$/i.exec(uri)?.[1]?.toLowerCase() ?? '';
}

function toMono(channels: Float32Array[], sampleRate: number): DecodedAudio {
  if (channels.length === 1) return { samples: channels[0], sampleRate };
  const mono = new Float32Array(channels[0].length);
  for (const data of channels) {
    for (let i = 0; i < mono.length; i++) mono[i] += data[i] / channels.length;
  }
  return { samples: mono, sampleRate };
}

/** Linear resampling – plenty for speech recognition. */
function resample({ samples, sampleRate }: DecodedAudio, target: number): DecodedAudio {
  if (sampleRate === target) return { samples, sampleRate };
  const ratio = sampleRate / target;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const j = Math.floor(pos);
    const frac = pos - j;
    out[i] = samples[j] * (1 - frac) + (samples[j + 1] ?? samples[j]) * frac;
  }
  return { samples: out, sampleRate: target };
}

/**
 * Turns an audio file into something the gateway can transcribe (it only accepts
 * WAV and MP3 – never send it m4a): with the native decoder any format is decoded;
 * without it WAV is parsed in JS and small MP3s are passed through.
 */
export async function prepareAudio(uri: string, sampleRate: number): Promise<PreparedAudio> {
  if (hasNativeDecoder) {
    const api = await import('react-native-audio-api');
    let buffer: Awaited<ReturnType<typeof api.decodeAudioData>>;
    try {
      buffer = await api.decodeAudioData(uri, sampleRate);
    } catch {
      throw new Error('Không đọc được file âm thanh này. Hãy thử định dạng khác (m4a, mp3, wav).');
    }
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    return { kind: 'pcm', audio: resample(toMono(channels, buffer.sampleRate), sampleRate) };
  }

  const ext = extensionOf(uri);
  const file = new File(uri);
  if (ext === 'wav') {
    const wav = parseWav(await file.bytes());
    if (!wav) throw new Error('File WAV này không được hỗ trợ (chỉ nhận WAV PCM không nén).');
    return { kind: 'pcm', audio: resample(toMono(wav.channels, wav.sampleRate), sampleRate) };
  }
  if (ext === 'mp3') {
    if (file.size > MAX_RAW_MP3_BYTES) {
      throw new Error('File MP3 quá lớn để xử lý trong Expo Go (tối đa 8 MB). Hãy dùng bản build của app.');
    }
    return { kind: 'raw', base64: await file.base64(), format: 'mp3' };
  }
  throw new Error(
    `File .${ext || '?'} cần bản build của app (development build) để chuyển giọng nói. Trong Expo Go chỉ dùng được file WAV hoặc MP3.`,
  );
}
