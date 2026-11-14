import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';
import type { ChatConversation } from '../../types/chat';

interface ConversationListProps {
  conversations: ChatConversation[] | null; // null = loading
  onDelete: (id: number) => Promise<void>;
}

// 13/11 for this year, 13/11/2025 otherwise (Vietnam time)
function shortDate(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: sameYear ? undefined : 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

const rowClass = ({ isActive }: { isActive: boolean }) =>
  `block min-w-0 flex-1 rounded-2xl px-3 py-2.5 ${isActive ? 'bg-ink text-white' : 'hover:bg-bg'}`;

export function ConversationList({ conversations, onDelete }: ConversationListProps) {
  // Delete asks for a confirmation inside the row (no browser dialog)
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function confirmDelete(id: number) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <nav aria-label="Các cuộc trò chuyện" className="flex min-h-0 flex-col gap-3">
      <NavLink
        to="/chat/new"
        className={({ isActive }) =>
          `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-medium ${
            isActive ? 'bg-ink text-white' : 'border border-line bg-surface hover:bg-bg'
          }`
        }
      >
        <MessageSquarePlus aria-hidden="true" className="size-4" />
        Hỏi mới
      </NavLink>

      {conversations === null && <p className="px-3 text-sm text-muted">Đang tải…</p>}
      {conversations?.length === 0 && <p className="px-3 text-sm text-muted">Chưa có cuộc trò chuyện nào.</p>}

      <ul className="grid min-h-0 gap-1 overflow-y-auto">
        {conversations?.map((c) => (
          <li key={c.id} className="flex items-center gap-1">
            {confirmingId === c.id ? (
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-danger-bg px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-danger">Xóa “{c.title}”?</span>
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-danger disabled:opacity-60"
                  onClick={() => void confirmDelete(c.id)}
                  disabled={deletingId === c.id}
                >
                  {deletingId === c.id ? 'Đang xóa…' : 'Xóa'}
                </button>
                <button
                  type="button"
                  className="cursor-pointer text-ink-soft"
                  onClick={() => setConfirmingId(null)}
                  disabled={deletingId === c.id}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <>
                <NavLink to={`/chat/${c.id}`} className={rowClass} title={c.title}>
                  <span className="block truncate">{c.title}</span>
                  <span className="block text-xs opacity-70">{shortDate(c.updatedAt)}</span>
                </NavLink>
                <button
                  type="button"
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-bg hover:text-danger"
                  onClick={() => setConfirmingId(c.id)}
                  aria-label={`Xóa cuộc trò chuyện ${c.title}`}
                  title="Xóa"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
