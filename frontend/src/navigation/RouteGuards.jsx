/**
 * ProtectedRoute: only for logged-in students (otherwise -> /login).
 * PublicOnlyRoute: welcome/login/register pages. A logged-in student is sent to
 * the setup wizard (first time) or back to the page they originally wanted.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (isAuthenticated) {
    if (!user?.preferences?.onboarded) return <Navigate to="/setup" replace />;
    return <Navigate to={location.state?.from || '/home'} replace />;
  }
  return <Outlet />;
}
