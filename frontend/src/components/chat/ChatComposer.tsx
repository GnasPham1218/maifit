import { SendHorizontal } from 'lucide-react';
import type { KeyboardEvent, RefObject } from 'react';
import { MAX_QUESTION_CHARS } from '../../constants/chat';
import { canSendQuestion } from '../../utils/chat';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const WARN_FROM = MAX_QUESTION_CHARS - 50;

export function ChatComposer({ value, onChange, onSend, sending, textareaRef }: ChatComposerProps) {
  const length = value.trim().length;
  const canSend = !sending && canSendQuestion(value);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter is a new line. isComposing: Vietnamese input methods (Telex, VNI) use
    // Enter to confirm a word; that Enter must not send the question.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <form
      className="flex items-end gap-2 rounded-3xl border border-line p-2 focus-within:border-sky-strong"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSend();
      }}
    >
      <label htmlFor="chat-question" className="sr-only">Câu hỏi</label>
      <textarea
        id="chat-question"
        ref={textareaRef}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={sending}
        placeholder="Hỏi về dinh dưỡng hoặc tập luyện…"
        className="max-h-40 min-h-12 min-w-0 flex-1 resize-y bg-transparent px-2 py-1.5 outline-none disabled:opacity-60"
      />
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`text-xs tabular-nums ${length > MAX_QUESTION_CHARS ? 'font-semibold text-danger'
          : length > WARN_FROM ? 'text-peach-strong' : 'text-muted'}`}>
          {length}/{MAX_QUESTION_CHARS}
        </span>
        <button
          type="submit"
          disabled={!canSend}
          className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-ink text-white enabled:hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Gửi câu hỏi"
          title="Gửi (Enter)"
        >
          <SendHorizontal aria-hidden="true" className="size-4" />
        </button>
      </div>
    </form>
  );
}
