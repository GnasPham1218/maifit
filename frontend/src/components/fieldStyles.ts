// Shared by FormField and SelectField. aria-invalid:* applies when the field has an error.
export const FIELD_CONTROL =
  // w-full + min-w-0: never wider than the grid column (a <select> is as wide as its longest option)
  'w-full min-w-0 min-h-11 rounded-xl border border-line bg-field px-4 py-2.5 text-ink transition-colors ' +
  'placeholder:text-muted hover:border-muted focus:outline-2 focus:outline-offset-1 focus:outline-accent ' +
  'aria-invalid:border-danger';
export const FIELD_LABEL = 'text-sm font-medium text-muted';
export const FIELD_ERROR = 'text-sm text-danger';
