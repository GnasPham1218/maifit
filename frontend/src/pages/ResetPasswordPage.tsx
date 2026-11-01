import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../apis/authApi';
import { Alert } from '../components/Alert';
import { FormField } from '../components/FormField';
import { getErrorMessage, getFieldErrors } from '../constants/errorMessages';
import { validatePassword } from '../utils/validation';

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
        <h2 className="page-title">Đặt lại mật khẩu</h2>
        <Alert type="error">Liên kết không hợp lệ.</Alert>
        <div className="links">
          <Link to="/forgot-password">Gửi lại liên kết</Link>
        </div>
      </>
    );
  }

  if (done) {
    return (
      <>
        <h2 className="page-title">Đặt lại mật khẩu</h2>
        <Alert type="success">
          Đã đặt mật khẩu mới. Mọi thiết bị đã bị đăng xuất, hãy đăng nhập lại.
        </Alert>
        <div className="links">
          <Link to="/login">Đăng nhập</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="page-title">Đặt mật khẩu mới</h2>
      {error && <Alert type="error">{error}</Alert>}
      <form
        className="form"
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
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Đang lưu…' : 'Đặt mật khẩu'}
        </button>
      </form>
      <div className="links">
        <Link to="/forgot-password">Gửi lại liên kết</Link>
      </div>
    </>
  );
}
