import { AiError, chatCompletion, parseJsonReply, withModelFallback } from './ai-client';
import { apiConfig } from './config';
import type { AiModelChoice, SummaryLanguage, SummaryStyle } from './types';

export const AI_MODEL_LABELS: Record<AiModelChoice, string> = {
  deepseek: 'DeepSeek',
  grok: 'Grok',
};

export const SUMMARY_STYLES: Record<
  SummaryStyle,
  { label: string; description: string; icon: string; instruction: string }
> = {
  concise: {
    label: 'Ngắn gọn',
    description: 'Ý chính trong vài dòng',
    icon: 'flash-outline',
    instruction: `Write a short but complete summary:
- One or two sentences that say what the recording is about and its main conclusion.
- Then 5-8 bullet points with the most important ideas, facts, numbers and names.`,
  },
  detailed: {
    label: 'Chi tiết',
    description: 'Đầy đủ từng chủ đề',
    icon: 'reader-outline',
    instruction: `Write a thorough, detailed summary that someone who did not hear the recording could rely on:
- Start with a "## Tổng quan" paragraph (3-5 sentences): context, purpose, main conclusions.
- Then one "##" section per topic, in the order they were discussed. Under each, use bullet points (with sub-bullets where useful) that keep every important point, argument, example, number, date, name and reason given — not just the headline.
- Add "## Kết luận" with the outcome, and "## Việc cần làm" with "- [ ] task — người phụ trách, hạn chót" if any actions were mentioned.
- Do not compress several distinct points into one vague bullet. Length should follow the content: a long transcript deserves a long summary.`,
  },
  meeting: {
    label: 'Biên bản họp',
    description: 'Quyết định & phân công',
    icon: 'people-outline',
    instruction: `Write complete meeting minutes with these "##" sections:
- Tổng quan: purpose of the meeting and who took part (if mentioned).
- Nội dung thảo luận: one bullet group per agenda item with the key arguments and information shared.
- Quyết định: every decision that was made.
- Việc cần làm: every action as "- [ ] task — người phụ trách — hạn chót" (write "chưa rõ" when unknown).
- Vấn đề còn mở: open questions or risks.
Omit a section only if nothing at all fits it.`,
  },
  study: {
    label: 'Ghi chép học tập',
    description: 'Khái niệm, ví dụ, ôn tập',
    icon: 'school-outline',
    instruction: `Turn this lecture or study material into detailed study notes:
- "## Tổng quan": what the lesson covers.
- "## Kiến thức chính": one "###"-free bullet group per concept, with **bold** key terms, definitions, explanations, formulas and the examples given.
- "## Ví dụ & ứng dụng" if examples were discussed.
- "## Câu hỏi ôn tập": 3-6 questions that test understanding of the material.
- "## Việc cần làm" with "- [ ]" items for any homework or deadlines mentioned.`,
  },
};

const LANGUAGE_INSTRUCTION: Record<SummaryLanguage, string> = {
  auto: 'Write in the same language as the transcript.',
  vi: 'Write in Vietnamese.',
  en: 'Write in English.',
};

const SYSTEM_PROMPT = `You summarise transcripts of voice recordings and pasted notes for a personal notes app used by Vietnamese students and professionals.
A transcript may come from automatic speech recognition, so it can contain misheard words, missing punctuation and filler words; infer the intended meaning, but never invent facts that are not in the source.
Reply with a JSON object only: {"title": string, "summary": string}.
- title: a short descriptive title, at most 8 words.
- summary: Markdown using only "##" headings, "-" bullets (indent two spaces for sub-bullets), "- [ ]" checkboxes, numbered lists and **bold** — no tables, no code blocks.`;

export type SummaryResult = { title: string; summary: string };

/** Summarises with the chosen model, falling back to the other one if it fails. */
export async function summarizeTranscript(
  transcript: string,
  options: { style: SummaryStyle; language: SummaryLanguage; aiModel: AiModelChoice },
): Promise<SummaryResult> {
  const order: AiModelChoice[] = options.aiModel === 'grok' ? ['grok', 'deepseek'] : ['deepseek', 'grok'];
  const words = transcript.trim().split(/\s+/).length;
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `<transcript words="${words}">\n${transcript}\n</transcript>\n\n${SUMMARY_STYLES[options.style].instruction}\n\n${LANGUAGE_INSTRUCTION[options.language]}`,
    },
  ];

  return withModelFallback(
    order.map((c) => apiConfig.summaryModels[c]),
    async (model) => {
      const reply = await chatCompletion(model, messages, { json: true, maxTokens: 16000 });
      let parsed: Partial<SummaryResult>;
      try {
        parsed = parseJsonReply<Partial<SummaryResult>>(reply);
      } catch {
        throw new AiError('AI trả về dữ liệu không đọc được. Hãy thử lại.', true);
      }
      if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
        throw new AiError('AI trả về bản tóm tắt trống.', true);
      }
      return { title: (parsed.title ?? '').trim(), summary: parsed.summary.trim() };
    },
  );
}
