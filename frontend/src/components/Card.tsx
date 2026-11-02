import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      {title && <h3 className="mb-3.5 text-base font-semibold">{title}</h3>}
      {children}
    </div>
  );
}
