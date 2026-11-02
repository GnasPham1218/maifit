// Shared by FormField and SelectField. aria-invalid:* applies when the field has an error.
export const FIELD_CONTROL =
  // w-full + min-w-0: never wider than the grid column (a <select> is as wide as its longest option)
  'w-full min-w-0 rounded-2xl border border-line bg-surface px-4 py-2.5 transition-colors hover:border-muted ' +
  'focus:outline-2 focus:outline-offset-1 focus:outline-sky-strong aria-invalid:border-danger';
export const FIELD_LABEL = 'text-sm font-medium';
export const FIELD_ERROR = 'text-sm text-danger';
