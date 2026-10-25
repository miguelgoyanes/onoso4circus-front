import { Link } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  Calculator,
  Globe,
  Heart,
  Landmark,
  MapPin,
  Package,
  Receipt,
  ShoppingCart,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { tieneRol } from '../auth/roles';
import './WelcomePage.css';

interface Modulo {
  to: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const MODULOS: Modulo[] = [
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart, color: '#3b82f6' },
  { to: '/plazas', label: 'Plazas', icon: MapPin, color: '#f59e0b' },
  { to: '/gastos', label: 'Gastos', icon: Receipt, color: '#ef4444' },
  { to: '/stock', label: 'Stock', icon: Package, color: '#06b6d4' },
  { to: '/tesoreria', label: 'Tesorería', icon: Landmark, color: '#10b981' },
  { to: '/activos', label: 'Activos', icon: Boxes, color: '#d946ef' },
  { to: '/personal', label: 'Personal', icon: Users, color: '#8b5cf6' },
  { to: '/analisis', label: 'Análisis', icon: BarChart3, color: '#84cc16' },
  { to: '/plazas-web', label: 'Web pública', icon: Globe, color: '#6366f1' },
  { to: '/contabilidad', label: 'Contabilidad', icon: Calculator, color: '#14b8a6' },
  { to: '/boda', label: 'Boda', icon: Heart, color: '#ec4899' },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, color: '#64748b' },
];

export function WelcomePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const modulosVisibles = tieneRol(user.rol, 'ADMIN')
    ? MODULOS
    : MODULOS.filter((m) => m.to === '/ventas');

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <h1>Bienvenido</h1>
        <p className="welcome-email">{user.username}</p>
        <span className="welcome-role">{user.rol}</span>

        {modulosVisibles.length > 0 && (
          <div className="modules-grid">
            {modulosVisibles.map(({ to, label, icon: Icon, color }) => (
              <Link key={to} to={to} className="module-tile">
                <span className="module-tile-icon" style={{ background: color }}>
                  <Icon size={24} strokeWidth={2} />
                </span>
                <span className="module-tile-label">{label}</span>
              </Link>
            ))}
          </div>
        )}

        <button type="button" className="welcome-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
