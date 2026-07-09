import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  activarProducto,
  actualizarAjusteStock,
  actualizarProducto,
  actualizarRecepcionStock,
  crearAjusteStock,
  crearRecepcionStock,
  desactivarProducto,
  eliminarAjusteStock,
  eliminarProducto,
  eliminarRecepcionStock,
  listarAjustesStock,
  listarRecepcionesStock,
  obtenerProducto,
  subirImagenProducto,
  type AjusteStock,
  type Producto,
  type RecepcionStock,
  type TipoAjusteStock,
  type TipoFiscal,
} from '../api/stock';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import {
  construirHistorialStock,
  crearManejadoresRecepcion,
  datetimeLocalAhora,
  datetimeLocalDesdeIso,
  isoDesdeDatetimeLocal,
} from '../utils/stock';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import { ImagenPicker, urlImagen } from '../components/ImagenPicker';
import { CamposRecepcion } from '../components/CamposRecepcion';
import '../styles/crud-page.css';

const TIPOS_AJUSTE: TipoAjusteStock[] = ['CONSUMO_INTERNO', 'MERMA'];

export function StockDetailPage() {
  const { productoId } = useParams<{ productoId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cuentas, setCuentas] = useState<CuentaPublica[]>([]);
  const [recepciones, setRecepciones] = useState<RecepcionStock[]>([]);
  const [ajustes, setAjustes] = useState<AjusteStock[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editandoProducto, setEditandoProducto] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editAplicaIva, setEditAplicaIva] = useState(false);
  const [editImagenFile, setEditImagenFile] = useState<File | null>(null);
  const [editImagenPreview, setEditImagenPreview] = useState<string | null>(null);

  const [showRecepcion, setShowRecepcion] = useState(false);
  const [recCantidad, setRecCantidad] = useState('');
  const [recTipoFiscal, setRecTipoFiscal] = useState<TipoFiscal>('B');
  const [recIvaPercent, setRecIvaPercent] = useState('');
  const [recCosteUnitario, setRecCosteUnitario] = useState('');
  const [recCosteTotal, setRecCosteTotal] = useState('');
  const [recFecha, setRecFecha] = useState('');
  const [recCuentaOrigenId, setRecCuentaOrigenId] = useState('');

  const [editandoRecepcionId, setEditandoRecepcionId] = useState<string | null>(null);
  const [erCantidad, setErCantidad] = useState('');
  const [erTipoFiscal, setErTipoFiscal] = useState<TipoFiscal>('B');
  const [erIvaPercent, setErIvaPercent] = useState('');
  const [erCosteUnitario, setErCosteUnitario] = useState('');
  const [erCosteTotal, setErCosteTotal] = useState('');
  const [erFecha, setErFecha] = useState('');
  const [erCuentaOrigenId, setErCuentaOrigenId] = useState('');

  const [showAjuste, setShowAjuste] = useState(false);
  const [ajTipo, setAjTipo] = useState<TipoAjusteStock>('MERMA');
  const [ajCantidad, setAjCantidad] = useState('');
  const [ajFecha, setAjFecha] = useState('');

  const [editandoAjusteId, setEditandoAjusteId] = useState<string | null>(null);
  const [eaTipo, setEaTipo] = useState<TipoAjusteStock>('MERMA');
  const [eaCantidad, setEaCantidad] = useState('');
  const [eaFecha, setEaFecha] = useState('');

  const manejadoresRecepcion = crearManejadoresRecepcion(
    recCantidad, setRecCantidad,
    recTipoFiscal, setRecTipoFiscal,
    recIvaPercent, setRecIvaPercent,
    recCosteUnitario, setRecCosteUnitario,
    recCosteTotal, setRecCosteTotal,
  );
  const manejadoresEditarRecepcion = crearManejadoresRecepcion(
    erCantidad, setErCantidad,
    erTipoFiscal, setErTipoFiscal,
    erIvaPercent, setErIvaPercent,
    erCosteUnitario, setErCosteUnitario,
    erCosteTotal, setErCosteTotal,
  );

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
    if (!accessToken || !productoId) return;
    try {
      const [p, cuentasData, recepcionesData, ajustesData] = await Promise.all([
        obtenerProducto(accessToken, productoId),
        listarCuentas(accessToken),
        listarRecepcionesStock(accessToken, productoId),
        listarAjustesStock(accessToken, productoId),
      ]);
      setProducto(p);
      setCuentas(cuentasData);
      setRecepciones(recepcionesData);
      setAjustes(ajustesData);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, productoId]);

  // Producto
  function abrirEditarProducto() {
    if (!producto) return;
    setEditNombre(producto.nombre);
    setEditPrecio(producto.precioVentaPublico);
    setEditAplicaIva(producto.aplicaIva);
    setEditImagenFile(null);
    setEditImagenPreview(urlImagen(producto.imagenUrl));
    setEditandoProducto(true);
  }

  async function handleActualizarProducto(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !productoId) return;
    setError(null);
    try {
      await actualizarProducto(accessToken, productoId, {
        nombre: editNombre,
        precioVentaPublico: Number(editPrecio),
        aplicaIva: editAplicaIva,
      });
      if (editImagenFile) {
        await subirImagenProducto(accessToken, productoId, editImagenFile);
      }
      setEditandoProducto(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleDesactivar() {
    if (!accessToken || !productoId) return;
    setError(null);
    try {
      await desactivarProducto(accessToken, productoId);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleActivar() {
    if (!accessToken || !productoId) return;
    setError(null);
    try {
      await activarProducto(accessToken, productoId);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminarProducto() {
    if (!accessToken || !productoId) return;
    setError(null);
    try {
      await eliminarProducto(accessToken, productoId);
      navigate('/stock');
    } catch (err) {
      handleApiError(err);
    }
  }

  // Recepción — crear
  function abrirRecepcion() {
    setRecCantidad('');
    setRecTipoFiscal('B');
    setRecIvaPercent('');
    setRecCosteUnitario('');
    setRecCosteTotal('');
    setRecFecha(datetimeLocalAhora());
    const cuentaPorDefecto = cuentas.find((c) => c.activa);
    setRecCuentaOrigenId(cuentaPorDefecto?.id ?? '');
    setShowRecepcion(true);
  }

  async function handleCrearRecepcion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !productoId) return;
    setError(null);
    try {
      await crearRecepcionStock(accessToken, {
        productoId,
        cantidad: Number(recCantidad),
        fecha: isoDesdeDatetimeLocal(recFecha),
        cuentaOrigenId: recCuentaOrigenId,
        tipoFiscal: recTipoFiscal,
        costeUnitario: recTipoFiscal === 'B' ? Number(recCosteUnitario) : undefined,
        ivaPercent: recTipoFiscal === 'A' ? Number(recIvaPercent) : undefined,
        baseImponible: recTipoFiscal === 'A' ? Number(recCosteUnitario) * Number(recCantidad) : undefined,
      });
      setShowRecepcion(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  // Recepción — editar
  function abrirEditarRecepcion(r: RecepcionStock) {
    setEditandoRecepcionId(r.id);
    setErCantidad(String(r.cantidad));
    setErTipoFiscal(r.tipoFiscal ?? 'B');
    setErIvaPercent(r.ivaPercent ?? '');
    setErCosteUnitario(r.costeUnitario);
    setErCosteTotal(r.importeTotal);
    setErFecha(datetimeLocalDesdeIso(r.fecha));
    setErCuentaOrigenId(r.cuentaOrigenId);
  }

  async function handleActualizarRecepcion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !editandoRecepcionId) return;
    setError(null);
    try {
      await actualizarRecepcionStock(accessToken, editandoRecepcionId, {
        cantidad: Number(erCantidad),
        fecha: isoDesdeDatetimeLocal(erFecha),
        cuentaOrigenId: erCuentaOrigenId,
        tipoFiscal: erTipoFiscal,
        costeUnitario: erTipoFiscal === 'B' ? Number(erCosteUnitario) : undefined,
        ivaPercent: erTipoFiscal === 'A' ? Number(erIvaPercent) : undefined,
        baseImponible: erTipoFiscal === 'A' ? Number(erCosteUnitario) * Number(erCantidad) : undefined,
      });
      setEditandoRecepcionId(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminarRecepcion(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarRecepcionStock(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  // Ajuste — crear
  function abrirAjuste() {
    setAjTipo('MERMA');
    setAjCantidad('');
    setAjFecha(datetimeLocalAhora());
    setShowAjuste(true);
  }

  async function handleCrearAjuste(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !productoId) return;
    setError(null);
    try {
      await crearAjusteStock(accessToken, {
        productoId,
        tipo: ajTipo,
        cantidad: Number(ajCantidad),
        fecha: isoDesdeDatetimeLocal(ajFecha),
      });
      setShowAjuste(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  // Ajuste — editar
  function abrirEditarAjuste(a: AjusteStock) {
    setEditandoAjusteId(a.id);
    setEaTipo(a.tipo);
    setEaCantidad(String(a.cantidad));
    setEaFecha(datetimeLocalDesdeIso(a.fecha));
  }

  async function handleActualizarAjuste(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !editandoAjusteId) return;
    setError(null);
    try {
      await actualizarAjusteStock(accessToken, editandoAjusteId, {
        tipo: eaTipo,
        cantidad: Number(eaCantidad),
        fecha: isoDesdeDatetimeLocal(eaFecha),
      });
      setEditandoAjusteId(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminarAjuste(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarAjusteStock(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  const cuentasDeDinero = cuentas.filter((c) => c.activa);
  const historial = construirHistorialStock(recepciones, ajustes);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Stock', to: '/stock' },
              { label: producto?.nombre ?? '…' },
            ]}
          />
          <h1>{producto?.nombre ?? 'Producto'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        {producto && (
          <div className="detail-card">
            <div className="detail-hero">
              {urlImagen(producto.imagenUrl) && (
                <img
                  src={urlImagen(producto.imagenUrl)!}
                  alt=""
                  style={{ width: 96, height: 96, borderRadius: 'var(--radius)', objectFit: 'cover', margin: '0 auto var(--space-3)' }}
                />
              )}
              <div className="detail-hero-amount">{producto.cantidadActual} uds.</div>
              <p style={{ margin: '0 0 var(--space-2)', color: 'var(--color-text-muted)' }}>
                valor <strong>{(producto.cantidadActual * Number(producto.costeUnitarioActual)).toFixed(2)}</strong> €
              </p>
              <div className="detail-hero-meta">
                <span>coste {producto.costeUnitarioActual} €</span>
                <span>PVP {producto.precioVentaPublico} €</span>
                {producto.aplicaIva && <span className="badge badge-muted">IVA</span>}
                <span className={producto.activo ? 'badge badge-success' : 'badge badge-danger'}>
                  {producto.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            <div className="detail-footer">
              <button type="button" className="crud-link-btn" onClick={abrirRecepcion}>
                Recepción
              </button>
              <button type="button" className="crud-link-btn" onClick={abrirAjuste}>
                Ajuste
              </button>
              <button type="button" className="crud-link-btn" onClick={abrirEditarProducto}>
                Editar
              </button>
              {producto.activo ? (
                <button type="button" className="crud-delete-btn" onClick={handleDesactivar}>
                  Desactivar
                </button>
              ) : (
                <>
                  <button type="button" className="crud-link-btn" onClick={handleActivar}>
                    Reactivar
                  </button>
                  <button type="button" className="crud-delete-btn" onClick={handleEliminarProducto}>
                    Eliminar
                  </button>
                </>
              )}
            </div>

            <div className="detail-section">
              <p className="detail-section-title">Historial de stock</p>
              {historial.length === 0 && <p className="crud-empty">Sin movimientos todavía.</p>}
              <div className="crud-list">
                {historial.map((evento) => (
                  <div key={evento.id} className="crud-card">
                    <div className="crud-card-row">
                      <div className="crud-card-info">
                        <div className="crud-card-title">
                          {new Date(evento.fecha).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="crud-card-meta">
                          <span className={evento.esEntrada ? 'badge badge-success' : 'badge badge-danger'}>
                            {evento.esEntrada ? 'Entrada' : 'Salida'}
                          </span>
                          <span className="badge badge-muted">{evento.tipoLabel}</span>
                          <span>
                            {evento.esEntrada ? '+' : '−'}
                            {evento.cantidad} uds. · {evento.costeAplicado} €/ud.
                          </span>
                        </div>
                        <div className="crud-card-meta" style={{ marginTop: 'var(--space-1)' }}>
                          <span>
                            saldo <strong>{evento.saldoCantidad}</strong> uds.
                          </span>
                          <span>
                            coste medio <strong>{evento.costeMedio}</strong> €/ud.
                          </span>
                          <span>
                            valor <strong>{evento.valorTotal}</strong> €
                          </span>
                        </div>
                      </div>
                      <div className="crud-card-actions">
                        <button
                          type="button"
                          className="crud-link-btn"
                          onClick={() =>
                            evento.esEntrada
                              ? abrirEditarRecepcion(evento.origen as RecepcionStock)
                              : abrirEditarAjuste(evento.origen as AjusteStock)
                          }
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="crud-delete-btn"
                          onClick={() =>
                            evento.esEntrada ? handleEliminarRecepcion(evento.id) : handleEliminarAjuste(evento.id)
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Modal open={editandoProducto} onClose={() => setEditandoProducto(false)} title="Editar producto">
          <form className="crud-form" onSubmit={handleActualizarProducto}>
            <ImagenPicker
              previewUrl={editImagenPreview}
              onSelect={(file) => {
                setEditImagenFile(file);
                setEditImagenPreview(URL.createObjectURL(file));
              }}
            />
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Precio de venta al público (€)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editPrecio}
                  onChange={(e) => setEditPrecio(e.target.value)}
                  required
                />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={editAplicaIva} onChange={(e) => setEditAplicaIva(e.target.checked)} />
              <span>Admite IVA repercutido</span>
            </label>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setEditandoProducto(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showRecepcion} onClose={() => setShowRecepcion(false)} title="Recepción de stock">
          <form className="crud-form" onSubmit={handleCrearRecepcion}>
            <CamposRecepcion
              cantidad={recCantidad}
              tipoFiscal={recTipoFiscal}
              ivaPercent={recIvaPercent}
              costeUnitario={recCosteUnitario}
              costeTotal={recCosteTotal}
              manejadores={manejadoresRecepcion}
            />
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha y hora</span>
                <input
                  type="datetime-local"
                  value={recFecha}
                  onChange={(e) => setRecFecha(e.target.value)}
                  required
                />
              </label>
              <label className="crud-field">
                <span>Pagado desde</span>
                <select value={recCuentaOrigenId} onChange={(e) => setRecCuentaOrigenId(e.target.value)} required>
                  <option value="">Cuenta…</option>
                  {cuentasDeDinero.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowRecepcion(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Registrar
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={editandoRecepcionId !== null}
          onClose={() => setEditandoRecepcionId(null)}
          title="Editar recepción de stock"
        >
          <form className="crud-form" onSubmit={handleActualizarRecepcion}>
            <CamposRecepcion
              cantidad={erCantidad}
              tipoFiscal={erTipoFiscal}
              ivaPercent={erIvaPercent}
              costeUnitario={erCosteUnitario}
              costeTotal={erCosteTotal}
              manejadores={manejadoresEditarRecepcion}
            />
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha y hora</span>
                <input
                  type="datetime-local"
                  value={erFecha}
                  onChange={(e) => setErFecha(e.target.value)}
                  required
                />
              </label>
              <label className="crud-field">
                <span>Pagado desde</span>
                <select value={erCuentaOrigenId} onChange={(e) => setErCuentaOrigenId(e.target.value)} required>
                  <option value="">Cuenta…</option>
                  {cuentasDeDinero.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setEditandoRecepcionId(null)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showAjuste} onClose={() => setShowAjuste(false)} title="Ajuste de stock">
          <form className="crud-form" onSubmit={handleCrearAjuste}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Tipo</span>
                <select value={ajTipo} onChange={(e) => setAjTipo(e.target.value as TipoAjusteStock)}>
                  {TIPOS_AJUSTE.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>Cantidad</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={ajCantidad}
                  onChange={(e) => setAjCantidad(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha y hora</span>
                <input
                  type="datetime-local"
                  value={ajFecha}
                  onChange={(e) => setAjFecha(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowAjuste(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Registrar
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={editandoAjusteId !== null} onClose={() => setEditandoAjusteId(null)} title="Editar ajuste de stock">
          <form className="crud-form" onSubmit={handleActualizarAjuste}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Tipo</span>
                <select value={eaTipo} onChange={(e) => setEaTipo(e.target.value as TipoAjusteStock)}>
                  {TIPOS_AJUSTE.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>Cantidad</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={eaCantidad}
                  onChange={(e) => setEaCantidad(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha y hora</span>
                <input
                  type="datetime-local"
                  value={eaFecha}
                  onChange={(e) => setEaFecha(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setEditandoAjusteId(null)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
