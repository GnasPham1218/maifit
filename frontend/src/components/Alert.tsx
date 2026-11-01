import type { ReactNode } from 'react';

interface AlertProps {
  type: 'error' | 'success' | 'info';
  children: ReactNode;
}

export function Alert({ type, children }: AlertProps) {
  // role="alert" makes screen readers announce errors as soon as they appear
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
