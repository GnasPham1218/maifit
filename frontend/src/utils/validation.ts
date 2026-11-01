// Quick client-side checks for a better UX. The backend (@Valid) remains the real guard.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Mật khẩu phải có ít nhất ${PASSWORD_MIN} ký tự.`;
  if (password.length > PASSWORD_MAX) return `Mật khẩu tối đa ${PASSWORD_MAX} ký tự.`;
  return null;
}

export function validateUsername(username: string): string | null {
  return /^[A-Za-z0-9_]{3,30}$/.test(username) ? null : 'Username gồm 3–30 ký tự: chữ, số hoặc dấu gạch dưới.';
}
