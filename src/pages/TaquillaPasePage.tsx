import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { tieneRol } from '../auth/roles';
import { ApiError } from '../api/client';
import {
  actualizarVentaEntradas,
  crearLoteVentasEntradas,
  eliminarVentaEntradas,
  listarTiposEntrada,
  listarVentasEntradas,
  reclasificarLoteVentasEntradas,
  type LineaVentaEntradas,
  type OrigenVenta,
  type TipoEntrada,
  type TipoFiscal,
  type VentaEntradas,
} from '../api/taquilla';
import { listarCuentasCobro, type CuentaCobro } from '../api/tesoreria';
import { obtenerFecha, obtenerPase, obtenerPlaza, type Fecha, type Pase, type Plaza } from '../api/plazas';
import { calcularBaseDesdeTotal } from '../utils/iva';
import { importeVenta } from '../utils/resumenVentas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

const ORIGENES: OrigenVenta[] = ['FISICA', 'ONLINE_MANUAL'];

interface LineaForm {
  tipoEntradaId: string;
  cantidad: string;
  cuentaCobroId: string;
  origen: OrigenVenta;
  tipoFiscal: TipoFiscal;
  ivaPercent: string;
}

function lineaVacia(tipoEntradaId: string, cuentaCobroId: string): LineaForm {
  return { tipoEntradaId, cantidad: '1', cuentaCobroId, origen: 'FISICA', tipoFiscal: 'B', ivaPercent: '21' };
}

function lineaHaciaPayload(l: LineaForm, tiposEntrada: TipoEntrada[]): LineaVentaEntradas {
  const tipoEntrada = tiposEntrada.find((t) => t.id === l.tipoEntradaId);
  const base: LineaVentaEntradas = {
    tipoEntradaId: l.tipoEntradaId,
    cantidad: Number(l.cantidad),
    cuentaCobroId: l.cuentaCobroId,
    origen: l.origen,
  };
  if (tipoEntrada?.aplicaIva) {
    return { ...base, tipoFiscal: l.tipoFiscal, ivaPercent: l.tipoFiscal === 'A' ? Number(l.ivaPercent) : undefined };
  }
  return base;
}

function LineaCampos({
  linea,
  onChange,
  tiposEntrada,
  cuentas,
}: {
  linea: LineaForm;
  onChange: (cambios: Partial<LineaForm>) => void;
  tiposEntrada: TipoEntrada[];
  cuentas: CuentaCobro[];
}) {
  const tipoEntrada = tiposEntrada.find((t) => t.id === linea.tipoEntradaId);
  const cantidad = Number(linea.cantidad) || 0;
  const total = tipoEntrada ? cantidad * Number(tipoEntrada.precio) : 0;
  const reparto = linea.tipoFiscal === 'A' ? calcularBaseDesdeTotal(total, Number(linea.ivaPercent) || 0) : null;

  return (
    <>
      <div className="crud-form-row">
        <label className="crud-field">
          <span>Tipo de entrada</span>
          <select value={linea.tipoEntradaId} onChange={(e) => onChange({ tipoEntradaId: e.target.value })} required>
            <option value="">Selecciona…</option>
            {tiposEntrada
              .filter((t) => t.activo)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.precio} €)
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
            onChange={(e) => onChange({ cantidad: e.target.value })}
            required
          />
        </label>
      </div>

      <div className="crud-form-row">
        <label className="crud-field">
          <span>Cuenta de cobro</span>
          <select value={linea.cuentaCobroId} onChange={(e) => onChange({ cuentaCobroId: e.target.value })} required>
            <option value="">Selecciona…</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="crud-field">
          <span>Origen</span>
          <select value={linea.origen} onChange={(e) => onChange({ origen: e.target.value as OrigenVenta })}>
            {ORIGENES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tipoEntrada?.aplicaIva && (
        <div className="crud-form-row">
          <label className="crud-field">
            <span>IVA</span>
            <select value={linea.tipoFiscal} onChange={(e) => onChange({ tipoFiscal: e.target.value as TipoFiscal })}>
              <option value="B">B — sin factura</option>
              <option value="A">A — con factura, reparte IVA repercutido</option>
            </select>
          </label>
          {linea.tipoFiscal === 'A' && (
            <label className="crud-field">
              <span>IVA (%)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={linea.ivaPercent}
                onChange={(e) => onChange({ ivaPercent: e.target.value })}
              />
            </label>
          )}
        </div>
      )}

      <div className="crud-form-row">
        <p className="crud-card-subtitle">
          {reparto
            ? `Base ${reparto.base.toFixed(2)} € + IVA ${reparto.iva.toFixed(2)} € = ${total.toFixed(2)} € total`
            : `Total: ${total.toFixed(2)} €`}
        </p>
      </div>
    </>
  );
}

