import { OUTCOME_TEXT } from '../../constants/chat';
import type { ChatCalcItemRequest, ChatMessage } from '../../types/chat';
import { BotAvatar } from './BotAvatar';
import { CalculationCard } from './CalculationCard';
import { SourceChips } from './SourceChips';

// Text only: React escapes it, so even a manipulated model answer cannot inject HTML.
// whitespace-pre-line keeps the line breaks and "- " lists of the answer.
interface ChatMessageBubbleProps {
  message: ChatMessage;
  onUpdateCalculation?: (messageId: number, items: ChatCalcItemRequest[]) => Promise<void>;
}

const BOT_BUBBLE = 'rounded-[22px] rounded-bl-md bg-bg px-4 py-3';

export function ChatMessageBubble({ message, onUpdateCalculation }: ChatMessageBubbleProps) {
  if (message.role === 'USER') {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] rounded-[22px] rounded-br-md bg-accent px-4 py-3 whitespace-pre-line text-on-accent [overflow-wrap:anywhere]">
          {message.content}
        </p>
      </li>
    );
  }

  const declined = message.outcome !== null && message.outcome !== 'ANSWERED';
  const text = declined ? OUTCOME_TEXT[message.outcome as keyof typeof OUTCOME_TEXT] : message.content;
  return (
    <li className="flex items-start gap-2.5">
      <BotAvatar />
      {/* 86% of the row, but never more than what is left next to the avatar (32px + 10px gap) */}
      <div className="min-w-0 max-w-[min(86%,calc(100%-2.625rem))]">
        <p className={`${BOT_BUBBLE} whitespace-pre-line [overflow-wrap:anywhere] ${declined ? 'text-muted' : ''}`}>{text}</p>
        {message.calculation && onUpdateCalculation && (
          <CalculationCard calculation={message.calculation}
            onSave={(items) => onUpdateCalculation(message.id, items)} />
        )}
        <SourceChips sources={message.sources} />
      </div>
    </li>
  );
}

// While the backend works (up to ~30 s)
export function PendingBubble({ slow }: { slow: boolean }) {
  return (
    <li className="flex items-start gap-2.5" role="status">
      <BotAvatar />
      <p className={`${BOT_BUBBLE} flex items-center gap-2 text-muted`}>
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
