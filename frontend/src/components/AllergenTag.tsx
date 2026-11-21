import { CircleAlert, CircleHelp } from 'lucide-react';

export type AllergenLevel = 'CONTAINS' | 'MAY_CONTAIN';

interface Props {
  level: AllergenLevel;
  name: string; // the allergen group, lower case in the sentence: "Chứa sữa"
  size?: 'sm' | 'md';
}

// One look everywhere (food page, meal log, MBotFit cards, /about/allergens). The two levels differ by
// border (solid vs dashed) and icon, not only by color, so they stay apart for color-blind users.
export function AllergenTag({ level, name, size = 'md' }: Props) {
  const contains = level === 'CONTAINS';
  const Icon = contains ? CircleAlert : CircleHelp;
  const sizing = size === 'sm' ? 'gap-1 px-2 py-0.5 text-xs' : 'gap-1.5 py-1 pr-2.5 pl-2 text-[13px]';
  const look = contains
    ? 'border-solid border-danger/60 bg-danger-bg text-danger'
    : 'border-dashed border-warn/70 bg-transparent text-warn';
  return (
    <span className={`inline-flex items-center rounded-lg border-[1.5px] font-semibold whitespace-nowrap ${sizing} ${look}`}>
      <Icon aria-hidden="true" className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      {contains ? 'Chứa' : 'Có thể chứa'} {name.toLocaleLowerCase('vi')}
    </span>
  );
}
