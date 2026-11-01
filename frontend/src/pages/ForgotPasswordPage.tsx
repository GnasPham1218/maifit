import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '../apis/authApi';
import { Alert } from '../components/Alert';
import { FormField } from '../components/FormField';
import { getErrorMessage } from '../constants/errorMessages';

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
      <h2 className="page-title">Quên mật khẩu</h2>
      {sent ? (
        // Same text whether the account exists or not (the backend does the same)
        <Alert type="success">
          Nếu email này có tài khoản MAIFit, chúng tôi đã gửi liên kết đặt lại mật khẩu. Liên kết có hiệu lực 30 phút.
        </Alert>
      ) : (
        <>
          {error && <Alert type="error">{error}</Alert>}
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <FormField label="Email" name="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
            </button>
          </form>
        </>
      )}
      <div className="links">
        <Link to="/login">Về trang đăng nhập</Link>
      </div>
    </>
  );
}
