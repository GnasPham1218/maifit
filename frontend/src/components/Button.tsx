import type { ButtonHTMLAttributes } from 'react';

// primary: the one main action of a view. secondary: other actions. ghost: low emphasis (text-like).
// hero: on the dark highlight block (bg-hero). danger: destructive actions.
type Variant = 'primary' | 'secondary' | 'ghost' | 'hero' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// One place for button styles instead of repeating ~10 utility classes on every <button>.
// active:scale gives a small "press" feedback; the global reduced-motion rule turns it off.
const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border font-semibold ' +
  'transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

const VARIANTS: Record<Variant, string> = {
  primary: 'border-transparent bg-accent text-on-accent enabled:hover:brightness-110',
  secondary: 'border-line bg-surface text-ink enabled:hover:bg-soft',
  ghost: 'border-transparent bg-transparent text-link enabled:hover:bg-soft',
  hero: 'border-hero-ink/30 bg-transparent text-hero-ink enabled:hover:bg-hero-ink/10',
  danger: 'border-transparent bg-danger text-white enabled:hover:brightness-110',
};

// md and lg are at least 44px high (touch target); sm is for dense rows only
const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3.5 text-sm',
  md: 'min-h-11 px-5 text-[15px]',
  lg: 'min-h-14 px-7 text-base',
};

// type defaults to "button": a plain <button> inside a <form> would submit it by accident
export function Button({ variant = 'primary', size = 'md', type = 'button', className = '', ...props }: ButtonProps) {
  return <button type={type} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...props} />;
}
