import { useState } from 'react';
import { AuthHeading } from '../components/AuthHeading';
import { Link } from 'react-router';
import { authApi } from '../apis/authApi';
import { Alert } from '../components/Alert';
import { FormField } from '../components/FormField';
import { getErrorMessage, getFieldErrors } from '../constants/errorMessages';
import { validatePassword, validateUsername } from '../utils/validation';
import { Button } from '../components/Button';
import { TurnstileWidget } from '../components/TurnstileWidget';

const EMPTY = { email: '', username: '', displayName: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Changing this remounts the widget, which gives a brand-new CAPTCHA (a token works only once)
  const [captchaKey, setCaptchaKey] = useState(0);

  function update(field: keyof typeof EMPTY, value: string) {
    setForm({ ...form, [field]: value });
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    const usernameError = validateUsername(form.username);
    if (usernameError) errors.username = usernameError;
    const passwordError = validatePassword(form.password);
    if (passwordError) errors.password = passwordError;
    if (form.confirmPassword !== form.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    return errors;
  }

  async function handleSubmit() {
    setError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!captchaToken) return; // the button is disabled until the widget passes

    setSubmitting(true);
    try {
      const user = await authApi.register({
        email: form.email,
        username: form.username,
        displayName: form.displayName,
        password: form.password,
        captchaToken,
      });
      setRegisteredEmail(user.email);
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
      // The backend already used this token (even if the error was e.g. "email taken"), so get a new one
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <>
        <AuthHeading title="Kiểm tra email" />
        <Alert type="success">
          Đã gửi liên kết xác thực tới <strong>{registeredEmail}</strong>. Liên kết có hiệu lực trong 24 giờ.
          Nếu không thấy, hãy kiểm tra cả mục Spam.
        </Alert>
        <div className="mt-4.5 flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/login">Về trang đăng nhập</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Tạo tài khoản">Miễn phí. Mỗi ngày có lượt nhận diện ảnh món ăn và hỏi MBotFit.</AuthHeading>
      {error && <Alert type="error">{error}</Alert>}
      <form
        className="grid gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <FormField label="Email" name="email" type="email" autoComplete="email" required
          value={form.email} error={fieldErrors.email} onChange={(e) => update('email', e.target.value)} />
        <FormField label="Username" name="username" autoComplete="username" required
          value={form.username} error={fieldErrors.username} onChange={(e) => update('username', e.target.value)} />
        <FormField label="Tên hiển thị" name="displayName" required maxLength={50}
          value={form.displayName} error={fieldErrors.displayName} onChange={(e) => update('displayName', e.target.value)} />
        <FormField label="Mật khẩu" name="password" type="password" autoComplete="new-password" required
          value={form.password} error={fieldErrors.password} onChange={(e) => update('password', e.target.value)} />
        <FormField label="Nhập lại mật khẩu" name="confirmPassword" type="password" autoComplete="new-password" required
          value={form.confirmPassword} error={fieldErrors.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)} />
        <TurnstileWidget key={captchaKey} onToken={setCaptchaToken} />
        <Button type="submit" disabled={submitting || !captchaToken}>
          {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </Button>
      </form>
      <div className="mt-4.5 flex flex-wrap justify-between gap-2 text-sm">
        <span>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </span>
      </div>
    </>
  );
}
