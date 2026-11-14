import { BookOpen } from 'lucide-react';
import type { ChatSource } from '../../types/chat';
import { safeUrl } from '../../utils/chat';

// The documents an answer was built from, under the answer
export function SourceChips({ sources }: { sources: ChatSource[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Nguồn">
      {sources.map((source, i) => {
        const href = safeUrl(source.url);
        const label = source.section ? `${source.title} · ${source.section}` : source.title;
        const chip = (
          <>
            <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </>
        );
        const className = 'inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky px-3 py-1 text-xs text-ink';
        return (
          <li key={`${i}-${label}`} className="min-w-0 max-w-full">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" title={label}
                className={`${className} hover:bg-sky-strong hover:text-white`}>
                {chip}
              </a>
            ) : (
              <span className={className} title={label}>{chip}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
