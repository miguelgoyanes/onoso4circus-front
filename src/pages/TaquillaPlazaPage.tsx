import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { listarTiposEntrada, listarVentasEntradas, type TipoEntrada, type VentaEntradas } from '../api/taquilla';
import { listarFechas, obtenerPlaza, type Fecha, type Plaza } from '../api/plazas';
import { calcularResumenVentas, importeVenta } from '../utils/resumenVentas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

interface FechaConStats {
  fecha: Fecha;
  cantidad: number;
  importe: number;
}

export function TaquillaPlazaPage() {
  const { plazaId } = useParams<{ plazaId: string }>();
  const { accessToken, logout } = useAuth();
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [ventas, setVentas] = useState<VentaEntradas[] | null>(null);
  const [tiposEntrada, setTiposEntrada] = useState<TipoEntrada[]>([]);
  const [fechasConStats, setFechasConStats] = useState<FechaConStats[]>([]);
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
      if (!accessToken || !plazaId) return;
      try {
        const [p, fechas, ventasData, tipos] = await Promise.all([
          obtenerPlaza(accessToken, plazaId),
          listarFechas(accessToken, plazaId),
          listarVentasEntradas(accessToken, { plazaId }),
          listarTiposEntrada(accessToken),
        ]);
        setPlaza(p);
        setVentas(ventasData);
        setTiposEntrada(tipos);

        const stats: FechaConStats[] = fechas.map((fecha) => {
          const ventasDeFecha = ventasData.filter((v) => v.fechaId === fecha.id);
          return {
            fecha,
            cantidad: ventasDeFecha.reduce((sum, v) => sum + v.cantidad, 0),
            importe: ventasDeFecha.reduce((sum, v) => sum + importeVenta(v), 0),
          };
        });
        stats.sort((a, b) => b.fecha.fecha.localeCompare(a.fecha.fecha));
        setFechasConStats(stats);
      } catch (err) {
        handleApiError(err);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, plazaId]);

  const resumen = ventas ? calcularResumenVentas(ventas, tiposEntrada) : null;

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Ventas', to: '/ventas' },
              { label: 'Taquilla', to: '/ventas/taquilla' },
              { label: plaza?.nombre ?? '…' },
            ]}
          />
          <h1>{plaza?.nombre ?? 'Plaza'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        {resumen && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{resumen.importe.toFixed(2)} €</div>
              <div className="detail-hero-meta">
                <span className="badge">{resumen.cantidad} entradas</span>
              </div>
            </div>
            {resumen.desglose.length > 0 && (
              <div className="detail-section">
                <p className="detail-section-title">Por tipo de entrada</p>
                <div className="detail-rows">
                  {resumen.desglose.map((d) => (
                    <div className="detail-row" key={d.tipoEntradaId}>
                      <span className="detail-label">
                        {d.nombre} × {d.cantidad}
                      </span>
                      <span className="detail-value">{d.importe.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="crud-header-row">
          <h2>Fechas</h2>
        </div>

        <div className="crud-list">
          {ventas === null && <p className="crud-empty">Cargando…</p>}
          {fechasConStats.length === 0 && ventas !== null && <p className="crud-empty">No hay fechas todavía.</p>}
          {fechasConStats.map(({ fecha, cantidad, importe }) => (
            <Link
              key={fecha.id}
              to={`/ventas/taquilla/fechas/${fecha.id}`}
              className="crud-card crud-card-title-link"
              style={{ display: 'block' }}
            >
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{fecha.fecha}</div>
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
