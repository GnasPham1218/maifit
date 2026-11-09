// Cloudflare's public test site key: the widget always passes and returns a dummy token.
// Only used by the dev server; the backend must then use the matching test secret key.
const TEST_SITE_KEY = '1x00000000000000000000AA';

// Production builds get the real key at build time (see Dockerfile). A production build
// without it gets '' and the widget shows an error instead of silently using the test key.
export const TURNSTILE_SITE_KEY: string =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? TEST_SITE_KEY : '');
