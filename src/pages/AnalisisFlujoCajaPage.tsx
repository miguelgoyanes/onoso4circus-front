import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { obtenerFlujoCaja, type PuntoFlujoCaja } from '../api/analisis';
import { PeriodoSelector, periodoEsteAnio, type Periodo } from '../components/PeriodoSelector';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function AnalisisFlujoCajaPage() {
  const { accessToken, logout } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(periodoEsteAnio());
  const [puntos, setPuntos] = useState<PuntoFlujoCaja[] | null>(null);
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
    obtenerFlujoCaja(accessToken, periodo.desde, periodo.hasta).then(setPuntos).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, periodo]);

  const datosGrafico = (puntos ?? []).map((p) => ({
    periodo: p.periodo,
    Entradas: Number(p.entradas),
    Salidas: Number(p.salidas),
  }));

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Análisis', to: '/analisis' }, { label: 'Flujo de caja' }]} />
          <h1>Flujo de caja</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <PeriodoSelector periodo={periodo} onChange={setPeriodo} />

        {puntos && puntos.length > 0 && (
          <div className="crud-card" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)} €`} />
                <Legend />
                <Bar dataKey="Entradas" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Salidas" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="crud-list">
          {puntos === null && <p className="crud-empty">Cargando…</p>}
          {puntos?.length === 0 && <p className="crud-empty">No hay movimientos en este rango.</p>}
          {puntos?.map((p) => (
            <div key={p.periodo} className="crud-card">
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{p.periodo}</div>
                </div>
                <div className="crud-card-actions">
                  <span style={{ color: 'var(--color-success)' }}>+{p.entradas} €</span>
                  <span style={{ color: 'var(--color-danger)' }}>−{p.salidas} €</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
