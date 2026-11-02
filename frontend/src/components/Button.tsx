import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';
type Size = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// One place for button styles instead of repeating ~10 utility classes on every <button>
const BASE =
  'cursor-pointer rounded-lg border font-semibold disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<Variant, string> = {
  primary: 'border-transparent bg-primary text-white enabled:hover:bg-primary-hover',
  secondary: 'border-line bg-surface text-ink enabled:hover:bg-bg',
};

const SIZES: Record<Size, string> = {
  md: 'px-3.5 py-2.5',
  sm: 'px-2.5 py-1 text-sm',
};

// type defaults to "button": a plain <button> inside a <form> would submit it by accident
export function Button({ variant = 'primary', size = 'md', type = 'button', className = '', ...props }: ButtonProps) {
  return <button type={type} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...props} />;
}
