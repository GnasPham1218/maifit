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
      className="flex items-end gap-2 rounded-[22px] border border-line bg-surface p-2 transition-colors focus-within:border-accent"
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
        placeholder="Hỏi MBotFit về dinh dưỡng hoặc tập luyện"
        className="max-h-40 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 outline-none disabled:opacity-60"
      />
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`text-xs tabular-nums ${length > MAX_QUESTION_CHARS ? 'font-semibold text-danger'
          : length > WARN_FROM ? 'font-semibold text-ink' : 'text-muted'}`}>
          {length}/{MAX_QUESTION_CHARS}
        </span>
        <button
          type="submit"
          disabled={!canSend}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-accent text-on-accent enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Gửi câu hỏi"
          title="Gửi (Enter)"
        >
          <SendHorizontal aria-hidden="true" className="size-4" />
        </button>
      </div>
    </form>
  );
}
