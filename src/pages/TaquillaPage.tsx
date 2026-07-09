import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { listarVentasEntradas, type VentaEntradas } from '../api/taquilla';
import { listarFechas, listarPlazas, type Fecha, type Plaza } from '../api/plazas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

interface PlazaConStats {
  plaza: Plaza;
  cantidad: number;
  importe: number;
  fechaMasReciente: string | null;
}

export function TaquillaPage() {
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
        const [plazas, ventas] = await Promise.all([listarPlazas(accessToken), listarVentasEntradas(accessToken)]);
        const fechasPorPlaza = await Promise.all(plazas.map((p) => listarFechas(accessToken, p.id)));

        const stats: PlazaConStats[] = plazas.map((plaza, i) => {
          const fechasDePlaza: Fecha[] = fechasPorPlaza[i];
          const ventasDePlaza: VentaEntradas[] = ventas.filter((v) => v.plazaId === plaza.id);
          const fechaMasReciente = fechasDePlaza.reduce<string | null>(
            (max, f) => (max === null || f.fecha > max ? f.fecha : max),
            null,
          );
          return {
            plaza,
            cantidad: ventasDePlaza.reduce((sum, v) => sum + v.cantidad, 0),
            importe: ventasDePlaza.reduce((sum, v) => sum + v.cantidad * Number(v.precioUnitarioAplicado), 0),
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
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Ventas', to: '/ventas' }, { label: 'Taquilla' }]} />
          <div className="crud-header-row">
            <h1>Taquilla</h1>
            <Link to="/ventas/taquilla/tipos" className="crud-link-btn">
              ⚙ Tipos de entrada
            </Link>
          </div>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-list">
          {plazasConStats === null && <p className="crud-empty">Cargando…</p>}
          {plazasConStats?.length === 0 && <p className="crud-empty">No hay plazas todavía.</p>}
          {plazasConStats?.map(({ plaza, cantidad, importe }) => (
            <Link
              key={plaza.id}
              to={`/ventas/taquilla/plazas/${plaza.id}`}
              className="crud-card crud-card-title-link"
              style={{ display: 'block' }}
            >
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{plaza.nombre}</div>
                  <div className="crud-card-meta">
                    <span className="badge">{cantidad} entradas</span>
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
