import { useSyncExternalStore } from 'react';

// true while the CSS media query matches, e.g. useMediaQuery('(min-width: 48rem)').
// useSyncExternalStore: reads the browser's own state, re-renders only when it changes.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
