import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { obtenerPyg, type Pyg } from '../api/contabilidad';
import { PeriodoSelector, periodoEsteMesCompleto, type Periodo } from '../components/PeriodoSelector';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function PygPage() {
  const { accessToken, logout } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(periodoEsteMesCompleto());
  const [pyg, setPyg] = useState<Pyg | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleApiError(err: unknown): void {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        logout();
        return;
      }
      setError(err.message);
      return;
    }
    setError('Error inesperado');
  }

  useEffect(() => {
    if (!accessToken) return;
    obtenerPyg(accessToken, periodo.desde, periodo.hasta).then(setPyg).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, periodo]);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Contabilidad', to: '/contabilidad' }, { label: 'Pérdidas y ganancias' }]} />
          <h1>Pérdidas y ganancias</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <PeriodoSelector periodo={periodo} onChange={setPeriodo} completo />

        {pyg && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{pyg.resultado} €</div>
              <div className="detail-hero-meta">
                <span className="badge badge-muted">Resultado del periodo</span>
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">Ingresos</p>
              <div className="detail-rows">
                {pyg.ingresos.length === 0 && <p className="crud-empty">Sin ingresos en este periodo.</p>}
                {pyg.ingresos.map((l) => (
                  <div className="detail-row" key={l.cuenta.id}>
                    <span className="detail-label">
                      {l.cuenta.code} — {l.cuenta.name}
                    </span>
                    <span className="detail-value">{l.importe} €</span>
                  </div>
                ))}
                <div className="detail-row detail-row-total">
                  <span className="detail-label">Total ingresos</span>
                  <span className="detail-value">{pyg.totalIngresos} €</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">Gastos</p>
              <div className="detail-rows">
                {pyg.gastos.length === 0 && <p className="crud-empty">Sin gastos en este periodo.</p>}
                {pyg.gastos.map((l) => (
                  <div className="detail-row" key={l.cuenta.id}>
                    <span className="detail-label">
                      {l.cuenta.code} — {l.cuenta.name}
                    </span>
                    <span className="detail-value">{l.importe} €</span>
                  </div>
                ))}
                <div className="detail-row detail-row-total">
                  <span className="detail-label">Total gastos</span>
                  <span className="detail-value">{pyg.totalGastos} €</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
