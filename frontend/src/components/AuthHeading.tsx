import type { ReactNode } from 'react';

// The big title of a sign-in page and the sentence under it
export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 grid gap-2">
      <h1 className="pb-[0.08em] font-display text-4xl leading-[1.15] font-bold md:text-[44px]">{title}</h1>
      {children && <p className="text-muted">{children}</p>}
    </div>
  );
}
