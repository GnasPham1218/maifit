interface ProgressBarProps {
  value: number;
  max: number;
  label: string; // read by screen readers
}

// Thin pill bar. Past the target it stays full; the text next to it says by how much.
export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className="h-2.5 w-full overflow-hidden rounded-full bg-surface"
    >
      <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}
