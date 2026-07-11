import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { tieneRol } from '../auth/roles';
import { ApiError } from '../api/client';
import {
  actualizarVentaBar,
  crearVentaBar,
  eliminarVentaBar,
  listarVentasBar,
  reclasificarLoteVentasBar,
  type TipoFiscal,
  type VentaBar,
} from '../api/bar';
import { listarProductosVenta, type ProductoVenta } from '../api/stock';
import { listarCuentasCobro, type CuentaCobro } from '../api/tesoreria';
import { obtenerFecha, obtenerPase, obtenerPlaza, type Fecha, type Pase, type Plaza } from '../api/plazas';
import { importePedido } from '../utils/resumenBar';
import { calcularBaseDesdeTotal } from '../utils/iva';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

interface LineaEditForm {
  productoId: string;
  cantidad: string;
}

export function BarPasePage() {
  const { paseId } = useParams<{ paseId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout, user } = useAuth();
  const esAdmin = tieneRol(user?.rol ?? '', 'ADMIN');
  const [pase, setPase] = useState<Pase | null>(null);
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [pedidos, setPedidos] = useState<VentaBar[] | null>(null);
  const [productos, setProductos] = useState<ProductoVenta[]>([]);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaCobro[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [showReclasificar, setShowReclasificar] = useState(false);
  const [reclasificarTipo, setReclasificarTipo] = useState<TipoFiscal>('B');
  const [reclasificarPercent, setReclasificarPercent] = useState('21');

  const [editandoPedido, setEditandoPedido] = useState<VentaBar | null>(null);
  const [editCuentaCobroId, setEditCuentaCobroId] = useState('');
  const [editLineas, setEditLineas] = useState<LineaEditForm[]>([]);

  // Registro manual (modal completo, para ventas de este mismo pase que se olvidaron en su
  // momento — a diferencia del flujo táctil rápido, aquí el IVA se clasifica directamente al
  // crear, en vez de dejarlo para reclasificar después. El pase es siempre el de esta página.
  const [showRegistrarManual, setShowRegistrarManual] = useState(false);
  const [manualLineas, setManualLineas] = useState<LineaEditForm[]>([]);
  const [manualCuentaCobroId, setManualCuentaCobroId] = useState('');
  const [manualTipoFiscal, setManualTipoFiscal] = useState<TipoFiscal>('B');
  const [manualIvaPercent, setManualIvaPercent] = useState('21');
  const [guardandoManual, setGuardandoManual] = useState(false);

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
    if (!accessToken || !paseId) return;
    try {
      const [p, prods, cuentas, pedidosData] = await Promise.all([
        obtenerPase(accessToken, paseId),
        listarProductosVenta(accessToken),
        listarCuentasCobro(accessToken),
        listarVentasBar(accessToken, { paseId }),
      ]);
      setPase(p);
      setProductos(prods);
      setCuentasDeDinero(cuentas.filter((c) => c.usableEnBar));
      setPedidos(pedidosData);
      const f = await obtenerFecha(accessToken, p.fechaId);
      setFecha(f);
      setPlaza(await obtenerPlaza(accessToken, f.plazaId));
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    setSeleccionados(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, paseId]);

  function toggleSeleccionado(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleReclasificar() {
    if (!accessToken || seleccionados.size === 0) return;
    setError(null);
    try {
      await reclasificarLoteVentasBar(
        accessToken,
        [...seleccionados],
        reclasificarTipo,
        reclasificarTipo === 'A' ? Number(reclasificarPercent) : undefined,
      );
      setShowReclasificar(false);
      setSeleccionados(new Set());
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  function abrirEdicion(pedido: VentaBar) {
    setEditandoPedido(pedido);
    setEditCuentaCobroId(pedido.cuentaCobroId);
    setEditLineas(pedido.lineas.map((l) => ({ productoId: l.productoId, cantidad: String(l.cantidad) })));
  }

  function agregarLineaEdit() {
    setEditLineas((prev) => [...prev, { productoId: productos[0]?.id ?? '', cantidad: '1' }]);
  }

  function actualizarLineaEdit(index: number, cambios: Partial<LineaEditForm>) {
    setEditLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function quitarLineaEdit(index: number) {
    setEditLineas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGuardarEdicion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !editandoPedido) return;
    setError(null);
    try {
      await actualizarVentaBar(
        accessToken,
        editandoPedido.id,
        editCuentaCobroId,
        editLineas.map((l) => ({ productoId: l.productoId, cantidad: Number(l.cantidad) })),
      );
      setEditandoPedido(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarVentaBar(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  function abrirRegistrarManual() {
    setError(null);
    setManualLineas([{ productoId: productos[0]?.id ?? '', cantidad: '1' }]);
    setManualCuentaCobroId(cuentasDeDinero[0]?.id ?? '');
    setManualTipoFiscal('B');
    setManualIvaPercent('21');
    setShowRegistrarManual(true);
  }

  function agregarLineaManual() {
    setManualLineas((prev) => [...prev, { productoId: productos[0]?.id ?? '', cantidad: '1' }]);
  }

  function actualizarLineaManual(index: number, cambios: Partial<LineaEditForm>) {
    setManualLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function quitarLineaManual(index: number) {
    setManualLineas((prev) => prev.filter((_, i) => i !== index));
  }

  const manualLineasConProducto = manualLineas
    .map((l) => ({ ...l, producto: productos.find((p) => p.id === l.productoId) }))
    .filter((l): l is LineaEditForm & { producto: ProductoVenta } => !!l.producto);
  const manualTotal = manualLineasConProducto.reduce(
    (sum, l) => sum + Number(l.cantidad || 0) * Number(l.producto.precioVentaPublico),
    0,
  );
  const manualReparto = manualTipoFiscal === 'A' ? calcularBaseDesdeTotal(manualTotal, Number(manualIvaPercent) || 0) : null;

  async function handleRegistrarManual(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !paseId || !manualCuentaCobroId || manualLineas.length === 0) return;
    setError(null);
    setGuardandoManual(true);
    try {
      await crearVentaBar(
        accessToken,
        paseId,
        manualCuentaCobroId,
        manualLineas.map((l) => ({ productoId: l.productoId, cantidad: Number(l.cantidad) })),
        manualTipoFiscal,
        manualTipoFiscal === 'A' ? Number(manualIvaPercent) : undefined,
      );
      setShowRegistrarManual(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardandoManual(false);
    }
  }

  function resumenLineas(pedido: VentaBar): string {
    return pedido.lineas
      .map((l) => `${productos.find((p) => p.id === l.productoId)?.nombre ?? l.productoId} ×${l.cantidad}`)
      .join(', ');
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
              { label: pase ? `${pase.hora} ${pase.nombre ?? ''}`.trim() : '…' },
            ]}
          />
          <div className="crud-header-row">
            <h1>{pase ? `${pase.hora} ${pase.nombre ?? ''}`.trim() : 'Pase'}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="crud-link-btn" onClick={abrirRegistrarManual}>
                Registro manual
              </button>
              <button type="button" className="crud-btn-primary" onClick={() => navigate(`/ventas/bar/pases/${paseId}/registrar`)}>
                Registrar venta
              </button>
            </div>
          </div>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <Modal open={!!editandoPedido} onClose={() => setEditandoPedido(null)} title="Editar pedido">
          {editandoPedido && (
            <form className="crud-form" onSubmit={handleGuardarEdicion}>
              {editLineas.map((linea, i) => (
                <div key={i} className="crud-form-row">
                  <label className="crud-field">
                    <span>Producto</span>
                    <select value={linea.productoId} onChange={(e) => actualizarLineaEdit(i, { productoId: e.target.value })}>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.precioVentaPublico} €)
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
                      value={linea.cantidad}
                      onChange={(e) => actualizarLineaEdit(i, { cantidad: e.target.value })}
                    />
                  </label>
                  {editLineas.length > 1 && (
                    <button type="button" className="crud-delete-btn" onClick={() => quitarLineaEdit(i)}>
                      Quitar
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="crud-link-btn" onClick={agregarLineaEdit}>
                + Añadir línea
              </button>
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Cuenta de cobro</span>
                  <select value={editCuentaCobroId} onChange={(e) => setEditCuentaCobroId(e.target.value)}>
                    {cuentasDeDinero.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="crud-form-actions">
                <button type="button" className="crud-form-cancel" onClick={() => setEditandoPedido(null)}>
                  Cancelar
                </button>
                <button type="submit" className="crud-btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          )}
        </Modal>

        <Modal open={showReclasificar} onClose={() => setShowReclasificar(false)} title="Reclasificar IVA en lote">
          <div className="crud-form">
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nuevo tipo fiscal</span>
                <select value={reclasificarTipo} onChange={(e) => setReclasificarTipo(e.target.value as TipoFiscal)}>
                  <option value="B">B — sin reparto</option>
                  <option value="A">A — reparte IVA repercutido</option>
                </select>
              </label>
              {reclasificarTipo === 'A' && (
                <label className="crud-field">
                  <span>IVA (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={reclasificarPercent}
                    onChange={(e) => setReclasificarPercent(e.target.value)}
                  />
                </label>
              )}
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowReclasificar(false)}>
                Cancelar
              </button>
              <button type="button" className="crud-btn-primary" onClick={handleReclasificar}>
                Aplicar
              </button>
            </div>
          </div>
        </Modal>

        <Modal open={showRegistrarManual} onClose={() => setShowRegistrarManual(false)} title="Registro manual">
          <form className="crud-form" onSubmit={handleRegistrarManual}>
            {manualLineas.map((linea, i) => (
              <div key={i} className="crud-form-row">
                <label className="crud-field">
                  <span>Producto</span>
                  <select value={linea.productoId} onChange={(e) => actualizarLineaManual(i, { productoId: e.target.value })}>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.precioVentaPublico} €)
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
                    value={linea.cantidad}
                    onChange={(e) => actualizarLineaManual(i, { cantidad: e.target.value })}
                  />
                </label>
                {manualLineas.length > 1 && (
                  <button type="button" className="crud-delete-btn" onClick={() => quitarLineaManual(i)}>
                    Quitar
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="crud-link-btn" onClick={agregarLineaManual}>
              + Añadir línea
            </button>

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Cuenta de cobro</span>
                <select value={manualCuentaCobroId} onChange={(e) => setManualCuentaCobroId(e.target.value)} required>
                  <option value="">Selecciona…</option>
                  {cuentasDeDinero.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>IVA</span>
                <select value={manualTipoFiscal} onChange={(e) => setManualTipoFiscal(e.target.value as TipoFiscal)}>
                  <option value="B">B — sin factura</option>
                  <option value="A">A — con factura, reparte IVA repercutido</option>
                </select>
              </label>
              {manualTipoFiscal === 'A' && (
                <label className="crud-field">
                  <span>IVA (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualIvaPercent}
                    onChange={(e) => setManualIvaPercent(e.target.value)}
                  />
                </label>
              )}
            </div>

            <div className="crud-form-row">
              <p className="crud-card-subtitle">
                {manualReparto
                  ? `Base ${manualReparto.base.toFixed(2)} € + IVA ${manualReparto.iva.toFixed(2)} € = ${manualTotal.toFixed(2)} € total`
                  : `Total: ${manualTotal.toFixed(2)} €`}
              </p>
            </div>

            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowRegistrarManual(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardandoManual}>
                {guardandoManual ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>

        <div className="crud-header-row">
          <h2>Pedidos registrados</h2>
          {esAdmin && seleccionados.size > 0 && (
            <button type="button" className="crud-btn-primary" onClick={() => setShowReclasificar(true)}>
              {seleccionados.size} seleccionados → Reclasificar IVA
            </button>
          )}
        </div>

        <div className="crud-list">
          {pedidos === null && <p className="crud-empty">Cargando…</p>}
          {pedidos?.length === 0 && <p className="crud-empty">No hay pedidos registrados para este pase.</p>}
          {pedidos?.map((pedido) => {
            const cuenta = cuentasDeDinero.find((c) => c.id === pedido.cuentaCobroId);
            return (
              <div key={pedido.id} className="crud-card">
                <div className="crud-card-row">
                  {esAdmin && (
                    <input
                      type="checkbox"
                      checked={seleccionados.has(pedido.id)}
                      onChange={() => toggleSeleccionado(pedido.id)}
                    />
                  )}
                  <div className="crud-card-info">
                    <div className="crud-card-title">{resumenLineas(pedido)}</div>
                  </div>
                  <div className="crud-card-actions">
                    {pedido.tipoFiscal === 'A' && (
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {pedido.baseImponible} € + {pedido.importeIva} € =
                      </span>
                    )}
                    <strong>{importePedido(pedido).toFixed(2)} €</strong>
                  </div>
                </div>

                <div className="crud-card-row" style={{ justifyContent: 'space-between' }}>
                  <div className="crud-card-meta">
                    {cuenta && <span className="badge">{cuenta.nombre}</span>}
                    <span className="badge badge-muted">IVA {pedido.tipoFiscal ?? 'B'}</span>
                  </div>
                  <div className="crud-card-actions">
                    <button type="button" className="crud-link-btn" onClick={() => abrirEdicion(pedido)}>
                      Editar
                    </button>
                    <button type="button" className="crud-delete-btn" onClick={() => handleEliminar(pedido.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
