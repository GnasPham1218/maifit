import { ArrowLeft, Clock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { chatApi } from '../apis/chatApi';
import { ApiError } from '../apis/client';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BotAvatar } from '../components/chat/BotAvatar';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatLimitDialog } from '../components/chat/ChatLimitDialog';
import { ChatMessageBubble, PendingBubble } from '../components/chat/ChatMessageBubble';
import { ConversationList } from '../components/chat/ConversationList';
import { CHAT_DISCLAIMER, SUGGESTED_QUESTIONS, chatLimitText } from '../constants/chat';
import { getErrorMessage } from '../constants/errorMessages';
import { usePremiumPlan } from '../hooks/usePremiumPlan';
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
  const plan = usePremiumPlan();
  const [limitOpen, setLimitOpen] = useState(false); // free plan out of questions: what Premium gives

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
      if (viewRef.current === askedIn) setDraft((current) => current || question);
      if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT') {
        // The input turns into the "out of questions" bar; without a known quota, say it in an alert
        if (quota) setQuota({ ...quota, remainingToday: 0 });
        else setSendError({ view: askedIn, message: chatLimitText(null) });
        if (plan && !plan.premium) setLimitOpen(true);
      } else {
        setSendError({ view: askedIn, message: getErrorMessage(err) });
      }
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

  const outOfQuestions = quota !== null && quota.remainingToday <= 0;
  const freePlan = plan !== null && !plan.premium;

  return (
    <>
    {/* Phones in a conversation: a back button to the list. md+: the list is always beside it. */}
    <header className="-mt-2 mb-5 flex items-center gap-3 md:mt-0 md:mb-6 md:gap-4">
      {!onListOnlyOnMobile && (
        <Link to="/chat" aria-label="Danh sách trò chuyện"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-soft md:hidden">
          <ArrowLeft aria-hidden="true" className="size-[18px]" />
        </Link>
      )}
      <BotAvatar className="size-9 text-[13px] md:size-12 md:text-[17px]" />
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold tracking-wide md:text-4xl">MBotFit</h1>
        <p className="hidden text-sm text-muted md:block">Trợ lý dinh dưỡng và tập luyện của MAIFit, có trích nguồn</p>
      </div>
    </header>

    {/* items-start: the list is as tall as its rows (up to the chat's height, then it scrolls) */}
    <div className="grid items-start gap-5 md:grid-cols-[17rem_minmax(0,1fr)]">
      <Card className={`min-w-0 flex-col p-4 md:flex md:max-h-[calc(100dvh-12rem)] ${onListOnlyOnMobile ? 'flex' : 'hidden'}`}>
        {listError && <Alert type="error">{listError}</Alert>}
        <ConversationList conversations={conversations} onDelete={handleDelete} />
      </Card>

      <Card className={`h-[calc(100dvh-16rem)] min-h-[26rem] min-w-0 flex-col md:flex md:h-[calc(100dvh-12rem)] ${
        onListOnlyOnMobile ? 'hidden' : 'flex'}`}>
        <div className="scroll-soft scroll-fade -mr-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-3">
          {view === null || messages === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-muted">Không tìm thấy cuộc trò chuyện.</p>
              <Link to="/chat/new" className="font-medium">Bắt đầu cuộc trò chuyện mới</Link>
            </div>
          ) : loadErrorHere ? (
            <Alert type="error">{loadErrorHere}</Alert>
          ) : messages === undefined ? (
            <p className="text-muted">Đang tải…</p>
          ) : messages.length === 0 && !pendingHere ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <BotAvatar className="size-16 text-[22px]" />
              <div className="grid gap-1">
                <p className="text-lg font-semibold">Hỏi MBotFit về dinh dưỡng và tập luyện</p>
                <p className="text-sm text-muted">Câu trả lời lấy từ tài liệu của MAIFit và ghi rõ nguồn.</p>
              </div>
              <ul className="grid w-full max-w-md gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <li key={q}>
                    <button type="button" onClick={() => pickSuggestion(q)}
                      className="w-full cursor-pointer rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:bg-soft">
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="grid grid-cols-[minmax(0,1fr)] gap-3.5" aria-live="polite">
              {/* minmax(0, 1fr): a long answer or source wraps inside the column instead of widening it */}
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
            {outOfQuestions ? (
              // Out of questions: no input to type into for nothing; the server would refuse anyway
              <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-line bg-bg p-4" role="status">
                <Clock aria-hidden="true" className="size-5 shrink-0 text-muted" />
                <p className="min-w-0 flex-[1_1_200px]">
                  <span className="font-semibold">Hết lượt hỏi hôm nay</span>
                  <span className="block text-sm text-muted">Bạn đã dùng {quota.limit}/{quota.limit} câu. Lượt mới có lúc 0 giờ.</span>
                </p>
                {freePlan && <Button size="sm" onClick={() => setLimitOpen(true)}>Xem Premium</Button>}
              </div>
            ) : (
              <ChatComposer value={draft} onChange={setDraft} onSend={() => void handleSend()}
                sending={sending !== null} textareaRef={textareaRef} />
            )}
            <p className="mt-2 px-1 text-xs text-muted">
              {quota && !outOfQuestions && <>Còn {quota.remainingToday}/{quota.limit} lượt hôm nay. </>}
              {CHAT_DISCLAIMER}
            </p>
          </div>
        )}
      </Card>
    </div>

    {plan && freePlan && <ChatLimitDialog open={limitOpen} onClose={() => setLimitOpen(false)} plan={plan} />}
    </>
  );
}
