import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '../apis/authApi';
import { Alert } from '../components/Alert';
import { FormField } from '../components/FormField';
import { getErrorMessage, getFieldErrors } from '../constants/errorMessages';
import { validatePassword, validateUsername } from '../utils/validation';
import { Button } from '../components/Button';

const EMPTY = { email: '', username: '', displayName: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

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

    setSubmitting(true);
    try {
      const user = await authApi.register({
        email: form.email,
        username: form.username,
        displayName: form.displayName,
        password: form.password,
      });
      setRegisteredEmail(user.email);
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <>
        <h2 className="mb-5 text-lg font-semibold">Kiểm tra email của bạn</h2>
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
      <h2 className="mb-5 text-lg font-semibold">Tạo tài khoản</h2>
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
        <Button type="submit" disabled={submitting}>
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
