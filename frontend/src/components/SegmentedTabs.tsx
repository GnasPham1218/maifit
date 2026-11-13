import { useRef, type KeyboardEvent } from 'react';

interface Item<T extends string> {
  id: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  label: string; // what the group is, for screen readers
  items: Item<T>[];
  value: T;
  onChange: (id: T) => void;
}

// Pill tabs inside one rounded track. Arrow keys move and select (the ARIA tabs pattern);
// only the selected tab is in the Tab order. For tabs that are routes, use NavLink instead.
export function SegmentedTabs<T extends string>({ label, items, value, onChange }: SegmentedTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + items.length) % items.length;
    onChange(items[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
      {items.map((item, i) => {
        const selected = item.id === value;
        return (
          <button key={item.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab"
            aria-selected={selected} tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)} onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-10 shrink-0 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
              ${selected ? 'bg-accent text-on-accent' : 'text-ink hover:bg-soft'}`}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
