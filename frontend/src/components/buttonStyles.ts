// Shared by <Button> and <ButtonLink>, so a link that looks like a button stays in sync with real buttons.
// primary: the one main action of a view. secondary: other actions. ghost: low emphasis (text-like).
// hero: on the dark highlight block (bg-hero). danger: destructive actions.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'hero' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

// active:scale gives a small "press" feedback; the global reduced-motion rule turns it off.
const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border font-semibold ' +
  'transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

// hover: is used (not enabled:hover:) so the same classes work on <a>, which has no :enabled state
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-on-accent hover:text-on-accent hover:brightness-110 disabled:hover:brightness-100',
  secondary: 'border-line bg-surface text-ink hover:bg-soft hover:text-ink disabled:hover:bg-surface',
  ghost: 'border-transparent bg-transparent text-link hover:bg-soft disabled:hover:bg-transparent',
  hero: 'border-hero-ink/30 bg-transparent text-hero-ink hover:bg-hero-ink/10 hover:text-hero-ink disabled:hover:bg-transparent',
  danger: 'border-transparent bg-danger text-white hover:text-white hover:brightness-110 disabled:hover:brightness-100',
};

// md and lg are at least 44px high (touch target); sm is for dense rows only
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 text-sm',
  md: 'min-h-11 px-5 text-[15px]',
  lg: 'min-h-14 px-7 text-base',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}