export function TaquillaPasePage() {
  const { paseId } = useParams<{ paseId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout, user } = useAuth();
  const esAdmin = tieneRol(user?.rol ?? '', 'ADMIN');
  const [pase, setPase] = useState<Pase | null>(null);
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [ventas, setVentas] = useState<VentaEntradas[] | null>(null);
  const [tiposEntrada, setTiposEntrada] = useState<TipoEntrada[]>([]);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaCobro[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showRegistrar, setShowRegistrar] = useState(false);
  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const [guardando, setGuardando] = useState(false);

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [showReclasificar, setShowReclasificar] = useState(false);
  const [reclasificarTipo, setReclasificarTipo] = useState<TipoFiscal>('B');
  const [reclasificarPercent, setReclasificarPercent] = useState('21');

  const [editandoVenta, setEditandoVenta] = useState<VentaEntradas | null>(null);
  const [editLinea, setEditLinea] = useState<LineaForm | null>(null);

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
      const [p, tipos, cuentas, ventasData] = await Promise.all([
        obtenerPase(accessToken, paseId),
        listarTiposEntrada(accessToken),
        listarCuentasCobro(accessToken),
        listarVentasEntradas(accessToken, { paseId }),
      ]);
      setPase(p);
      setTiposEntrada(tipos);
      setCuentasDeDinero(cuentas.filter((c) => c.usableEnTaquilla));
      setVentas(ventasData);
      const f = await obtenerFecha(accessToken, p.fechaId);
      setFecha(f);
      setPlaza(await obtenerPlaza(accessToken, f.plazaId));
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    setSeleccionadas(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, paseId]);

  function cuentaPorDefecto(): string {
    return cuentasDeDinero[0]?.id ?? '';
  }

  function abrirRegistrarManual() {
    const tipoActivo = tiposEntrada.find((t) => t.activo);
    setLineas([lineaVacia(tipoActivo?.id ?? '', cuentaPorDefecto())]);
    setShowRegistrar(true);
  }

  function agregarLinea() {
    const tipoActivo = tiposEntrada.find((t) => t.activo);
    setLineas((prev) => [...prev, lineaVacia(tipoActivo?.id ?? '', cuentaPorDefecto())]);
  }

  function actualizarLinea(index: number, cambios: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)));
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleRegistrar(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !paseId || lineas.length === 0) return;
    setError(null);
    setGuardando(true);
    try {
      await crearLoteVentasEntradas(
        accessToken,
        paseId,
        lineas.map((l) => lineaHaciaPayload(l, tiposEntrada)),
      );
      setShowRegistrar(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  function toggleSeleccionada(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleReclasificar() {
    if (!accessToken || seleccionadas.size === 0) return;
    setError(null);
    try {
      await reclasificarLoteVentasEntradas(
        accessToken,
        [...seleccionadas],
        reclasificarTipo,
        reclasificarTipo === 'A' ? Number(reclasificarPercent) : undefined,
      );
      setShowReclasificar(false);
      setSeleccionadas(new Set());
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  function abrirEdicion(venta: VentaEntradas) {
    setEditandoVenta(venta);
    setEditLinea({
      tipoEntradaId: venta.tipoEntradaId,
      cantidad: String(venta.cantidad),
      cuentaCobroId: venta.cuentaCobroId,
      origen: venta.origen,
      tipoFiscal: venta.tipoFiscal ?? 'B',
      ivaPercent: venta.ivaPercent ?? '21',
    });
  }

  async function handleGuardarEdicion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !editandoVenta || !editLinea) return;
    setError(null);
    try {
      await actualizarVentaEntradas(accessToken, editandoVenta.id, lineaHaciaPayload(editLinea, tiposEntrada));
      setEditandoVenta(null);
      setEditLinea(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarVentaEntradas(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
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
              { label: 'Taquilla', to: '/ventas/taquilla' },
              { label: plaza?.nombre ?? '…', to: plaza ? `/ventas/taquilla/plazas/${plaza.id}` : undefined },
              { label: fecha?.fecha ?? '…', to: fecha ? `/ventas/taquilla/fechas/${fecha.id}` : undefined },
              { label: pase ? `${pase.hora} ${pase.nombre ?? ''}`.trim() : '…' },
            ]}
          />
          <div className="crud-header-row">
            <h1>{pase ? `${pase.hora} ${pase.nombre ?? ''}`.trim() : 'Pase'}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="crud-link-btn" onClick={abrirRegistrarManual}>
                Registro manual
              </button>
              <button
                type="button"
                className="crud-btn-primary"
                onClick={() => navigate(`/ventas/taquilla/pases/${paseId}/registrar`)}
              >
                Registrar venta
              </button>
            </div>
          </div>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <Modal open={showRegistrar} onClose={() => setShowRegistrar(false)} title="Registro manual">
          <form className="crud-form" onSubmit={handleRegistrar}>
            {lineas.map((linea, i) => (
              <div
                key={i}
                className="crud-date-group"
                style={{
                  borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
                  paddingTop: i > 0 ? '0.75rem' : undefined,
                }}
              >
                <LineaCampos
                  linea={linea}
                  onChange={(cambios) => actualizarLinea(i, cambios)}
                  tiposEntrada={tiposEntrada}
                  cuentas={cuentasDeDinero}
                />
                {lineas.length > 1 && (
                  <div className="crud-form-actions" style={{ justifyContent: 'flex-start' }}>
                    <button type="button" className="crud-delete-btn" onClick={() => quitarLinea(i)}>
                      Quitar línea
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="crud-form-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="crud-link-btn" onClick={agregarLinea}>
                + Añadir línea
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="crud-form-cancel" onClick={() => setShowRegistrar(false)}>
                  Cancelar
                </button>
                <button type="submit" className="crud-btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Registrar'}
                </button>
              </div>
            </div>
          </form>
        </Modal>

        <Modal open={!!editandoVenta} onClose={() => setEditandoVenta(null)} title="Editar venta">
          {editLinea && (
            <form className="crud-form" onSubmit={handleGuardarEdicion}>
              <LineaCampos
                linea={editLinea}
                onChange={(cambios) => setEditLinea((prev) => (prev ? { ...prev, ...cambios } : prev))}
                tiposEntrada={tiposEntrada}
                cuentas={cuentasDeDinero}
              />
              <div className="crud-form-actions">
                <button type="button" className="crud-form-cancel" onClick={() => setEditandoVenta(null)}>
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

        <div className="crud-header-row">
          <h2>Ventas registradas</h2>
          {esAdmin && seleccionadas.size > 0 && (
            <button type="button" className="crud-btn-primary" onClick={() => setShowReclasificar(true)}>
              {seleccionadas.size} seleccionadas → Reclasificar IVA
            </button>
          )}
        </div>

        <div className="crud-list">
          {ventas === null && <p className="crud-empty">Cargando…</p>}
          {ventas?.length === 0 && <p className="crud-empty">No hay ventas registradas para este pase.</p>}
          {ventas?.map((venta) => {
            const tipo = tiposEntrada.find((t) => t.id === venta.tipoEntradaId);
            const cuenta = cuentasDeDinero.find((c) => c.id === venta.cuentaCobroId);
            return (
              <div key={venta.id} className="crud-card">
                <div className="crud-card-row">
                  {esAdmin && (
                    <input
                      type="checkbox"
                      checked={seleccionadas.has(venta.id)}
                      onChange={() => toggleSeleccionada(venta.id)}
                    />
                  )}
                  <div className="crud-card-info">
                    <div className="crud-card-title">
                      {tipo?.nombre ?? venta.tipoEntradaId} × {venta.cantidad}
                    </div>
                    <div className="crud-card-meta">
                      {cuenta && <span className="badge">{cuenta.nombre}</span>}
                      <span className="badge badge-muted">{venta.origen}</span>
                      {venta.tipoFiscal && <span className="badge badge-muted">IVA {venta.tipoFiscal}</span>}
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <strong>{importeVenta(venta).toFixed(2)} €</strong>
                    <button type="button" className="crud-link-btn" onClick={() => abrirEdicion(venta)}>
                      Editar
                    </button>
                    <button type="button" className="crud-delete-btn" onClick={() => handleEliminar(venta.id)}>
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
