import { getNote, updateNote } from './notes-store';
import { loadSettings } from './settings';
import { summarizeTranscript } from './summarize';
import { transcribeAudio } from './transcribe';
import type { SummaryStyle } from './types';

const running = new Set<string>();

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Pipeline: audio → transcript (speech-to-text) → summary (DeepSeek / Grok).
 * Each step's result is saved as soon as it arrives, so a failed summary can be
 * retried without transcribing again.
 */
export async function processNote(
  id: string,
  opts: { resummarize?: boolean; style?: SummaryStyle } = {},
) {
  if (running.has(id)) return;
  running.add(id);
  try {
    const settings = await loadSettings();
    let note = getNote(id);
    if (!note) return;

    if (!note.transcript) {
      if (!note.audioUri) throw new Error('Ghi chú này chưa có nội dung để tóm tắt.');
      await updateNote(id, { status: 'transcribing', error: undefined, progress: undefined });
      const transcript = await transcribeAudio(note.audioUri, settings.language, (done, total) => {
        if (total > 1) void updateNote(id, { progress: `${Math.min(done + 1, total)}/${total}` });
      });
      await updateNote(id, { transcript, progress: undefined });
      note = getNote(id)!;
    }

    if (!note.summary || opts.resummarize) {
      await updateNote(id, { status: 'summarizing', error: undefined });
      const style = opts.style ?? settings.summaryStyle;
      const result = await summarizeTranscript(note.transcript!, {
        style,
        language: settings.language,
        aiModel: settings.aiModel,
      });
      await updateNote(id, {
        summary: result.summary,
        summaryStyle: style,
        summaryEdited: false,
        // Keep a title the user typed; replace only the auto-generated placeholder.
        title: note.titleEdited ? note.title : result.title || note.title,
      });
    }

    await updateNote(id, { status: 'done', error: undefined });
  } catch (error) {
    await updateNote(id, { status: 'error', error: message(error), progress: undefined });
  } finally {
    running.delete(id);
  }
}
