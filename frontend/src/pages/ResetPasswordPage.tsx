import { useState } from 'react';
import { AuthHeading } from '../components/AuthHeading';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../apis/authApi';
import { Alert } from '../components/Alert';
import { FormField } from '../components/FormField';
import { getErrorMessage, getFieldErrors } from '../constants/errorMessages';
import { validatePassword } from '../utils/validation';
import { Button } from '../components/Button';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!token) return;
    setError(null);
    const errors: Record<string, string> = {};
    const passwordError = validatePassword(form.newPassword);
    if (passwordError) errors.newPassword = passwordError;
    if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, form.newPassword);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <>
        <AuthHeading title="Đặt lại mật khẩu" />
        <Alert type="error">Liên kết không hợp lệ.</Alert>
        <div className="mt-4.5 flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/forgot-password">Gửi lại liên kết</Link>
        </div>
      </>
    );
  }

  if (done) {
    return (
      <>
        <AuthHeading title="Đặt lại mật khẩu" />
        <Alert type="success">
          Đã đặt mật khẩu mới. Mọi thiết bị đã bị đăng xuất, hãy đăng nhập lại.
        </Alert>
        <div className="mt-4.5 flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/login">Đăng nhập</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Đặt mật khẩu mới">Liên kết chỉ dùng được một lần.</AuthHeading>
      {error && <Alert type="error">{error}</Alert>}
      <form
        className="grid gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <FormField label="Mật khẩu mới" name="newPassword" type="password" autoComplete="new-password" required
          value={form.newPassword} error={fieldErrors.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        <FormField label="Nhập lại mật khẩu" name="confirmPassword" type="password" autoComplete="new-password" required
          value={form.confirmPassword} error={fieldErrors.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Đang lưu…' : 'Đặt mật khẩu'}
        </Button>
      </form>
      <div className="mt-4.5 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/forgot-password">Gửi lại liên kết</Link>
      </div>
    </>
  );
}
