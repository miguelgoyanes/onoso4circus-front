import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { tieneRol } from './roles';

interface ProtectedRouteProps {
  requiredRole?: string | string[];
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { accessToken, user } = useAuth();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole) {
    const rolesPermitidos = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!rolesPermitidos.some((rol) => tieneRol(user.rol, rol))) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}
