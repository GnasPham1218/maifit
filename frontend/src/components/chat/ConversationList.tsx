import { Plus, Trash2 } from 'lucide-react';
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

// The delete button sits over the right end of the row; the title makes room for it only when it shows
const rowClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-w-0 flex-1 flex-col gap-0.5 rounded-[14px] px-3 py-2.5 pr-11 transition-colors pointer-fine:pr-3
  pointer-fine:group-hover:pr-11 pointer-fine:group-focus-within:pr-11 ${isActive ? 'bg-accent text-on-accent hover:text-on-accent' : 'text-ink hover:bg-soft hover:text-ink'}`;

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
    <nav aria-label="Các cuộc trò chuyện" className="flex min-h-0 flex-1 flex-col gap-3">
      <NavLink
        to="/chat/new"
        className={({ isActive }) =>
          `flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full px-5 font-semibold transition-colors ${
            isActive ? 'bg-accent text-on-accent' : 'border border-line bg-surface hover:bg-soft'
          }`
        }
      >
        <Plus aria-hidden="true" className="size-4" />
        Hỏi mới
      </NavLink>

      {conversations === null && <p className="px-3 text-sm text-muted">Đang tải…</p>}
      {conversations?.length === 0 && <p className="px-3 text-sm text-muted">Chưa có cuộc trò chuyện nào.</p>}

      {/* Many conversations: only the list scrolls, "Hỏi mới" stays on top */}
      <ul className="scroll-soft scroll-fade -mr-2 grid min-h-0 grid-cols-[minmax(0,1fr)] content-start gap-1 overflow-x-hidden overflow-y-auto pr-2">
        {conversations?.map((c) => (
          <li key={c.id} className="group relative flex min-w-0 items-center">
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
                  className="cursor-pointer text-muted"
                  onClick={() => setConfirmingId(null)}
                  disabled={deletingId === c.id}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <>
                <NavLink to={`/chat/${c.id}`} className={rowClass} title={c.title}>
                  {({ isActive }) => (
                    <>
                      <span className="truncate font-medium">{c.title}</span>
                      <span className={`text-xs ${isActive ? 'opacity-75' : 'text-muted'}`}>{shortDate(c.updatedAt)}</span>
                    </>
                  )}
                </NavLink>
                {/* Mouse: shows on hover or keyboard focus. Touch: always there (no hover). */}
                <button
                  type="button"
                  className="absolute right-1.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted
                    hover:bg-surface hover:text-danger focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent
                    pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
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
