import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { crearVentaBar } from '../api/bar';
import { listarProductos, type Producto } from '../api/stock';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import { obtenerFecha, obtenerPase, obtenerPlaza, type Fecha, type Pase, type Plaza } from '../api/plazas';
import { urlImagen } from '../components/ImagenPicker';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function BarRegistrarVentaPage() {
  const { paseId } = useParams<{ paseId: string }>();
  const { accessToken, logout } = useAuth();
  const [pase, setPase] = useState<Pase | null>(null);
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaPublica[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [paso, setPaso] = useState<'productos' | 'cuenta'>('productos');
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [cuentaCobroId, setCuentaCobroId] = useState('');
  const [guardando, setGuardando] = useState(false);

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
      if (!accessToken || !paseId) return;
      try {
        const [p, prods, cuentas] = await Promise.all([
          obtenerPase(accessToken, paseId),
          listarProductos(accessToken),
          listarCuentas(accessToken),
        ]);
        setPase(p);
        setProductos(prods);
        setCuentasDeDinero(cuentas.filter((c) => c.esCuentaDeDinero));
        const f = await obtenerFecha(accessToken, p.fechaId);
        setFecha(f);
        setPlaza(await obtenerPlaza(accessToken, f.plazaId));
      } catch (err) {
        handleApiError(err);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, paseId]);

  // La cuenta de cobro viene preseleccionada (la primera / 570001 si existe) — Brandon solo
  // tiene que cambiarla si de verdad hace falta, no elegirla cada vez.
  useEffect(() => {
    if (cuentaCobroId || cuentasDeDinero.length === 0) return;
    const porDefecto = cuentasDeDinero.find((c) => c.code === '570001') ?? cuentasDeDinero[0];
    setCuentaCobroId(porDefecto.id);
  }, [cuentasDeDinero, cuentaCobroId]);

  const productosActivos = productos.filter((p) => p.activo).sort((a, b) => a.orden - b.orden);

  function tocarProducto(id: string) {
    setCarrito((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function quitarUnidad(id: string) {
    setCarrito((prev) => {
      const next = { ...prev };
      if (next[id] <= 1) delete next[id];
      else next[id] -= 1;
      return next;
    });
  }

  const lineasCarrito = Object.entries(carrito)
    .map(([productoId, cantidad]) => ({ producto: productos.find((p) => p.id === productoId), productoId, cantidad }))
    .filter((l): l is { producto: Producto; productoId: string; cantidad: number } => !!l.producto);

  const total = lineasCarrito.reduce((sum, l) => sum + l.cantidad * Number(l.producto.precioVentaPublico), 0);

  function irACuenta() {
    if (lineasCarrito.length === 0) return;
    setPaso('cuenta');
  }

  async function handleConfirmar() {
    if (!accessToken || !paseId || !cuentaCobroId || lineasCarrito.length === 0) return;
    setError(null);
    setGuardando(true);
    try {
      await crearVentaBar(
        accessToken,
        paseId,
        cuentaCobroId,
        lineasCarrito.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      );
      setCarrito({});
      setPaso('productos');
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

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
              { label: fecha?.fecha ?? '…', to: fecha ? `/ventas/bar/fechas/${fecha.id}` : undefined },
              { label: pase ? `${pase.hora} ${pase.nombre ?? ''}`.trim() : '…', to: paseId ? `/ventas/bar/pases/${paseId}` : undefined },
              { label: 'Registrar venta' },
            ]}
          />
          <h1>Registrar venta</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="bar-total-bar">
          <span>Total</span>
          <span>{total.toFixed(2)} €</span>
        </div>

        {paso === 'productos' ? (
          <>
            {productosActivos.length === 0 && (
              <p className="crud-empty">No hay productos activos. Créalos primero en Stock.</p>
            )}
            <div className="bar-producto-grid">
              {productosActivos.map((producto) => {
                const imagen = urlImagen(producto.imagenUrl);
                const cantidadEnCarrito = carrito[producto.id] ?? 0;
                return (
                  <button
                    key={producto.id}
                    type="button"
                    className="bar-producto-tile"
                    onClick={() => tocarProducto(producto.id)}
                  >
                    {cantidadEnCarrito > 0 && <span className="bar-producto-tile-badge">{cantidadEnCarrito}</span>}
                    {imagen ? (
                      <img src={imagen} alt="" className="bar-producto-tile-img" />
                    ) : (
                      <span className="bar-producto-tile-placeholder">Sin imagen</span>
                    )}
                    <span className="bar-producto-tile-nombre">{producto.nombre}</span>
                  </button>
                );
              })}
            </div>

            <div className="crud-form-actions">
              <button type="button" className="crud-btn-primary" onClick={irACuenta} disabled={lineasCarrito.length === 0}>
                Siguiente
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="crud-header-row">
              <h2>Carrito</h2>
            </div>
            <div className="crud-form">
              {lineasCarrito.map((l) => (
                <div key={l.productoId} className="bar-carrito-linea">
                  <span>
                    {l.producto.nombre} × {l.cantidad}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <strong>{(l.cantidad * Number(l.producto.precioVentaPublico)).toFixed(2)} €</strong>
                    <button type="button" className="crud-delete-btn" onClick={() => quitarUnidad(l.productoId)}>
                      −
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="crud-header-row">
              <h2>Cuenta de cobro</h2>
            </div>
            <div className="bar-cuenta-grid">
              {cuentasDeDinero.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`bar-cuenta-btn${cuentaCobroId === c.id ? ' bar-cuenta-btn-selected' : ''}`}
                  onClick={() => setCuentaCobroId(c.id)}
                >
                  {c.nombre}
                </button>
              ))}
            </div>

            <div className="crud-form-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="crud-form-cancel" onClick={() => setPaso('productos')}>
                Volver
              </button>
              <button type="button" className="crud-btn-primary" onClick={handleConfirmar} disabled={!cuentaCobroId || guardando}>
                {guardando ? 'Registrando…' : 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
