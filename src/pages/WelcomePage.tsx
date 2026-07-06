import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { tieneRol } from '../auth/roles';
import './WelcomePage.css';

export function WelcomePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <h1>Bienvenido</h1>
        <p className="welcome-email">{user.username}</p>
        <span className="welcome-role">{user.rol}</span>

        {tieneRol(user.rol, 'ADMIN') && (
          <>
            <Link to="/plazas" className="welcome-link">
              Gestionar plazas
            </Link>
            <Link to="/usuarios" className="welcome-link">
              Gestionar usuarios
            </Link>
          </>
        )}

        <button type="button" className="welcome-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
