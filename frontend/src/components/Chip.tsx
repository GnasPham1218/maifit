import type { ButtonHTMLAttributes } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean; // a toggle: announced as pressed / not pressed
  size?: 'sm' | 'md';
}

// Small rounded choice: an exercise, a preparation, a period. Selected = filled with the accent.
export function Chip({ selected = false, size = 'md', type = 'button', className = '', ...props }: ChipProps) {
  const sizing = size === 'sm' ? 'min-h-8 px-3 text-xs' : 'min-h-9 px-4 text-sm';
  const look = selected
    ? 'border-accent bg-accent text-on-accent'
    : 'border-line bg-transparent text-ink hover:bg-soft';
  return (
    <button type={type} aria-pressed={selected}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border font-medium transition-colors
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
        disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${look} ${className}`}
      {...props} />
  );
}
