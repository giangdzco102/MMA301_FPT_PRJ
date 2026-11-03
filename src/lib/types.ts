export type NoteStatus = 'pending' | 'transcribing' | 'summarizing' | 'done' | 'error';

export type NoteSource = 'record' | 'upload' | 'text';

export type Note = {
  id: string;
  title: string;
  /** True once the user renamed the note – AI won't overwrite the title then. */
  titleEdited?: boolean;
  createdAt: number;
  updatedAt: number;
  source: NoteSource;
  /** Local file URI of the audio (document directory on native). Absent for text notes. */
  audioUri?: string;
  fileName?: string;
  mimeType?: string;
  durationMs?: number;
  status: NoteStatus;
  /** e.g. "2/5" while a long recording is transcribed chunk by chunk. */
  progress?: string;
  error?: string;
  /** Speech-to-text output, or the text the user typed/pasted for a text note. */
  transcript?: string;
  /** Markdown summary – editable by the user. */
  summary?: string;
  /** True once the user edited the summary by hand. */
  summaryEdited?: boolean;
  /** Style the current summary was written in. */
  summaryStyle?: SummaryStyle;
  folderId?: string;
  /** Moments marked while recording, in ms from the start. */
  bookmarks?: number[];
  /** "Hỏi AI" conversation about this note. */
  chat?: ChatTurn[];
  favorite?: boolean;
  tags?: string[];
  /** Set when the note is in the trash. */
  deletedAt?: number;
};

export type ChatTurn = { role: 'user' | 'assistant'; content: string; at: number };

export type Folder = {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
};

export type AiModelChoice = 'deepseek' | 'grok';
export type SummaryStyle = 'concise' | 'detailed' | 'meeting' | 'study';
export type SummaryLanguage = 'auto' | 'vi' | 'en';

/** User preferences. API keys are not here – they come from the project's .env (config.ts). */
export type Settings = {
  /** Summary model tried first; the other one is the fallback. */
  aiModel: AiModelChoice;
  summaryStyle: SummaryStyle;
  language: SummaryLanguage;
};
