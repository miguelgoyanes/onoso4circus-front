import { decodeJwt } from '../api/auth';
import './WelcomePage.css';

interface WelcomePageProps {
  accessToken: string;
  onLogout: () => void;
}

export function WelcomePage({ accessToken, onLogout }: WelcomePageProps) {
  const payload = decodeJwt(accessToken);

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <h1>Bienvenido</h1>
        <p className="welcome-email">{payload.email}</p>
        <span className="welcome-role">{payload.rol}</span>
        <button type="button" className="welcome-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
