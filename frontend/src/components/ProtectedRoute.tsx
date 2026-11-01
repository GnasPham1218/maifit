import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { FullPageLoader } from './FullPageLoader';

// Pages under this route require a logged-in user
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  // Still restoring the session from the refresh cookie: do not redirect yet
  if (status === 'loading') return <FullPageLoader />;

  if (status === 'anonymous') {
    // Remember where the user wanted to go, so login can send them back there
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
