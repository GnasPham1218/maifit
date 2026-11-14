import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { chatApi } from '../apis/chatApi';
import { ApiError } from '../apis/client';
import { Alert } from '../components/Alert';
import { Card } from '../components/Card';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatMessageBubble, PendingBubble } from '../components/chat/ChatMessageBubble';
import { ConversationList } from '../components/chat/ConversationList';
import { CHAT_DISCLAIMER, SUGGESTED_QUESTIONS, chatLimitText } from '../constants/chat';
import { getErrorMessage } from '../constants/errorMessages';
import type { ChatCalcItemRequest, ChatConversation, ChatMessage, ChatQuota, ChatReply } from '../types/chat';

type View = number | 'new'; // an existing conversation, or a new one

// /chat and /chat/new -> 'new'; /chat/12 -> 12; anything else -> null (not found)
function parseView(param: string | undefined): View | null {
  if (param === undefined || param === 'new') return 'new';
  return /^[1-9]\d*$/.test(param) ? Number(param) : null;
}

interface Loaded {
  id: number;
  messages: ChatMessage[] | null; // null = not found (404)
}

interface Sending {
  view: View; // where the question was asked
  question: string;
}

const SLOW_AFTER_MS = 8000;

// The question and the reply as history items, so they show without reloading
function exchangeOf(question: string, reply: ChatReply): ChatMessage[] {
  const now = new Date().toISOString();
  return [
    // The question's id is not returned: a temporary negative one, replaced on the next load
    { id: -Date.now(), role: 'USER', content: question, outcome: null, sources: [], calculation: null, createdAt: now },
    // The reply's real id: needed to pick a preparation in its calculation right away
    { id: reply.messageId, role: 'ASSISTANT', content: reply.answer, outcome: reply.outcome, sources: reply.sources,
      calculation: reply.calculation, createdAt: now },
  ];
}

