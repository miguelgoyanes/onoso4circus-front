import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { tieneRol } from './roles';

interface ProtectedRouteProps {
  requiredRole?: string;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { accessToken, user } = useAuth();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && !tieneRol(user.rol, requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
