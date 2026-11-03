import { apiConfig, isConfigured } from './config';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'input_audio'; input_audio: { data: string; format: string } };

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
};

/** Errors worth retrying on another model (timeouts, rate limits, server errors). */
export class AiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 180_000;

/** One call to the gateway's OpenAI-compatible /chat/completions endpoint. */
export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  opts: { json?: boolean; maxTokens?: number } = {},
): Promise<string> {
  if (!isConfigured) {
    throw new AiError(
      'Dự án chưa cấu hình AI. Điền EXPO_PUBLIC_AI_BASE_URL và EXPO_PUBLIC_AI_API_KEY vào file .env.local.',
      false,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 8000,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new AiError(aborted ? 'AI phản hồi quá lâu, hãy thử lại.' : 'Không kết nối được tới máy chủ AI. Kiểm tra mạng.', true);
  } finally {
    clearTimeout(timer);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body (e.g. an HTML error page).
  }

  if (!res.ok) {
    const detail: string = body?.error?.message ?? '';
    if (res.status === 401 || res.status === 403) throw new AiError('API key AI không hợp lệ hoặc đã bị khóa.', false);
    if (res.status === 402) throw new AiError('Tài khoản AI đã hết số dư.', false);
    if (res.status === 413) throw new AiError('Dữ liệu gửi lên quá lớn.', false);
    if (res.status === 429) throw new AiError('Máy chủ AI đang quá tải. Thử lại sau ít phút.', true);
    throw new AiError(
      `Máy chủ AI đang lỗi (${res.status}, model ${model}). Hãy thử lại sau. ${detail}`.trim(),
      res.status >= 500 || res.status === 404,
    );
  }

  const choice = body?.choices?.[0];
  const content: string = typeof choice?.message?.content === 'string' ? choice.message.content : '';
  if (choice?.finish_reason === 'length') {
    throw new AiError('Kết quả bị cắt ngang vì quá dài. Thử kiểu tóm tắt "Ngắn gọn".', false);
  }
  if (!content.trim()) throw new AiError(`Model ${model} không trả về nội dung.`, true);
  return content;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `run` against each model in order. A retryable failure (overload, timeout,
 * 5xx) is retried once on the same model, then the next model takes over. A
 * non-retryable failure such as a bad key stops immediately.
 */
export async function withModelFallback<T>(models: string[], run: (model: string) => Promise<T>): Promise<T> {
  let lastError: unknown = new AiError('Chưa cấu hình model AI.', false);
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await run(model);
      } catch (error) {
        lastError = error;
        if (error instanceof AiError && !error.retryable) throw error;
        if (attempt === 0) await sleep(1500);
      }
    }
  }
  throw lastError;
}

/** Parses a JSON object reply, tolerating a ```json fence around it. */
export function parseJsonReply<T>(text: string): T {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed) as T;
}
