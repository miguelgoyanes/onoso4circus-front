import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { listarVentasBar, type VentaBar } from '../api/bar';
import { listarProductos, type Producto } from '../api/stock';
import { listarFechas, obtenerPlaza, type Fecha, type Plaza } from '../api/plazas';
import { calcularResumenBar, importePedido } from '../utils/resumenBar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

interface FechaConStats {
  fecha: Fecha;
  cantidadPedidos: number;
  importe: number;
}

export function BarPlazaPage() {
  const { plazaId } = useParams<{ plazaId: string }>();
  const { accessToken, logout } = useAuth();
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [pedidos, setPedidos] = useState<VentaBar[] | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
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
        const [p, fechas, pedidosData, prods] = await Promise.all([
          obtenerPlaza(accessToken, plazaId),
          listarFechas(accessToken, plazaId),
          listarVentasBar(accessToken, { plazaId }),
          listarProductos(accessToken),
        ]);
        setPlaza(p);
        setPedidos(pedidosData);
        setProductos(prods);

        const stats: FechaConStats[] = fechas.map((fecha) => {
          const pedidosDeFecha = pedidosData.filter((v) => v.fechaId === fecha.id);
          return {
            fecha,
            cantidadPedidos: pedidosDeFecha.length,
            importe: pedidosDeFecha.reduce((sum, v) => sum + importePedido(v), 0),
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

  const resumen = pedidos ? calcularResumenBar(pedidos, productos) : null;

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Ventas', to: '/ventas' },
              { label: 'Bar', to: '/ventas/bar' },
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
                <span className="badge">{resumen.cantidad} unidades</span>
              </div>
            </div>
            {resumen.desglose.length > 0 && (
              <div className="detail-section">
                <p className="detail-section-title">Por producto</p>
                <div className="detail-rows">
                  {resumen.desglose.map((d) => (
                    <div className="detail-row" key={d.productoId}>
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
          {pedidos === null && <p className="crud-empty">Cargando…</p>}
          {fechasConStats.length === 0 && pedidos !== null && <p className="crud-empty">No hay fechas todavía.</p>}
          {fechasConStats.map(({ fecha, cantidadPedidos, importe }) => (
            <Link
              key={fecha.id}
              to={`/ventas/bar/fechas/${fecha.id}`}
              className="crud-card crud-card-title-link"
              style={{ display: 'block' }}
            >
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{fecha.fecha}</div>
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
