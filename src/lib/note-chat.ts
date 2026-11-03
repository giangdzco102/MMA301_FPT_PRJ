import { chatCompletion, withModelFallback, type ChatMessage } from './ai-client';
import { apiConfig } from './config';
import { getNote, updateNote } from './notes-store';
import { loadSettings } from './settings';
import type { AiModelChoice, ChatTurn, Note } from './types';

export const CHAT_SUGGESTIONS = [
  'Những ý quan trọng nhất là gì?',
  'Ai cần làm việc gì, hạn khi nào?',
  'Viết email tóm tắt gửi cả nhóm',
  'Tạo 5 câu hỏi ôn tập',
];

const SYSTEM_PROMPT = `You are an assistant inside a voice-notes app. Answer the user's questions using only the note below (its transcript and summary). If the answer is not in the note, say so briefly instead of guessing.
Reply in the language of the question. Keep answers focused; use short paragraphs, "-" bullets and **bold** where it helps. No tables or code blocks.`;

/** Asks DeepSeek/Grok a question about one note, keeping the earlier conversation as context. */
export async function askAboutNote(note: Note, history: ChatTurn[], question: string): Promise<string> {
  const settings = await loadSettings();
  const order: AiModelChoice[] = settings.aiModel === 'grok' ? ['grok', 'deepseek'] : ['deepseek', 'grok'];
  const context = [
    `Title: ${note.title}`,
    note.summary ? `<summary>\n${note.summary}\n</summary>` : '',
    note.transcript ? `<transcript>\n${note.transcript}\n</transcript>` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n<note>\n${context}\n</note>` },
    // The last 10 turns are enough context and keep requests small.
    ...history.slice(-10).map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: question },
  ];

  const reply = await withModelFallback(
    order.map((c) => apiConfig.summaryModels[c]),
    (model) => chatCompletion(model, messages, { maxTokens: 4000 }),
  );
  return reply.trim();
}

/** Appends one message to the note's saved conversation. */
export async function appendChatTurn(noteId: string, role: ChatTurn['role'], content: string) {
  const note = getNote(noteId);
  if (!note) return;
  await updateNote(noteId, { chat: [...(note.chat ?? []), { role, content, at: Date.now() }] });
}
