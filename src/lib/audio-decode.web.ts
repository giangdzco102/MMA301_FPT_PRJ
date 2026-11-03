import type { DecodedAudio } from './wav';

export type PreparedAudio =
  | { kind: 'pcm'; audio: DecodedAudio }
  | { kind: 'raw'; base64: string; format: 'mp3' };

/** Browser version: Web Audio decodes the blob, an OfflineAudioContext resamples to mono. */
export async function prepareAudio(uri: string, sampleRate: number): Promise<PreparedAudio> {
  const bytes = await (await fetch(uri)).arrayBuffer();
  let decoded: AudioBuffer;
  try {
    const ctx = new AudioContext();
    decoded = await ctx.decodeAudioData(bytes);
    void ctx.close();
  } catch {
    throw new Error('Không đọc được file âm thanh này. Hãy thử định dạng khác (m4a, mp3, wav).');
  }

  const length = Math.ceil(decoded.duration * sampleRate);
  const offline = new OfflineAudioContext(1, Math.max(length, 1), sampleRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return { kind: 'pcm', audio: { samples: rendered.getChannelData(0), sampleRate } };
}
