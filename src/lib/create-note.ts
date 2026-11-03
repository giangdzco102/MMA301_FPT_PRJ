import { persistAudio } from './audio-files';
import { formatDate } from './format';
import { addNote, newId } from './notes-store';
import { processNote } from './process-note';

/** Saves the audio locally, creates the note and starts transcription + summary in the background. */
export async function createNoteFromAudio(input: {
  uri: string;
  fileName: string;
  mimeType: string;
  source: 'record' | 'upload';
  durationMs?: number;
  folderId?: string;
  bookmarks?: number[];
}) {
  const id = newId();
  const audioUri = await persistAudio(input.uri, id, input.fileName);
  const now = Date.now();
  const storedName = audioUri.split('/').pop() || input.fileName;
  await addNote({
    id,
    title:
      input.source === 'record'
        ? `Ghi âm ${formatDate(now)}`
        : input.fileName.replace(/\.[^.]+$/, '') || `Tải lên ${formatDate(now)}`,
    createdAt: now,
    updatedAt: now,
    source: input.source,
    audioUri,
    // Speech-to-text APIs detect the format from the extension, so keep one.
    fileName: /\.[a-z0-9]+$/i.test(storedName) ? storedName : input.fileName,
    mimeType: input.mimeType,
    durationMs: input.durationMs,
    folderId: input.folderId,
    bookmarks: input.bookmarks?.length ? input.bookmarks : undefined,
    status: 'pending',
  });
  void processNote(id);
  return id;
}

/** Creates a note from typed/pasted text. With `summarize`, the AI summarises it right away. */
export async function createTextNote(input: {
  title: string;
  text: string;
  tags: string[];
  summarize: boolean;
  folderId?: string;
}) {
  const id = newId();
  const now = Date.now();
  const title = input.title.trim();
  await addNote({
    id,
    title: title || `Ghi chú ${formatDate(now)}`,
    titleEdited: Boolean(title),
    createdAt: now,
    updatedAt: now,
    source: 'text',
    transcript: input.text.trim(),
    tags: input.tags,
    folderId: input.folderId,
    status: input.summarize ? 'pending' : 'done',
  });
  if (input.summarize) void processNote(id);
  return id;
}
