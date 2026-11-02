import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '../apis/authApi';
import { Alert } from '../components/Alert';
import { FormField } from '../components/FormField';
import { getErrorMessage } from '../constants/errorMessages';
import { Button } from '../components/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="mb-5 text-lg font-semibold">Quên mật khẩu</h2>
      {sent ? (
        // Same text whether the account exists or not (the backend does the same)
        <Alert type="success">
          Nếu email này có tài khoản MAIFit, chúng tôi đã gửi liên kết đặt lại mật khẩu. Liên kết có hiệu lực 30 phút.
        </Alert>
      ) : (
        <>
          {error && <Alert type="error">{error}</Alert>}
          <form
            className="grid gap-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <FormField label="Email" name="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
            </Button>
          </form>
        </>
      )}
      <div className="mt-4.5 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/login">Về trang đăng nhập</Link>
      </div>
    </>
  );
}
