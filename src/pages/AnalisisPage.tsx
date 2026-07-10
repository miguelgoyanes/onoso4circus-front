import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { obtenerResumenGeneral, type ResumenGeneral } from '../api/analisis';
import { PeriodoSelector, periodoEsteMes, type Periodo } from '../components/PeriodoSelector';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

function crecimiento(actual: string, anterior: string): number | null {
  const a = Number(actual);
  const b = Number(anterior);
  if (b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

function CrecimientoBadge({ actual, anterior }: { actual: string; anterior: string }) {
  const pct = crecimiento(actual, anterior);
  if (pct === null) return null;
  const positivo = pct >= 0;
  return (
    <span className={positivo ? 'badge badge-success' : 'badge badge-danger'}>
      {positivo ? '+' : ''}
      {pct.toFixed(1)}% vs. periodo anterior
    </span>
  );
}

export function AnalisisPage() {
  const { accessToken, logout } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(periodoEsteMes());
  const [resumen, setResumen] = useState<ResumenGeneral | null>(null);
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
    obtenerResumenGeneral(accessToken, periodo.desde, periodo.hasta).then(setResumen).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, periodo]);

  const datosVentas = resumen
    ? [
        { nombre: 'Taquilla', importe: Number(resumen.periodoActual.ventasTaquilla) },
        { nombre: 'Bar', importe: Number(resumen.periodoActual.ventasBar) },
        { nombre: 'Contratos', importe: Number(resumen.periodoActual.ventasContratos) },
      ]
    : [];

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Análisis' }]} />
          <h1>Análisis</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <PeriodoSelector periodo={periodo} onChange={setPeriodo} />

        {resumen && (
          <>
            <div className="crud-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div className="detail-card">
                <div className="detail-hero">
                  <div className="detail-hero-amount">{resumen.patrimonioLiquido} €</div>
                  <div className="detail-hero-meta">
                    <span className="badge badge-muted">Patrimonio líquido ahora mismo</span>
                  </div>
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-hero">
                  <div className="detail-hero-amount">{resumen.periodoActual.beneficio} €</div>
                  <div className="detail-hero-meta">
                    <span className="badge badge-muted">Beneficio del periodo</span>
                    <CrecimientoBadge actual={resumen.periodoActual.beneficio} anterior={resumen.periodoAnterior.beneficio} />
                  </div>
                </div>
              </div>
            </div>

            <div className="crud-header-row">
              <h2>Ventas del periodo</h2>
            </div>
            <div className="crud-card" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosVentas}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="nombre" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)} €`} />
                  <Legend />
                  <Bar dataKey="importe" name="Ventas" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="crud-header-row">
              <h2>Pendientes</h2>
            </div>
            <div className="crud-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <Link to="/gastos" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
                <div className="crud-card-row">
                  <div className="crud-card-info">
                    <div className="crud-card-title">Gastos pendientes de pago</div>
                    <div className="crud-card-meta">
                      <span>{resumen.gastosPendientes.count} gasto/s</span>
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <strong>{resumen.gastosPendientes.total} €</strong>
                  </div>
                </div>
              </Link>
              <Link to="/ventas/contratos" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
                <div className="crud-card-row">
                  <div className="crud-card-info">
                    <div className="crud-card-title">Cobros de contratos pendientes</div>
                    <div className="crud-card-meta">
                      <span>{resumen.cobrosPendientes.count} contrato/s</span>
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <strong>{resumen.cobrosPendientes.total} €</strong>
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}

        <div className="crud-header-row">
          <h2>Detalle</h2>
        </div>
        <div className="crud-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Link to="/analisis/plazas" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Por plaza</div>
                <div className="crud-card-meta">
                  <span>Beneficio, ingresos y gastos de cada plaza</span>
                </div>
              </div>
              <span className="crud-card-chevron" aria-hidden="true">
                ›
              </span>
            </div>
          </Link>
          <Link to="/analisis/activos" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Activos</div>
                <div className="crud-card-meta">
                  <span>Valor neto contable y amortización</span>
                </div>
              </div>
              <span className="crud-card-chevron" aria-hidden="true">
                ›
              </span>
            </div>
          </Link>
          <Link to="/analisis/flujo-caja" className="crud-card crud-card-title-link" style={{ display: 'block' }}>
            <div className="crud-card-row">
              <div className="crud-card-info">
                <div className="crud-card-title">Flujo de caja</div>
                <div className="crud-card-meta">
                  <span>Entradas y salidas por mes</span>
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
