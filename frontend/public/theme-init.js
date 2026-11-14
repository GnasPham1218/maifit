// Runs before React (a plain file: the CSP forbids inline scripts), so the first paint already has the
// right theme instead of a white flash. Same rules as src/utils/theme.ts: keep both in sync.
(function () {
  var pref = 'dark';
  try {
    var saved = localStorage.getItem('maifit-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') pref = saved;
  } catch (e) {
    // Storage blocked (private mode, policy): keep the default
  }
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

  // Accent color (src/utils/accent.ts): remembered on this device, the account confirms it after login
  try {
    var accent = localStorage.getItem('maifit-accent');
    if (['TEAL', 'GREEN', 'ORANGE', 'PURPLE', 'PINK'].indexOf(accent) >= 0) {
      document.documentElement.dataset.accent = accent.toLowerCase();
    }
  } catch (e) {
    // Storage blocked: the default blue
  }
})();
