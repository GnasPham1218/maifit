import { useState } from 'react';
import { AuthHeading } from '../components/AuthHeading';
import { Link } from 'react-router';
import { authApi } from '../apis/authApi';
import { Alert } from '../components/Alert';
import { FormField } from '../components/FormField';
import { getErrorMessage } from '../constants/errorMessages';
import { Button } from '../components/Button';
import { TurnstileWidget } from '../components/TurnstileWidget';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Changing this remounts the widget, which gives a brand-new CAPTCHA (a token works only once)
  const [captchaKey, setCaptchaKey] = useState(0);

  async function handleSubmit() {
    if (!captchaToken) return; // the button is disabled until the widget passes
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email, captchaToken);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuthHeading title="Quên mật khẩu">Nhập email đã đăng ký, MAIFit gửi liên kết đặt lại mật khẩu.</AuthHeading>
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
            <TurnstileWidget key={captchaKey} onToken={setCaptchaToken} />
            <Button type="submit" disabled={submitting || !captchaToken}>
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
