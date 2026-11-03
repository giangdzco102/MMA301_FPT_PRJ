import type { Note } from './types';

export type Task = {
  noteId: string;
  noteTitle: string;
  /** Line index inside the note's summary – used to toggle it. */
  line: number;
  text: string;
  done: boolean;
  createdAt: number;
};

const CHECKBOX = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;

/** Every "- [ ]" checkbox found in the summaries of notes that are not in the trash. */
export function collectTasks(notes: Note[]): Task[] {
  const tasks: Task[] = [];
  for (const note of notes) {
    if (note.deletedAt || !note.summary) continue;
    note.summary.split('\n').forEach((raw, line) => {
      const m = CHECKBOX.exec(raw);
      if (!m) return;
      tasks.push({
        noteId: note.id,
        noteTitle: note.title,
        line,
        text: m[2].replace(/\*\*(.+?)\*\*/g, '$1').trim(),
        done: m[1].toLowerCase() === 'x',
        createdAt: note.createdAt,
      });
    });
  }
  return tasks;
}
