import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { FullPageLoader } from './FullPageLoader';

// Login / register / forgot-password: a logged-in user has nothing to do there
export function GuestRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
