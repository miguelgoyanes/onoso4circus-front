import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { listarVentasBar, type VentaBar } from '../api/bar';
import { listarFechas, listarPlazas, type Fecha, type Plaza } from '../api/plazas';
import { importePedido } from '../utils/resumenBar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

interface PlazaConStats {
  plaza: Plaza;
  cantidadPedidos: number;
  importe: number;
  fechaMasReciente: string | null;
}

export function BarPage() {
  const { accessToken, logout } = useAuth();
  const [plazasConStats, setPlazasConStats] = useState<PlazaConStats[] | null>(null);
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
    async function cargar() {
      if (!accessToken) return;
      try {
        const [plazas, pedidos] = await Promise.all([listarPlazas(accessToken), listarVentasBar(accessToken)]);
        const fechasPorPlaza = await Promise.all(plazas.map((p) => listarFechas(accessToken, p.id)));

        const stats: PlazaConStats[] = plazas.map((plaza, i) => {
          const fechasDePlaza: Fecha[] = fechasPorPlaza[i];
          const pedidosDePlaza: VentaBar[] = pedidos.filter((v) => v.plazaId === plaza.id);
          const fechaMasReciente = fechasDePlaza.reduce<string | null>(
            (max, f) => (max === null || f.fecha > max ? f.fecha : max),
            null,
          );
          return {
            plaza,
            cantidadPedidos: pedidosDePlaza.length,
            importe: pedidosDePlaza.reduce((sum, v) => sum + importePedido(v), 0),
            fechaMasReciente,
          };
        });
        stats.sort((a, b) => (b.fechaMasReciente ?? '').localeCompare(a.fechaMasReciente ?? ''));
        setPlazasConStats(stats);
      } catch (err) {
        handleApiError(err);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Ventas', to: '/ventas' }, { label: 'Bar' }]} />
          <h1>Bar</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-list">
          {plazasConStats === null && <p className="crud-empty">Cargando…</p>}
          {plazasConStats?.length === 0 && <p className="crud-empty">No hay plazas todavía.</p>}
          {plazasConStats?.map(({ plaza, cantidadPedidos, importe }) => (
            <Link
              key={plaza.id}
              to={`/ventas/bar/plazas/${plaza.id}`}
              className="crud-card crud-card-title-link"
              style={{ display: 'block' }}
            >
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{plaza.nombre}</div>
                  <div className="crud-card-meta">
                    <span className="badge">{cantidadPedidos} pedidos</span>
                  </div>
                </div>
                <div className="crud-card-actions">
                  <strong>{importe.toFixed(2)} €</strong>
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
