import { ChevronRight } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface Props {
  title: string;
  mobileTitle?: string; // the row label on phones, when it differs ("Cân nặng và số đo")
  subtitle?: string;
  action?: ReactNode; // next to the title (desktop, and inside the opened row on phones)
  children: ReactNode;
}

// md+: a normal card. Phones: a row with ›, opened in place (the profile stays one short page).
export function ProfileSection({ title, mobileTitle, subtitle, action, children }: Props) {
  const desktop = useMediaQuery('(min-width: 48rem)');
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (desktop) {
    return (
      <section className="min-w-0 rounded-card bg-surface p-6 text-ink">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-card bg-surface text-ink">
      <h2>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={panelId}
          className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 px-5 text-left font-medium
            focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
          {mobileTitle ?? title}
          <ChevronRight aria-hidden="true" className={`size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      </h2>
      {open && (
        <div id={panelId} className="grid gap-4 border-t border-line px-5 pt-4 pb-5">
          {(subtitle || action) && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
              {action}
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
