import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  activarCuenta,
  actualizarAjusteArqueo,
  actualizarCuenta,
  actualizarMovimientoCapital,
  actualizarTransferencia,
  crearAjusteArqueo,
  desactivarCuenta,
  eliminarAjusteArqueo,
  eliminarCuenta,
  eliminarMovimientoCapital,
  eliminarTransferencia,
  listarCuentas,
  listarMovimientos,
  obtenerAjusteArqueo,
  obtenerCuenta,
  obtenerMovimientoCapital,
  obtenerTransferencia,
  type CuentaPublica,
  type MovimientoCuenta,
  type TipoMovimientoCapital,
} from '../api/tesoreria';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

export function CuentaDetailPage() {
  const { cuentaId } = useParams<{ cuentaId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();
  const [cuenta, setCuenta] = useState<CuentaPublica | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCuenta[] | null>(null);
  const [cuentas, setCuentas] = useState<CuentaPublica[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showEditar, setShowEditar] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editUsableEnTaquilla, setEditUsableEnTaquilla] = useState(false);
  const [editUsableEnBar, setEditUsableEnBar] = useState(false);

  const [showAjuste, setShowAjuste] = useState(false);
  const [ajusteEditId, setAjusteEditId] = useState<string | null>(null);
  const [ajusteImporteReal, setAjusteImporteReal] = useState('');
  const [ajusteConcepto, setAjusteConcepto] = useState('');
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);

  const [showTransferencia, setShowTransferencia] = useState(false);
  const [transferenciaEditId, setTransferenciaEditId] = useState<string | null>(null);
  const [transOrigenId, setTransOrigenId] = useState('');
  const [transDestinoId, setTransDestinoId] = useState('');
  const [transImporte, setTransImporte] = useState('');
  const [transConcepto, setTransConcepto] = useState('');
  const [guardandoTransferencia, setGuardandoTransferencia] = useState(false);

  const [showCapital, setShowCapital] = useState(false);
  const [capitalEditId, setCapitalEditId] = useState<string | null>(null);
  const [capitalTipo, setCapitalTipo] = useState<TipoMovimientoCapital>('ENTRADA');
  const [capitalImporte, setCapitalImporte] = useState('');
  const [capitalConcepto, setCapitalConcepto] = useState('');
  const [guardandoCapital, setGuardandoCapital] = useState(false);

  const cuentasActivas = cuentas.filter((c) => c.activa);

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
    if (!accessToken || !cuentaId) return;
    try {
      const [c, m, todasCuentas] = await Promise.all([
        obtenerCuenta(accessToken, cuentaId),
        listarMovimientos(accessToken, cuentaId),
        listarCuentas(accessToken),
      ]);
      setCuenta(c);
      setMovimientos(m);
      setCuentas(todasCuentas);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, cuentaId]);

  // El saldo actual es el saldo tras el movimiento más reciente (movimientos viene ordenado
  // del más reciente al más antiguo); a partir de ahí se resta cada importe para saber cuánto
  // quedaba justo después de cada movimiento anterior.
  const movimientosConSaldo = (() => {
    if (!movimientos || !cuenta) return [];
    let saldo = Number(cuenta.saldo);
    return movimientos.map((m) => {
      const saldoTrasMovimiento = saldo;
      saldo -= Number(m.importe);
      return { ...m, saldoTrasMovimiento };
    });
  })();

  function abrirEditar() {
    if (!cuenta) return;
    setEditNombre(cuenta.nombre);
    setEditUsableEnTaquilla(cuenta.usableEnTaquilla);
    setEditUsableEnBar(cuenta.usableEnBar);
    setShowEditar(true);
  }

  async function handleEditar(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !cuentaId) return;
    setError(null);
    try {
      await actualizarCuenta(accessToken, cuentaId, {
        nombre: editNombre,
        usableEnTaquilla: editUsableEnTaquilla,
        usableEnBar: editUsableEnBar,
      });
      setShowEditar(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleToggleActiva() {
    if (!accessToken || !cuentaId || !cuenta) return;
    setError(null);
    try {
      if (cuenta.activa) await desactivarCuenta(accessToken, cuentaId);
      else await activarCuenta(accessToken, cuentaId);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar() {
    if (!accessToken || !cuentaId) return;
    setError(null);
    try {
      await eliminarCuenta(accessToken, cuentaId);
      navigate('/tesoreria');
    } catch (err) {
      handleApiError(err);
    }
  }

  function abrirAjusteNuevo() {
    setAjusteEditId(null);
    setAjusteImporteReal('');
    setAjusteConcepto('');
    setShowAjuste(true);
  }

  async function abrirAjusteEditar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      const ajuste = await obtenerAjusteArqueo(accessToken, id);
      setAjusteEditId(id);
      setAjusteImporteReal(ajuste.importeReal);
      setAjusteConcepto(ajuste.concepto ?? '');
      setShowAjuste(true);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleGuardarAjuste(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !cuentaId) return;
    setError(null);
    setGuardandoAjuste(true);
    try {
      const data = { importeReal: Number(ajusteImporteReal || 0), concepto: ajusteConcepto || undefined };
      if (ajusteEditId) await actualizarAjusteArqueo(accessToken, ajusteEditId, data);
      else await crearAjusteArqueo(accessToken, cuentaId, data);
      setShowAjuste(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardandoAjuste(false);
    }
  }

  async function handleEliminarAjuste(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarAjusteArqueo(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function abrirTransferenciaEditar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      const transferencia = await obtenerTransferencia(accessToken, id);
      setTransferenciaEditId(id);
      setTransOrigenId(transferencia.origenId);
      setTransDestinoId(transferencia.destinoId);
      setTransImporte(transferencia.importe);
      setTransConcepto(transferencia.concepto ?? '');
      setShowTransferencia(true);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleGuardarTransferencia(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !transferenciaEditId) return;
    setError(null);
    setGuardandoTransferencia(true);
    try {
      await actualizarTransferencia(accessToken, transferenciaEditId, {
        origenId: transOrigenId,
        destinoId: transDestinoId,
        importe: Number(transImporte || 0),
        concepto: transConcepto || undefined,
      });
      setShowTransferencia(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardandoTransferencia(false);
    }
  }

  async function handleEliminarTransferencia(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarTransferencia(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function abrirCapitalEditar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      const movimiento = await obtenerMovimientoCapital(accessToken, id);
      setCapitalEditId(id);
      setCapitalTipo(movimiento.tipo);
      setCapitalImporte(movimiento.importe);
      setCapitalConcepto(movimiento.concepto ?? '');
      setShowCapital(true);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleGuardarCapital(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !capitalEditId) return;
    setError(null);
    setGuardandoCapital(true);
    try {
      await actualizarMovimientoCapital(accessToken, capitalEditId, {
        tipo: capitalTipo,
        importe: Number(capitalImporte || 0),
        concepto: capitalConcepto || undefined,
      });
      setShowCapital(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardandoCapital(false);
    }
  }

  async function handleEliminarCapital(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarMovimientoCapital(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  function handleEditarMovimiento(origenTipo: MovimientoCuenta['origenTipo'], origenId: string) {
    if (origenTipo === 'TRANSFERENCIA') abrirTransferenciaEditar(origenId);
    else if (origenTipo === 'CAPITAL') abrirCapitalEditar(origenId);
    else if (origenTipo === 'AJUSTE_ARQUEO') abrirAjusteEditar(origenId);
  }

  function handleEliminarMovimiento(origenTipo: MovimientoCuenta['origenTipo'], origenId: string) {
    if (origenTipo === 'TRANSFERENCIA') handleEliminarTransferencia(origenId);
    else if (origenTipo === 'CAPITAL') handleEliminarCapital(origenId);
    else if (origenTipo === 'AJUSTE_ARQUEO') handleEliminarAjuste(origenId);
  }

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Tesorería', to: '/tesoreria' },
              { label: cuenta?.nombre ?? '…' },
            ]}
          />
          <h1>{cuenta?.nombre ?? 'Cuenta'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <Modal open={showEditar} onClose={() => setShowEditar(false)} title="Editar cuenta">
          <form className="crud-form" onSubmit={handleEditar}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
              </label>
            </div>
            <div className="crud-form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={editUsableEnTaquilla}
                  onChange={(e) => setEditUsableEnTaquilla(e.target.checked)}
                />
                <span>Usable en taquilla</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={editUsableEnBar} onChange={(e) => setEditUsableEnBar(e.target.checked)} />
                <span>Usable en bar</span>
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowEditar(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showAjuste} onClose={() => setShowAjuste(false)} title="Ajuste de arqueo">
          <form className="crud-form" onSubmit={handleGuardarAjuste}>
            <p>
              En teoría hay <strong>{cuenta?.saldo} €</strong>
            </p>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Real (contado)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ajusteImporteReal}
                  onChange={(e) => setAjusteImporteReal(e.target.value)}
                  required
                />
              </label>
              <label className="crud-field">
                <span>Concepto (opcional)</span>
                <input value={ajusteConcepto} onChange={(e) => setAjusteConcepto(e.target.value)} />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowAjuste(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardandoAjuste}>
                {guardandoAjuste ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showTransferencia} onClose={() => setShowTransferencia(false)} title="Editar transferencia">
          <form className="crud-form" onSubmit={handleGuardarTransferencia}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Desde</span>
                <select value={transOrigenId} onChange={(e) => setTransOrigenId(e.target.value)} required>
                  <option value="">Selecciona…</option>
                  {cuentasActivas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>Hacia</span>
                <select value={transDestinoId} onChange={(e) => setTransDestinoId(e.target.value)} required>
                  <option value="">Selecciona…</option>
                  {cuentasActivas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Importe (€)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transImporte}
                  onChange={(e) => setTransImporte(e.target.value)}
                  required
                />
              </label>
              <label className="crud-field">
                <span>Concepto (opcional)</span>
                <input value={transConcepto} onChange={(e) => setTransConcepto(e.target.value)} />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowTransferencia(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardandoTransferencia}>
                {guardandoTransferencia ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showCapital} onClose={() => setShowCapital(false)} title="Editar entrada/salida de dinero">
          <form className="crud-form" onSubmit={handleGuardarCapital}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Tipo</span>
                <select value={capitalTipo} onChange={(e) => setCapitalTipo(e.target.value as TipoMovimientoCapital)}>
                  <option value="ENTRADA">Entrada de dinero</option>
                  <option value="SALIDA">Salida de dinero</option>
                </select>
              </label>
              <label className="crud-field">
                <span>Importe (€)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={capitalImporte}
                  onChange={(e) => setCapitalImporte(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Concepto (opcional)</span>
                <input value={capitalConcepto} onChange={(e) => setCapitalConcepto(e.target.value)} />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowCapital(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardandoCapital}>
                {guardandoCapital ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        {cuenta && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{cuenta.saldo} €</div>
              <div className="detail-hero-meta">
                <span className="badge">{cuenta.tipo === 'BANCO' ? 'Banco' : 'Caja'}</span>
                {cuenta.usableEnTaquilla && <span className="badge badge-muted">Taquilla</span>}
                {cuenta.usableEnBar && <span className="badge badge-muted">Bar</span>}
                <span className={cuenta.activa ? 'badge badge-success' : 'badge badge-danger'}>
                  {cuenta.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
            <div className="detail-footer">
              <button type="button" className="crud-link-btn" onClick={abrirEditar}>
                Editar
              </button>
              <button type="button" className="crud-link-btn" onClick={handleToggleActiva}>
                {cuenta.activa ? 'Desactivar' : 'Activar'}
              </button>
              {cuenta.tipo === 'CAJA' && (
                <button type="button" className="crud-link-btn" onClick={abrirAjusteNuevo}>
                  Ajuste de arqueo
                </button>
              )}
              <button type="button" className="crud-delete-btn" onClick={handleEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        )}

        <div className="crud-header-row">
          <h2>Movimientos</h2>
        </div>

        <div className="crud-list">
          {movimientos === null && <p className="crud-empty">Cargando…</p>}
          {movimientos?.length === 0 && <p className="crud-empty">No hay movimientos todavía.</p>}
          {movimientosConSaldo.map((m) => {
            const positivo = Number(m.importe) >= 0;
            const editable = m.origenTipo != null && m.origenId != null;
            return (
              <div key={m.journalEntryId} className="crud-card">
                <div className="crud-card-row">
                  <div className="crud-card-info">
                    <div className="crud-card-title">{m.descripcion}</div>
                    <div className="crud-card-meta">
                      <span>{new Date(m.fecha).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <div style={{ textAlign: 'right' }}>
                      <div>
                        <strong style={{ color: positivo ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {positivo ? '+' : ''}
                          {m.importe} €
                        </strong>
                      </div>
                      <div className="crud-card-meta">Saldo: {m.saldoTrasMovimiento.toFixed(2)} €</div>
                    </div>
                  </div>
                </div>
                {editable && (
                  <div className="crud-card-row" style={{ justifyContent: 'flex-end' }}>
                    <div className="crud-card-actions">
                      <button
                        type="button"
                        className="crud-link-btn"
                        onClick={() => handleEditarMovimiento(m.origenTipo, m.origenId!)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="crud-delete-btn"
                        onClick={() => handleEliminarMovimiento(m.origenTipo, m.origenId!)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