// /chat          desktop: list + new conversation; mobile: the list only
// /chat/new      a new conversation
// /chat/:id      an existing conversation (someone else's id answers 404)
export default function ChatPage() {
  const { conversationId: param } = useParams();
  const navigate = useNavigate();
  const view = parseView(param);
  const onListOnlyOnMobile = param === undefined;

  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<{ id: number; message: string } | null>(null);
  const location = useLocation();
  // "Hỏi MBotFit về món này" on a food page: the question is written, the user decides to send it
  const [draft, setDraft] = useState(() => {
    const prefill = (location.state as { draft?: unknown } | null)?.draft;
    return typeof prefill === 'string' ? prefill : '';
  });
  const [sending, setSending] = useState<Sending | null>(null);
  const [slow, setSlow] = useState(false);
  const [sendError, setSendError] = useState<{ view: View; message: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLLIElement>(null);
  const viewRef = useRef<View | null>(view); // the view when an answer arrives, maybe not the one it was asked in
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // List + quota, once
  useEffect(() => {
    let ignore = false;
    chatApi
      .conversations()
      .then((list) => {
        if (!ignore) setConversations(list);
      })
      .catch((err: unknown) => {
        if (!ignore) setListError(getErrorMessage(err));
      });
    chatApi
      .quota()
      .then((q) => {
        if (!ignore) setQuota(q);
      })
      .catch(() => {}); // the page works without it
    return () => {
      ignore = true;
    };
  }, []);

  // Messages of the open conversation
  useEffect(() => {
    if (typeof view !== 'number') return;
    let ignore = false;
    chatApi
      .messages(view)
      .then((messages) => {
        if (!ignore) setLoaded({ id: view, messages });
      })
      .catch((err: unknown) => {
        if (ignore) return;
        if (err instanceof ApiError && err.code === 'NOT_FOUND') setLoaded({ id: view, messages: null });
        else setLoadError({ id: view, message: getErrorMessage(err) });
      });
    return () => {
      ignore = true; // switched conversation: drop the late answer
    };
  }, [view]);

  // "Thinking longer" hint after a few seconds
  useEffect(() => {
    if (!sending) return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [sending]);

  // Derived instead of reset in effects: what this view shows right now
  const messages = useMemo<ChatMessage[] | null | undefined>(
    () => (view === 'new' ? [] : typeof view === 'number' && loaded?.id === view ? loaded.messages : undefined),
    [view, loaded],
  ); // undefined = loading, null = not found
  const pendingHere = sending !== null && sending.view === view;
  const errorHere = sendError?.view === view ? sendError.message : null;
  const loadErrorHere = typeof view === 'number' && loadError?.id === view ? loadError.message : null;

  // Keep the newest message in sight
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, pendingHere]);

  async function handleSend() {
    if (view === null || sending) return;
    const question = draft.trim();
    const askedIn = view;
    setSending({ view: askedIn, question });
    setSendError(null);
    setDraft('');
    try {
      const reply = await chatApi.ask({
        conversationId: askedIn === 'new' ? undefined : askedIn,
        question,
      });
      if (reply.remainingToday !== null) {
        setQuota((q) => (q ? { ...q, remainingToday: reply.remainingToday ?? q.remainingToday } : q));
      }
      // Show the exchange only if the user is still on that conversation
      if (viewRef.current === askedIn) {
        setLoaded((prev) => ({
          id: reply.conversationId,
          messages: [...(prev?.id === reply.conversationId ? prev.messages ?? [] : []), ...exchangeOf(question, reply)],
        }));
        if (askedIn === 'new') navigate(`/chat/${reply.conversationId}`, { replace: true });
      }
      chatApi.conversations().then(setConversations).catch(() => {}); // new title / order
    } catch (err) {
      // Nothing was saved: take the question back out of the thread and into the input
      const message = err instanceof ApiError && err.code === 'AI_DAILY_LIMIT'
        ? chatLimitText(quota?.limit ?? null)
        : getErrorMessage(err);
      if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT') {
        setQuota((q) => (q ? { ...q, remainingToday: 0 } : q));
      }
      setSendError({ view: askedIn, message });
      if (viewRef.current === askedIn) setDraft((current) => current || question);
    } finally {
      setSending(null);
    }
  }

  // The backend recalculates and saves the corrected list; errors are shown by the card
  async function handleUpdateCalculation(messageId: number, items: ChatCalcItemRequest[]) {
    const calculation = await chatApi.updateCalculation(messageId, items);
    setLoaded((prev) => prev && prev.messages
      ? { ...prev, messages: prev.messages.map((m) => (m.id === messageId ? { ...m, calculation } : m)) }
      : prev);
  }

  async function handleDelete(id: number) {
    try {
      await chatApi.remove(id);
      setConversations((list) => list?.filter((c) => c.id !== id) ?? null);
      if (view === id) navigate('/chat/new', { replace: true });
    } catch (err) {
      setListError(getErrorMessage(err));
    }
  }

  function pickSuggestion(question: string) {
    setDraft(question);
    textareaRef.current?.focus();
  }

  return (
    <div className="grid gap-5 md:grid-cols-[18rem_minmax(0,1fr)]">
      <Card className={`min-w-0 md:block ${onListOnlyOnMobile ? '' : 'hidden'}`}>
        {listError && <Alert type="error">{listError}</Alert>}
        <ConversationList conversations={conversations} onDelete={handleDelete} />
      </Card>

      <Card className={`h-[calc(100dvh-16rem)] min-h-[26rem] min-w-0 flex-col md:flex md:h-[calc(100dvh-12rem)] ${
        onListOnlyOnMobile ? 'hidden' : 'flex'}`}>
        <Link to="/chat" className="mb-3 inline-flex items-center gap-1 text-sm text-muted md:hidden">
          <ArrowLeft aria-hidden="true" className="size-4" /> Danh sách
        </Link>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {view === null || messages === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-ink-soft">Không tìm thấy cuộc trò chuyện.</p>
              <Link to="/chat/new" className="font-medium">Bắt đầu cuộc trò chuyện mới</Link>
            </div>
          ) : loadErrorHere ? (
            <Alert type="error">{loadErrorHere}</Alert>
          ) : messages === undefined ? (
            <p className="text-muted">Đang tải…</p>
          ) : messages.length === 0 && !pendingHere ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-lg font-semibold">Hỏi trợ lý MAIFit về dinh dưỡng và tập luyện</p>
              <ul className="grid w-full max-w-md gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <li key={q}>
                    <button type="button" onClick={() => pickSuggestion(q)}
                      className="w-full cursor-pointer rounded-2xl border border-line px-4 py-3 text-left hover:bg-bg">
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="grid gap-3" aria-live="polite">
              {messages.map((m) => (
                <ChatMessageBubble key={m.id} message={m} onUpdateCalculation={handleUpdateCalculation} />
              ))}
              {pendingHere && (
                <>
                  <ChatMessageBubble message={{ id: 0, role: 'USER', content: sending.question, outcome: null,
                    sources: [], calculation: null, createdAt: '' }} />
                  <PendingBubble slow={slow} />
                </>
              )}
              <li ref={bottomRef} aria-hidden="true" />
            </ol>
          )}
        </div>

        {view !== null && messages !== null && (
          <div className="mt-4">
            {errorHere && <Alert type="error">{errorHere}</Alert>}
            <ChatComposer value={draft} onChange={setDraft} onSend={() => void handleSend()}
              sending={sending !== null} textareaRef={textareaRef} />
            <p className="mt-2 text-xs text-muted">
              {quota && <>Còn {quota.remainingToday}/{quota.limit} lượt hôm nay · </>}
              {CHAT_DISCLAIMER}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
