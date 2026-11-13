import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

// The native <dialog> with showModal(): the browser traps focus, makes the page behind inert,
// closes on Esc and puts it in the top layer (above every z-index). Less code than a custom one, and correct.
// Phones: a bottom sheet. From md: a centered dialog. The open animation is CSS (@starting-style).
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby={titleId}
      // Esc and close() both end here: the parent state follows
      onClose={onClose}
      // A click on the backdrop is a click on the <dialog> itself (the content is inside a child)
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className={`modal m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[28px] bg-surface p-0 text-ink
        backdrop:bg-black/60 md:m-auto md:rounded-[28px] ${size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg'}`}>
      <div className="flex max-h-[92dvh] flex-col">
        <span aria-hidden="true" className="mx-auto mt-3 h-1 w-10 rounded-full bg-line md:hidden" />
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2 md:px-7 md:pt-6">
          <h2 id={titleId} className="font-display text-2xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line hover:bg-soft
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-7">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-4 md:px-7">{footer}</footer>}
      </div>
    </dialog>
  );
}
