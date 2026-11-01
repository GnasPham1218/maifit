import { useEffect, useState } from 'react';
import { authApi } from '../apis/authApi';
import { getErrorMessage } from '../constants/errorMessages';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const { user } = useAuth();
  const [health, setHealth] = useState('LOADING');
  const [meResult, setMeResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/actuator/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { status: string }) => setHealth(data.status))
      .catch(() => setHealth('DOWN'));
  }, []);

  // Temporary: lets you test the automatic refresh. After the access token expires,
  // this call gets a 401, the client refreshes silently and retries.
  async function checkSession() {
    try {
      const me = await authApi.me();
      setMeResult(`OK lúc ${new Date().toLocaleTimeString()}: ${me.email}`);
    } catch (err) {
      setMeResult(getErrorMessage(err));
    }
  }

  return (
    <section>
      <h2>Xin chào, {user?.displayName}!</h2>
      <p>
        Email: {user?.email} · Username: {user?.username}
      </p>
      <p>
        Backend: <strong>{health}</strong>
      </p>
      <button type="button" className="btn btn-secondary" onClick={() => void checkSession()}>
        Gọi /auth/me
      </button>
      {meResult && <p>{meResult}</p>}
    </section>
  );
}
