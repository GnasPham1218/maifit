import { useEffect, useRef, useState } from 'react';
import { TURNSTILE_SITE_KEY } from '../constants/turnstile';
import { Alert } from './Alert';

// The small part of Cloudflare's window.turnstile API that we use
interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// render=explicit: Cloudflare does not scan the page; we decide where and when the widget appears
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Shared by every widget on the page, so the script is added to <head> only once
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not initialise'));
    script.onerror = () => {
      scriptPromise = null; // allow a retry on the next mount
      reject(new Error('Turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface TurnstileWidgetProps {
  // Called with a fresh token when the check passes, and with null when it expires or fails.
  // A token can be used only once: to get a new one, remount the widget (change its React `key`).
  onToken: (token: string | null) => void;
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Always call the latest onToken without re-creating the widget on every render
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false; // the component may unmount before the script finishes loading

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null), // tokens expire after 5 minutes
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, []);

  if (loadFailed) {
    return (
      <Alert type="error">
        Không tải được bước xác minh chống bot. Hãy tắt trình chặn quảng cáo cho trang này hoặc tải lại trang.
      </Alert>
    );
  }
  // min-height reserves the widget's space so the form does not jump when it appears
  return <div ref={containerRef} className="min-h-[65px]" />;
}
