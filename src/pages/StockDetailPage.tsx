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
  iniciarUsoLote,
  listarAjustesStock,
  listarRecepcionesStock,
  obtenerProducto,
  subirImagenProducto,
  type AjusteStock,
  type Producto,
  type RecepcionStock,
  type TipoAjusteStock,
  type TipoFiscal,
  type UnidadMedida,
} from '../api/stock';
import { obtenerCosteElaborado } from '../api/bar';
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
const UNIDADES_MEDIDA: UnidadMedida[] = ['KG', 'GRAMOS', 'LITROS', 'MILILITROS', 'UNIDADES'];
const ETIQUETA_ESTADO_LOTE: Record<string, string> = {
  POR_CONSUMIR: 'Por consumir',
  CONSUMIENDO: 'Consumiéndose',
  CONSUMIDO: 'Consumido',
};

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
  const [recCantidadMedida, setRecCantidadMedida] = useState('');
  const [recUnidadMedida, setRecUnidadMedida] = useState<UnidadMedida>('KG');

  const [editandoRecepcionId, setEditandoRecepcionId] = useState<string | null>(null);
  const [erCantidad, setErCantidad] = useState('');
  const [erTipoFiscal, setErTipoFiscal] = useState<TipoFiscal>('B');
  const [erIvaPercent, setErIvaPercent] = useState('');
  const [erCosteUnitario, setErCosteUnitario] = useState('');
  const [erCosteTotal, setErCosteTotal] = useState('');
  const [erFecha, setErFecha] = useState('');
  const [erCuentaOrigenId, setErCuentaOrigenId] = useState('');
  const [erCantidadMedida, setErCantidadMedida] = useState('');
  const [erUnidadMedida, setErUnidadMedida] = useState<UnidadMedida>('KG');

  // Ciclo de uso de un lote de INSUMO — única acción manual, con fecha seleccionable.
  const [abriendoLoteId, setAbriendoLoteId] = useState<string | null>(null);
  const [abrirLoteFecha, setAbrirLoteFecha] = useState('');

  // Coste calculado de un ELABORADO (no se guarda, se pide al backend bajo demanda).
  const [costeElaborado, setCosteElaborado] = useState<string | null>(null);

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
      if (p.tipo === 'ELABORADO') {
        const { costeUnitarioActual } = await obtenerCosteElaborado(accessToken, productoId);
        setCosteElaborado(costeUnitarioActual);
      } else {
        setCosteElaborado(null);
      }
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
        precioVentaPublico: producto?.tipo === 'INSUMO' ? undefined : Number(editPrecio),
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
    const esInsumo = producto?.tipo === 'INSUMO';
    setRecCantidad(esInsumo ? '1' : '');
    setRecTipoFiscal('B');
    setRecIvaPercent('');
    setRecCosteUnitario('');
    setRecCosteTotal('');
    setRecFecha(datetimeLocalAhora());
    setRecCantidadMedida('');
    setRecUnidadMedida('KG');
    const cuentaPorDefecto = cuentas.find((c) => c.activa);
    setRecCuentaOrigenId(cuentaPorDefecto?.id ?? '');
    setShowRecepcion(true);
  }

  async function handleCrearRecepcion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !productoId) return;
    const esInsumo = producto?.tipo === 'INSUMO';
    const cantidad = esInsumo ? 1 : Number(recCantidad);
    setError(null);
    try {
      await crearRecepcionStock(accessToken, {
        productoId,
        cantidad,
        fecha: isoDesdeDatetimeLocal(recFecha),
        cuentaOrigenId: recCuentaOrigenId,
        tipoFiscal: recTipoFiscal,
        costeUnitario: recTipoFiscal === 'B' ? Number(recCosteUnitario) : undefined,
        ivaPercent: recTipoFiscal === 'A' ? Number(recIvaPercent) : undefined,
        baseImponible: recTipoFiscal === 'A' ? Number(recCosteUnitario) * cantidad : undefined,
        cantidadMedida: esInsumo && recCantidadMedida ? Number(recCantidadMedida) : undefined,
        unidadMedida: esInsumo ? recUnidadMedida : undefined,
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
    setErCantidadMedida(r.cantidadMedida ?? '');
    setErUnidadMedida(r.unidadMedida ?? 'KG');
  }

  async function handleActualizarRecepcion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !editandoRecepcionId) return;
    const esInsumo = producto?.tipo === 'INSUMO';
    const cantidad = esInsumo ? 1 : Number(erCantidad);
    setError(null);
    try {
      await actualizarRecepcionStock(accessToken, editandoRecepcionId, {
        cantidad,
        fecha: isoDesdeDatetimeLocal(erFecha),
        cuentaOrigenId: erCuentaOrigenId,
        tipoFiscal: erTipoFiscal,
        costeUnitario: erTipoFiscal === 'B' ? Number(erCosteUnitario) : undefined,
        ivaPercent: erTipoFiscal === 'A' ? Number(erIvaPercent) : undefined,
        baseImponible: erTipoFiscal === 'A' ? Number(erCosteUnitario) * cantidad : undefined,
        cantidadMedida: esInsumo && erCantidadMedida ? Number(erCantidadMedida) : undefined,
        unidadMedida: esInsumo ? erUnidadMedida : undefined,
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

  // Lote de INSUMO — iniciar uso (única acción manual, fecha seleccionable)
  function abrirIniciarUso(loteId: string) {
    setAbriendoLoteId(loteId);
    setAbrirLoteFecha(datetimeLocalAhora());
  }

  async function handleIniciarUso(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !abriendoLoteId) return;
    setError(null);
    try {
      await iniciarUsoLote(accessToken, abriendoLoteId, isoDesdeDatetimeLocal(abrirLoteFecha));
      setAbriendoLoteId(null);
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
              {producto.tipo === 'VENTA_DIRECTA' && (
                <>
                  <div className="detail-hero-amount">{producto.cantidadActual} uds.</div>
                  <p style={{ margin: '0 0 var(--space-2)', color: 'var(--color-text-muted)' }}>
                    valor <strong>{(producto.cantidadActual * Number(producto.costeUnitarioActual)).toFixed(2)}</strong> €
                  </p>
                </>
              )}
              {producto.tipo === 'INSUMO' && (
                <div className="detail-hero-amount">{recepciones.length} lote{recepciones.length === 1 ? '' : 's'}</div>
              )}
              {producto.tipo === 'ELABORADO' && (
                <>
                  <div className="detail-hero-amount">{costeElaborado ?? '…'} €</div>
                  <p style={{ margin: '0 0 var(--space-2)', color: 'var(--color-text-muted)' }}>
                    coste aproximado — media histórica de lotes de insumo ya cerrados
                  </p>
                </>
              )}
              <div className="detail-hero-meta">
                {producto.tipo === 'VENTA_DIRECTA' && <span>coste {producto.costeUnitarioActual} €</span>}
                {producto.tipo === 'ELABORADO' && <span>factor {producto.factorEquivalencia}</span>}
                {producto.tipo !== 'INSUMO' && <span>PVP {producto.precioVentaPublico} €</span>}
                {producto.aplicaIva && <span className="badge badge-muted">IVA</span>}
                <span className={producto.activo ? 'badge badge-success' : 'badge badge-danger'}>
                  {producto.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            <div className="detail-footer">
              {producto.tipo !== 'ELABORADO' && (
                <button type="button" className="crud-link-btn" onClick={abrirRecepcion}>
                  {producto.tipo === 'INSUMO' ? 'Nuevo lote' : 'Recepción'}
                </button>
              )}
              {producto.tipo === 'VENTA_DIRECTA' && (
                <button type="button" className="crud-link-btn" onClick={abrirAjuste}>
                  Ajuste
                </button>
              )}
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

            {producto.tipo === 'INSUMO' && (
              <div className="detail-section">
                <p className="detail-section-title">Lotes</p>
                {recepciones.length === 0 && <p className="crud-empty">Sin lotes todavía.</p>}
                <div className="crud-list">
                  {recepciones.map((lote) => (
                    <div key={lote.id} className="crud-card">
                      <div className="crud-card-row">
                        <div className="crud-card-info">
                          <div className="crud-card-title">
                            {lote.cantidadMedida ? `${lote.cantidadMedida} ${lote.unidadMedida ?? ''}` : 'Lote'} —{' '}
                            {lote.baseImponible} €
                          </div>
                          <div className="crud-card-meta">
                            <span
                              className={
                                lote.estadoLote === 'CONSUMIENDO'
                                  ? 'badge badge-success'
                                  : lote.estadoLote === 'CONSUMIDO'
                                    ? 'badge badge-muted'
                                    : 'badge'
                              }
                            >
                              {ETIQUETA_ESTADO_LOTE[lote.estadoLote ?? 'POR_CONSUMIR']}
                            </span>
                            <span>comprado {new Date(lote.fecha).toLocaleDateString()}</span>
                            {lote.fechaInicioUso && (
                              <span>en uso desde {new Date(lote.fechaInicioUso).toLocaleDateString()}</span>
                            )}
                            {lote.cerrado && <span className="badge badge-muted">Coste ya asentado</span>}
                          </div>
                        </div>
                        <div className="crud-card-actions">
                          {lote.estadoLote === 'POR_CONSUMIR' && (
                            <button type="button" className="crud-link-btn" onClick={() => abrirIniciarUso(lote.id)}>
                              Empezar a consumir
                            </button>
                          )}
                          {!lote.cerrado && (
                            <>
                              <button type="button" className="crud-link-btn" onClick={() => abrirEditarRecepcion(lote)}>
                                Editar
                              </button>
                              <button type="button" className="crud-delete-btn" onClick={() => handleEliminarRecepcion(lote.id)}>
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {producto.tipo === 'VENTA_DIRECTA' && (
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
            )}
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
              {producto?.tipo !== 'INSUMO' && (
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
              )}
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

        <Modal
          open={showRecepcion}
          onClose={() => setShowRecepcion(false)}
          title={producto?.tipo === 'INSUMO' ? 'Nuevo lote' : 'Recepción de stock'}
        >
          <form className="crud-form" onSubmit={handleCrearRecepcion}>
            <CamposRecepcion
              cantidad={recCantidad}
              tipoFiscal={recTipoFiscal}
              ivaPercent={recIvaPercent}
              costeUnitario={recCosteUnitario}
              costeTotal={recCosteTotal}
              manejadores={manejadoresRecepcion}
              mostrarCantidad={producto?.tipo !== 'INSUMO'}
            />
            {producto?.tipo === 'INSUMO' && (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Cantidad física comprada (informativo)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={recCantidadMedida}
                    onChange={(e) => setRecCantidadMedida(e.target.value)}
                  />
                </label>
                <label className="crud-field">
                  <span>Unidad</span>
                  <select value={recUnidadMedida} onChange={(e) => setRecUnidadMedida(e.target.value as UnidadMedida)}>
                    {UNIDADES_MEDIDA.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
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

        <Modal open={abriendoLoteId !== null} onClose={() => setAbriendoLoteId(null)} title="Empezar a consumir este lote">
          <form className="crud-form" onSubmit={handleIniciarUso}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha y hora en que se abrió</span>
                <input
                  type="datetime-local"
                  value={abrirLoteFecha}
                  onChange={(e) => setAbrirLoteFecha(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setAbriendoLoteId(null)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Confirmar
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
              mostrarCantidad={producto?.tipo !== 'INSUMO'}
            />
            {producto?.tipo === 'INSUMO' && (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Cantidad física comprada (informativo)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={erCantidadMedida}
                    onChange={(e) => setErCantidadMedida(e.target.value)}
                  />
                </label>
                <label className="crud-field">
                  <span>Unidad</span>
                  <select value={erUnidadMedida} onChange={(e) => setErUnidadMedida(e.target.value as UnidadMedida)}>
                    {UNIDADES_MEDIDA.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
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
