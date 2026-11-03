import { chatCompletion, withModelFallback } from './ai-client';
import { prepareAudio } from './audio-decode';
import { apiConfig } from './config';
import type { SummaryLanguage } from './types';
import { encodeWavBase64, splitAudio } from './wav';

/**
 * The gateway's audio input only accepts WAV and MP3 (m4a returns a 500 and
 * locks the channel for a while), while phones usually record m4a. So audio is
 * decoded on the device to 16 kHz mono and sent as WAV in 2-minute chunks
 * (~5 MB each once base64-encoded). Small MP3s may go up unchanged.
 */
const SAMPLE_RATE = 16_000;
const CHUNK_SECONDS = 120;
const MAX_MINUTES = 90;

const NO_SPEECH = '[NO_SPEECH]';

async function transcribePart(
  data: string,
  format: 'wav' | 'mp3',
  language: SummaryLanguage,
  part?: { index: number; total: number },
) {
  const languageHint =
    language === 'vi' ? ' The speech is in Vietnamese.' : language === 'en' ? ' The speech is in English.' : '';
  const position =
    part && part.total > 1
      ? ` This is part ${part.index + 1} of ${part.total} of a longer recording, so it may start or end mid-sentence.`
      : '';
  const reply = await withModelFallback(apiConfig.transcribeModels, (model) =>
    chatCompletion(
      model,
      [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Transcribe this audio verbatim in the language that is spoken.${languageHint}${position} Add punctuation and start a new paragraph when the topic or speaker changes. Output only the transcript, with no introduction or comments. If there is no intelligible speech, output exactly ${NO_SPEECH}.`,
            },
            { type: 'input_audio', input_audio: { data, format } },
          ],
        },
      ],
      { maxTokens: 8000 },
    ),
  );
  return reply.replace(NO_SPEECH, '').trim();
}

export async function transcribeAudio(
  uri: string,
  language: SummaryLanguage,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const prepared = await prepareAudio(uri, SAMPLE_RATE);
  let transcript: string;

  if (prepared.kind === 'raw') {
    onProgress?.(0, 1);
    transcript = await transcribePart(prepared.base64, prepared.format, language);
  } else {
    const { audio } = prepared;
    const minutes = audio.samples.length / audio.sampleRate / 60;
    if (minutes > MAX_MINUTES) {
      throw new Error(`Đoạn ghi âm dài ${Math.round(minutes)} phút, vượt giới hạn ${MAX_MINUTES} phút.`);
    }
    const chunks = splitAudio(audio, CHUNK_SECONDS);
    const parts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(i, chunks.length);
      const text = await transcribePart(encodeWavBase64(chunks[i], audio.sampleRate), 'wav', language, {
        index: i,
        total: chunks.length,
      });
      if (text) parts.push(text);
    }
    onProgress?.(chunks.length, chunks.length);
    transcript = parts.join('\n\n');
  }

  if (!transcript) throw new Error('Không nhận diện được lời nói trong đoạn ghi âm.');
  return transcript;
}
