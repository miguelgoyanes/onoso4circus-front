import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { obtenerDetallePlaza, type DetallePlaza } from '../api/analisis';
import { PeriodoSelector, periodoEsteMes, type Periodo } from '../components/PeriodoSelector';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function AnalisisPlazaDetailPage() {
  const { plazaId } = useParams<{ plazaId: string }>();
  const { accessToken, logout } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(periodoEsteMes());
  const [detalle, setDetalle] = useState<DetallePlaza | null>(null);
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
    if (!accessToken || !plazaId) return;
    obtenerDetallePlaza(accessToken, plazaId, periodo.desde, periodo.hasta).then(setDetalle).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, plazaId, periodo]);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Análisis', to: '/analisis' },
              { label: 'Por plaza', to: '/analisis/plazas' },
              { label: detalle?.plazaNombre ?? '…' },
            ]}
          />
          <h1>{detalle?.plazaNombre ?? 'Plaza'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <PeriodoSelector periodo={periodo} onChange={setPeriodo} />

        {detalle && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{detalle.beneficio} €</div>
              <div className="detail-hero-meta">
                <span className="badge badge-muted">Beneficio del periodo</span>
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">Ingresos</p>
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-label">Taquilla</span>
                  <span className="detail-value">{detalle.ingresosTaquilla} €</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Bar</span>
                  <span className="detail-value">{detalle.ingresosBar} €</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Contratos</span>
                  <span className="detail-value">{detalle.ingresosContratos} €</span>
                </div>
                <div className="detail-row detail-row-total">
                  <span className="detail-label">Total ingresos</span>
                  <span className="detail-value">{detalle.ingresosTotal} €</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">Gastos</p>
              <div className="detail-rows">
                {detalle.gastosPorCategoria.map((g) => (
                  <div className="detail-row" key={g.categoriaNombre}>
                    <span className="detail-label">{g.categoriaNombre}</span>
                    <span className="detail-value">{g.importe} €</span>
                  </div>
                ))}
                <div className="detail-row">
                  <span className="detail-label">Personal</span>
                  <span className="detail-value">{detalle.costePersonal} €</span>
                </div>
                <div className="detail-row detail-row-total">
                  <span className="detail-label">Total gastos</span>
                  <span className="detail-value">{detalle.gastosTotal} €</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
