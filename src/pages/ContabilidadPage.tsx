import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function ContabilidadPage() {
  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Contabilidad' }]} />
          <h1>Contabilidad</h1>
        </div>

        <div className="crud-list">
          <Link to="/contabilidad/diario" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Libro diario</div>
                <div className="crud-card-meta">
                  <span>Todos los asientos contables, filtrables por cuenta y fecha</span>
                </div>
              </div>
              <span className="crud-card-chevron" aria-hidden="true">
                ›
              </span>
            </div>
          </Link>

          <Link to="/contabilidad/mayor" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Libro mayor</div>
                <div className="crud-card-meta">
                  <span>Histórico y saldo acumulado de cada cuenta</span>
                </div>
              </div>
              <span className="crud-card-chevron" aria-hidden="true">
                ›
              </span>
            </div>
          </Link>

          <Link to="/contabilidad/pyg" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Pérdidas y ganancias</div>
                <div className="crud-card-meta">
                  <span>Ingresos y gastos desglosados por cuenta en un periodo</span>
                </div>
              </div>
              <span className="crud-card-chevron" aria-hidden="true">
                ›
              </span>
            </div>
          </Link>

          <Link to="/contabilidad/balance" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Balance de situación</div>
                <div className="crud-card-meta">
                  <span>Activo, pasivo y patrimonio neto a una fecha</span>
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
