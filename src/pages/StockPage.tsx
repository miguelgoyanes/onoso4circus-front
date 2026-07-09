import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearProducto,
  listarProductos,
  moverProducto,
  subirImagenProducto,
  type DireccionOrden,
  type Producto,
} from '../api/stock';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import { ImagenPicker, urlImagen } from '../components/ImagenPicker';
import '../styles/crud-page.css';

export function StockPage() {
  const { accessToken, logout } = useAuth();
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCrear, setShowCrear] = useState(false);
  const [nombre, setNombre] = useState('');
  const [precioVentaPublico, setPrecioVentaPublico] = useState('');
  const [aplicaIva, setAplicaIva] = useState(false);
  const [crearImagenFile, setCrearImagenFile] = useState<File | null>(null);
  const [crearImagenPreview, setCrearImagenPreview] = useState<string | null>(null);
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

  async function cargar() {
    if (!accessToken) return;
    try {
      setProductos(await listarProductos(accessToken));
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function abrirCrear() {
    setNombre('');
    setPrecioVentaPublico('');
    setAplicaIva(false);
    setCrearImagenFile(null);
    setCrearImagenPreview(null);
    setShowCrear(true);
  }

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setGuardando(true);
    try {
      const producto = await crearProducto(accessToken, {
        nombre,
        precioVentaPublico: Number(precioVentaPublico),
        aplicaIva,
      });
      if (crearImagenFile) {
        await subirImagenProducto(accessToken, producto.id, crearImagenFile);
      }
      setShowCrear(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function handleMover(id: string, direccion: DireccionOrden) {
    if (!accessToken) return;
    setError(null);
    try {
      setProductos(await moverProducto(accessToken, id, direccion));
    } catch (err) {
      handleApiError(err);
    }
  }

  // Valoración a precio medio ponderado: unidades × coste unitario actual de cada producto.
  const valoracionTotal = (productos ?? []).reduce(
    (total, p) => total + p.cantidadActual * Number(p.costeUnitarioActual),
    0,
  );

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Stock' }]} />
          <h1>Stock</h1>
          {productos && (
            <p>
              Valoración total del stock: <strong>{valoracionTotal.toFixed(2)} €</strong>
            </p>
          )}
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-toolbar">
          <button type="button" className="crud-btn-primary" onClick={abrirCrear}>
            Crear producto
          </button>
        </div>

        <Modal open={showCrear} onClose={() => setShowCrear(false)} title="Crear producto">
          <form className="crud-form" onSubmit={handleCrear}>
            <ImagenPicker
              previewUrl={crearImagenPreview}
              onSelect={(file) => {
                setCrearImagenFile(file);
                setCrearImagenPreview(URL.createObjectURL(file));
              }}
            />
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Precio de venta al público (€)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={precioVentaPublico}
                  onChange={(e) => setPrecioVentaPublico(e.target.value)}
                  required
                />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={aplicaIva} onChange={(e) => setAplicaIva(e.target.checked)} />
              <span>Admite IVA repercutido</span>
            </label>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowCrear(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardando}>
                {guardando ? 'Creando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        <div className="crud-list">
          {productos === null && <p className="crud-empty">Cargando…</p>}
          {productos?.length === 0 && <p className="crud-empty">No hay productos todavía.</p>}
          {productos?.map((producto, indice) => (
            <div key={producto.id} className="crud-card">
              <div className="crud-card-row">
                <div className="crud-card-orden">
                  <button
                    type="button"
                    className="crud-card-orden-btn"
                    disabled={indice === 0}
                    onClick={() => handleMover(producto.id, 'ARRIBA')}
                    aria-label="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="crud-card-orden-btn"
                    disabled={indice === productos.length - 1}
                    onClick={() => handleMover(producto.id, 'ABAJO')}
                    aria-label="Bajar"
                  >
                    ↓
                  </button>
                </div>
                {producto.imagenUrl ? (
                  <img src={urlImagen(producto.imagenUrl)!} alt="" className="crud-card-thumb" />
                ) : (
                  <div className="crud-card-thumb-placeholder" />
                )}
                <div className="crud-card-info">
                  <Link to={`/stock/${producto.id}`} className="crud-card-title crud-card-title-link">
                    {producto.nombre}
                  </Link>
                  <div className="crud-card-meta">
                    <span className="badge">{producto.cantidadActual} uds.</span>
                    <span>
                      valor{' '}
                      <strong>{(producto.cantidadActual * Number(producto.costeUnitarioActual)).toFixed(2)}</strong> €
                    </span>
                    <span>coste {producto.costeUnitarioActual} €</span>
                    <span>PVP {producto.precioVentaPublico} €</span>
                    {!producto.activo && <span className="badge badge-muted">INACTIVO</span>}
                  </div>
                </div>
                <span className="crud-card-chevron" aria-hidden="true">
                  ›
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
