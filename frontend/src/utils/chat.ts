import { MAX_QUESTION_CHARS } from '../constants/chat';

// Source links come from our own metadata; this is a second line in case one is ever malformed:
// only http(s) becomes a link (never javascript:, data:, ...)
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

// Same rule as the backend: strip, then 1..500 characters (both count UTF-16 units)
export function canSendQuestion(text: string): boolean {
  const length = text.trim().length;
  return length > 0 && length <= MAX_QUESTION_CHARS;
}
