import { useState } from 'react';
import { AuthHeading } from '../components/AuthHeading';
import { Link, useLocation, useNavigate } from 'react-router';
import { Alert } from '../components/Alert';
import { FormField } from '../components/FormField';
import { getErrorMessage } from '../constants/errorMessages';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuthHeading title="Chào mừng trở lại">Đăng nhập để xem tiến độ hôm nay.</AuthHeading>
      {error && <Alert type="error">{error}</Alert>}
      <form
        className="grid gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <FormField
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Link to="/forgot-password" className="justify-self-end text-sm font-medium">Quên mật khẩu?</Link>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Chưa có tài khoản? <Link to="/register" className="font-medium">Tạo tài khoản</Link>
      </p>
    </>
  );
}
