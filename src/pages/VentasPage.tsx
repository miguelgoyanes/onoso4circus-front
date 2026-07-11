import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { tieneRol } from '../auth/roles';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function VentasPage() {
  const { user } = useAuth();
  const esAdmin = tieneRol(user?.rol ?? '', 'ADMIN');

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Ventas' }]} />
          <h1>Ventas</h1>
        </div>

        <div className="crud-list">
          {esAdmin && (
            <Link to="/ventas/contratos" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">Contratos</div>
                  <div className="crud-card-meta">
                    <span>Ingresos con ayuntamientos y organizadores, con o sin IVA</span>
                  </div>
                </div>
                <span className="crud-card-chevron" aria-hidden="true">
                  ›
                </span>
              </div>
            </Link>
          )}

          <Link to="/ventas/taquilla" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Taquilla</div>
                <div className="crud-card-meta">
                  <span>Venta de entradas por pase, en efectivo, tarjeta u online</span>
                </div>
              </div>
              <span className="crud-card-chevron" aria-hidden="true">
                ›
              </span>
            </div>
          </Link>

          <Link to="/ventas/bar" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Bar</div>
                <div className="crud-card-meta">
                  <span>Venta rápida de productos por pase, en un tap</span>
                </div>
              </div>
              <span className="crud-card-chevron" aria-hidden="true">
                ›
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
