/// <reference types="vite/client" />

// Build-time variables (Vite inlines VITE_* values into the JS bundle at build time)
interface ImportMetaEnv {
  // Public Turnstile site key; set as a Docker build arg in CI, unset in local dev
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
