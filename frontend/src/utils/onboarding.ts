// "Tôi sẽ điền sau" / "Vẫn bỏ qua": the home page stops sending this device to /onboarding.
// The profile page and the home nudge still offer it.
const SKIPPED_KEY = 'maifit-onboarding-skipped';

export function onboardingSkipped(): boolean {
  try {
    return localStorage.getItem(SKIPPED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSkipped(): void {
  try {
    localStorage.setItem(SKIPPED_KEY, '1');
  } catch { /* storage blocked: the home page may offer it again next time */ }
}
