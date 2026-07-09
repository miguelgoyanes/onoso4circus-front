import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { listarVentasBar, type VentaBar } from '../api/bar';
import { listarProductos, type Producto } from '../api/stock';
import { listarPases, obtenerFecha, obtenerPlaza, type Fecha, type Pase, type Plaza } from '../api/plazas';
import { calcularResumenBar, importePedido } from '../utils/resumenBar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

interface PaseConStats {
  pase: Pase;
  cantidadPedidos: number;
  importe: number;
}

export function BarFechaPage() {
  const { fechaId } = useParams<{ fechaId: string }>();
  const { accessToken, logout } = useAuth();
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [pedidos, setPedidos] = useState<VentaBar[] | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pasesConStats, setPasesConStats] = useState<PaseConStats[]>([]);
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
      if (!accessToken || !fechaId) return;
      try {
        const [f, pases, pedidosData, prods] = await Promise.all([
          obtenerFecha(accessToken, fechaId),
          listarPases(accessToken, fechaId),
          listarVentasBar(accessToken, { fechaId }),
          listarProductos(accessToken),
        ]);
        setFecha(f);
        setPlaza(await obtenerPlaza(accessToken, f.plazaId));
        setPedidos(pedidosData);
        setProductos(prods);

        const stats: PaseConStats[] = pases.map((pase) => {
          const pedidosDePase = pedidosData.filter((v) => v.paseId === pase.id);
          return {
            pase,
            cantidadPedidos: pedidosDePase.length,
            importe: pedidosDePase.reduce((sum, v) => sum + importePedido(v), 0),
          };
        });
        stats.sort((a, b) => a.pase.hora.localeCompare(b.pase.hora));
        setPasesConStats(stats);
      } catch (err) {
        handleApiError(err);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, fechaId]);

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
              { label: plaza?.nombre ?? '…', to: plaza ? `/ventas/bar/plazas/${plaza.id}` : undefined },
              { label: fecha?.fecha ?? '…' },
            ]}
          />
          <h1>{fecha?.fecha ?? 'Fecha'}</h1>
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
          <h2>Pases</h2>
        </div>

        <div className="crud-list">
          {pedidos === null && <p className="crud-empty">Cargando…</p>}
          {pasesConStats.length === 0 && pedidos !== null && <p className="crud-empty">No hay pases todavía.</p>}
          {pasesConStats.map(({ pase, cantidadPedidos, importe }) => (
            <Link
              key={pase.id}
              to={`/ventas/bar/pases/${pase.id}`}
              className="crud-card crud-card-title-link"
              style={{ display: 'block' }}
            >
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">
                    {pase.hora} {pase.nombre ?? ''}
                  </div>
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
