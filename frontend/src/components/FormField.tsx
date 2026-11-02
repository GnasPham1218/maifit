import type { InputHTMLAttributes } from 'react';
import { FIELD_CONTROL, FIELD_ERROR, FIELD_LABEL } from './fieldStyles';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

export function FormField({ label, name, error, ...inputProps }: FormFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        className={FIELD_CONTROL}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}
