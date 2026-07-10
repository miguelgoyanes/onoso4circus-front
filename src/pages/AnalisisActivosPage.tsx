import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { obtenerResumenActivos, type ResumenActivos } from '../api/analisis';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

const COLORES = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ef4444', '#14b8a6', '#eab308'];

export function AnalisisActivosPage() {
  const { accessToken, logout } = useAuth();
  const [resumen, setResumen] = useState<ResumenActivos | null>(null);
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
    obtenerResumenActivos(accessToken).then(setResumen).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const datosGrafico = (resumen?.porCategoria ?? [])
    .map((c) => ({ nombre: c.categoriaNombre, valor: Number(c.valorNetoContable) }))
    .filter((c) => c.valor > 0);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Análisis', to: '/analisis' }, { label: 'Activos' }]} />
          <h1>Activos</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        {resumen && (
          <>
            <div className="crud-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div className="detail-card">
                <div className="detail-hero">
                  <div className="detail-hero-amount">{resumen.valorNetoContableTotal} €</div>
                  <div className="detail-hero-meta">
                    <span className="badge badge-muted">Valor neto contable total</span>
                  </div>
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-hero">
                  <div className="detail-hero-amount">{resumen.amortizacionAcumuladaTotal} €</div>
                  <div className="detail-hero-meta">
                    <span className="badge badge-muted">Amortización acumulada</span>
                  </div>
                </div>
              </div>
            </div>

            {datosGrafico.length > 0 && (
              <div className="crud-card" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosGrafico}
                      dataKey="valor"
                      nameKey="nombre"
                      outerRadius={100}
                      label={(props: unknown) => (props as { nombre: string }).nombre}
                    >
                      {datosGrafico.map((_entry, i) => (
                        <Cell key={i} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)} €`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="crud-header-row">
              <h2>Por categoría</h2>
            </div>
            <div className="crud-list">
              {resumen.porCategoria.length === 0 && <p className="crud-empty">No hay activos todavía.</p>}
              {resumen.porCategoria.map((c) => (
                <div key={c.categoriaNombre} className="crud-card">
                  <div className="crud-card-row">
                    <div className="crud-card-info">
                      <div className="crud-card-title">{c.categoriaNombre}</div>
                      <div className="crud-card-meta">
                        <span>Amortización acumulada: {c.amortizacionAcumulada} €</span>
                      </div>
                    </div>
                    <div className="crud-card-actions">
                      <strong>{c.valorNetoContable} €</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
