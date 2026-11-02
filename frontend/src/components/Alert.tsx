import type { ReactNode } from 'react';

type AlertType = 'error' | 'success' | 'info';

interface AlertProps {
  type: AlertType;
  children: ReactNode;
}

const STYLES: Record<AlertType, string> = {
  error: 'bg-danger-bg text-danger',
  success: 'bg-success-bg text-success',
  info: 'bg-info-bg text-info',
};

export function Alert({ type, children }: AlertProps) {
  // role="alert" makes screen readers announce errors as soon as they appear
  return (
    <div
      className={`mb-3.5 rounded-lg px-3 py-2.5 text-sm ${STYLES[type]}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
