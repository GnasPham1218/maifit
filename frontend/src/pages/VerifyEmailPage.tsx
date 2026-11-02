import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../apis/authApi';
import { Alert } from '../components/Alert';

type State = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>(token ? 'verifying' : 'error');

  // The token can be used only ONCE. React StrictMode runs effects twice in development:
  // without this guard the second call would fail and overwrite the success message.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <>
      <h2 className="mb-5 text-lg font-semibold">Xác thực email</h2>
      {state === 'verifying' && <Alert type="info">Đang xác thực…</Alert>}
      {state === 'success' && <Alert type="success">Email đã được xác thực. Bạn có thể đăng nhập.</Alert>}
      {state === 'error' && (
        <Alert type="error">Liên kết không hợp lệ, đã được dùng hoặc đã hết hạn.</Alert>
      )}
      <div className="mt-4.5 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/login">Đến trang đăng nhập</Link>
      </div>
    </>
  );
}
