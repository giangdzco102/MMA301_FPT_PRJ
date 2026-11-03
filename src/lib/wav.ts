export type DecodedAudio = { samples: Float32Array; sampleRate: number };

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 without relying on btoa / Buffer, which differ between Hermes and browsers. */
function toBase64(bytes: Uint8Array) {
  const out: string[] = [];
  let chunk = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    chunk +=
      BASE64_CHARS[(n >> 18) & 63] +
      BASE64_CHARS[(n >> 12) & 63] +
      (i + 1 < bytes.length ? BASE64_CHARS[(n >> 6) & 63] : '=') +
      (i + 2 < bytes.length ? BASE64_CHARS[n & 63] : '=');
    if (chunk.length >= 8192) {
      out.push(chunk);
      chunk = '';
    }
  }
  out.push(chunk);
  return out.join('');
}

/** Encodes mono float samples as a 16-bit PCM WAV file, returned as base64. */
export function encodeWavBase64(samples: Float32Array, sampleRate: number) {
  const dataSize = samples.length * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return toBase64(bytes);
}

/**
 * Reads a PCM WAV file (8/16/24/32-bit integer or 32-bit float) into per-channel
 * float samples. Returns null for compressed or otherwise unsupported WAVs.
 */
export function parseWav(bytes: Uint8Array): { channels: Float32Array[]; sampleRate: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.length < 12 || ascii(0) !== 'RIFF' || ascii(8) !== 'WAVE') return null;

  let format = 0;
  let channelCount = 0;
  let sampleRate = 0;
  let bits = 0;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = ascii(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      channelCount = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
      if (format === 0xfffe && size >= 26) format = view.getUint16(body + 24, true); // WAVE_FORMAT_EXTENSIBLE
    } else if (id === 'data') {
      const isFloat = format === 3 && bits === 32;
      if ((format !== 1 && !isFloat) || !channelCount || ![8, 16, 24, 32].includes(bits)) return null;
      const bytesPerSample = bits / 8;
      const end = Math.min(body + size, bytes.length);
      const frames = Math.floor((end - body) / (bytesPerSample * channelCount));
      const channels = Array.from({ length: channelCount }, () => new Float32Array(frames));
      for (let f = 0; f < frames; f++) {
        for (let c = 0; c < channelCount; c++) {
          const p = body + (f * channelCount + c) * bytesPerSample;
          let v: number;
          if (isFloat) v = view.getFloat32(p, true);
          else if (bits === 8) v = (bytes[p] - 128) / 128;
          else if (bits === 16) v = view.getInt16(p, true) / 32768;
          else if (bits === 24) v = ((bytes[p + 2] << 24) | (bytes[p + 1] << 16) | (bytes[p] << 8)) / 2147483648;
          else v = view.getInt32(p, true) / 2147483648;
          channels[c][f] = v;
        }
      }
      return { channels, sampleRate };
    }
    offset = body + size + (size % 2); // chunks are word-aligned
  }
  return null;
}

/** Splits audio into chunks of at most `seconds`, cutting at the quietest spot near each boundary. */
export function splitAudio({ samples, sampleRate }: DecodedAudio, seconds: number) {
  const maxLen = seconds * sampleRate;
  const searchLen = 3 * sampleRate; // look back up to 3 s for a pause
  const window = Math.floor(sampleRate / 20); // 50 ms energy window
  const chunks: Float32Array[] = [];
  let start = 0;
  while (samples.length - start > maxLen) {
    let cut = start + maxLen;
    let bestEnergy = Infinity;
    for (let pos = start + maxLen - searchLen; pos + window <= start + maxLen; pos += window) {
      let energy = 0;
      for (let i = pos; i < pos + window; i++) energy += samples[i] * samples[i];
      if (energy < bestEnergy) {
        bestEnergy = energy;
        cut = pos + Math.floor(window / 2);
      }
    }
    chunks.push(samples.subarray(start, cut));
    start = cut;
  }
  chunks.push(samples.subarray(start));
  return chunks;
}
