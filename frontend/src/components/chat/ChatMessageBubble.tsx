import { OUTCOME_TEXT } from '../../constants/chat';
import type { ChatMessage } from '../../types/chat';
import { SourceChips } from './SourceChips';

// Text only: React escapes it, so even a manipulated model answer cannot inject HTML.
// whitespace-pre-line keeps the line breaks and "- " lists of the answer.
export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'USER') {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-line break-words rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-white">
          {message.content}
        </p>
      </li>
    );
  }

  const declined = message.outcome !== null && message.outcome !== 'ANSWERED';
  const text = declined ? OUTCOME_TEXT[message.outcome as keyof typeof OUTCOME_TEXT] : message.content;
  return (
    <li className="flex justify-start">
      <div className="min-w-0 max-w-[85%]">
        <p className={`whitespace-pre-line break-words rounded-3xl rounded-bl-lg bg-bg px-4 py-2.5 ${declined ? 'text-ink-soft' : ''}`}>
          {text}
        </p>
        <SourceChips sources={message.sources} />
      </div>
    </li>
  );
}

// While the backend works (up to ~30 s)
export function PendingBubble({ slow }: { slow: boolean }) {
  return (
    <li className="flex justify-start" role="status">
      <p className="flex items-center gap-2 rounded-3xl rounded-bl-lg bg-bg px-4 py-2.5 text-ink-soft">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-1.5 animate-pulse rounded-full bg-muted" />
          <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
        </span>
        {slow ? 'Câu này cần nghĩ lâu hơn chút…' : 'Đang trả lời…'}
      </p>
    </li>
  );
}
