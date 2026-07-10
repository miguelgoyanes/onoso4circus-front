import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { listarResumenPlazas, type ResumenPlaza } from '../api/analisis';
import { PeriodoSelector, periodoEsteMes, type Periodo } from '../components/PeriodoSelector';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function AnalisisPlazasPage() {
  const { accessToken, logout } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(periodoEsteMes());
  const [plazas, setPlazas] = useState<ResumenPlaza[] | null>(null);
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
    listarResumenPlazas(accessToken, periodo.desde, periodo.hasta).then(setPlazas).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, periodo]);

  const datosGrafico = (plazas ?? []).map((p) => ({ nombre: p.plazaNombre, beneficio: Number(p.beneficio) }));

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Análisis', to: '/analisis' }, { label: 'Por plaza' }]} />
          <h1>Beneficio por plaza</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <PeriodoSelector periodo={periodo} onChange={setPeriodo} />

        {plazas && plazas.length > 0 && (
          <div className="crud-card" style={{ height: Math.max(200, plazas.length * 50) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafico} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="nombre" width={140} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)} €`} />
                <Bar dataKey="beneficio" name="Beneficio" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="crud-list">
          {plazas === null && <p className="crud-empty">Cargando…</p>}
          {plazas?.length === 0 && <p className="crud-empty">No hay plazas todavía.</p>}
          {plazas?.map((p) => (
            <Link key={p.plazaId} to={`/analisis/plazas/${p.plazaId}`} className="crud-card crud-card-title-link" style={{ display: 'block' }}>
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{p.plazaNombre}</div>
                  <div className="crud-card-meta">
                    <span>Ingresos: {p.ingresos} €</span>
                    <span>Gastos: {p.gastos} €</span>
                  </div>
                </div>
                <div className="crud-card-actions">
                  <strong>{p.beneficio} €</strong>
                </div>
                <span className="crud-card-chevron" aria-hidden="true">
                  ›
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
