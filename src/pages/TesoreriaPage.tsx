import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearCuenta,
  crearMovimientoCapital,
  crearTransferencia,
  listarCuentas,
  type CuentaPublica,
  type TipoCuentaDinero,
  type TipoMovimientoCapital,
} from '../api/tesoreria';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

export function TesoreriaPage() {
  const { accessToken, logout } = useAuth();
  const [cuentas, setCuentas] = useState<CuentaPublica[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCrear, setShowCrear] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoCuentaDinero>('CAJA');
  const [usableEnTaquilla, setUsableEnTaquilla] = useState(false);
  const [usableEnBar, setUsableEnBar] = useState(false);
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  const [showTransferencia, setShowTransferencia] = useState(false);
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [importeTransferencia, setImporteTransferencia] = useState('');
  const [conceptoTransferencia, setConceptoTransferencia] = useState('');
  const [guardandoTransferencia, setGuardandoTransferencia] = useState(false);

  const [showCapital, setShowCapital] = useState(false);
  const [tipoCapital, setTipoCapital] = useState<TipoMovimientoCapital>('ENTRADA');
  const [cuentaCapitalId, setCuentaCapitalId] = useState('');
  const [importeCapital, setImporteCapital] = useState('');
  const [conceptoCapital, setConceptoCapital] = useState('');
  const [guardandoCapital, setGuardandoCapital] = useState(false);

  const cuentasActivas = (cuentas ?? []).filter((c) => c.activa);

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
      setCuentas(await listarCuentas(accessToken));
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
    setTipo('CAJA');
    setUsableEnTaquilla(false);
    setUsableEnBar(false);
    setShowCrear(true);
  }

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setGuardandoCrear(true);
    try {
      await crearCuenta(accessToken, { nombre, tipo, usableEnTaquilla, usableEnBar });
      setShowCrear(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardandoCrear(false);
    }
  }

  function abrirTransferencia() {
    setOrigenId('');
    setDestinoId('');
    setImporteTransferencia('');
    setConceptoTransferencia('');
    setShowTransferencia(true);
  }

  async function handleTransferencia(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !origenId || !destinoId) return;
    setError(null);
    setGuardandoTransferencia(true);
    try {
      await crearTransferencia(accessToken, {
        origenId,
        destinoId,
        importe: Number(importeTransferencia),
        concepto: conceptoTransferencia || undefined,
      });
      setShowTransferencia(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardandoTransferencia(false);
    }
  }

  function abrirCapital() {
    setTipoCapital('ENTRADA');
    setCuentaCapitalId('');
    setImporteCapital('');
    setConceptoCapital('');
    setShowCapital(true);
  }

  async function handleCapital(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !cuentaCapitalId) return;
    setError(null);
    setGuardandoCapital(true);
    try {
      await crearMovimientoCapital(accessToken, {
        cuentaId: cuentaCapitalId,
        tipo: tipoCapital,
        importe: Number(importeCapital),
        concepto: conceptoCapital || undefined,
      });
      setShowCapital(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardandoCapital(false);
    }
  }

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Tesorería' }]} />
          <div className="crud-header-row">
            <h1>Tesorería</h1>
            <button type="button" className="crud-link-btn" onClick={abrirCrear} aria-label="Crear cuenta">
              ⚙ Crear cuenta
            </button>
          </div>
          <div className="crud-toolbar" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
            <button type="button" className="crud-btn-primary" onClick={abrirTransferencia}>
              Transferencia entre cuentas
            </button>
            <button type="button" className="crud-btn-primary" onClick={abrirCapital}>
              Entrada / Salida de dinero
            </button>
          </div>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <Modal open={showCrear} onClose={() => setShowCrear(false)} title="Crear cuenta">
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Tipo</span>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCuentaDinero)}>
                  <option value="CAJA">Caja</option>
                  <option value="BANCO">Banco</option>
                </select>
              </label>
            </div>
            <div className="crud-form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={usableEnTaquilla} onChange={(e) => setUsableEnTaquilla(e.target.checked)} />
                <span>Usable en taquilla</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={usableEnBar} onChange={(e) => setUsableEnBar(e.target.checked)} />
                <span>Usable en bar</span>
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowCrear(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardandoCrear}>
                {guardandoCrear ? 'Creando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showTransferencia} onClose={() => setShowTransferencia(false)} title="Transferencia entre cuentas">
          <form className="crud-form" onSubmit={handleTransferencia}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Desde</span>
                <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} required>
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
                <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} required>
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
                  value={importeTransferencia}
                  onChange={(e) => setImporteTransferencia(e.target.value)}
                  required
                />
              </label>
              <label className="crud-field">
                <span>Concepto (opcional)</span>
                <input value={conceptoTransferencia} onChange={(e) => setConceptoTransferencia(e.target.value)} />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowTransferencia(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardandoTransferencia}>
                {guardandoTransferencia ? 'Guardando…' : 'Transferir'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={showCapital} onClose={() => setShowCapital(false)} title="Entrada / Salida de dinero">
          <form className="crud-form" onSubmit={handleCapital}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Tipo</span>
                <select value={tipoCapital} onChange={(e) => setTipoCapital(e.target.value as TipoMovimientoCapital)}>
                  <option value="ENTRADA">Entrada de dinero</option>
                  <option value="SALIDA">Salida de dinero</option>
                </select>
              </label>
              <label className="crud-field">
                <span>Cuenta</span>
                <select value={cuentaCapitalId} onChange={(e) => setCuentaCapitalId(e.target.value)} required>
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
                  value={importeCapital}
                  onChange={(e) => setImporteCapital(e.target.value)}
                  required
                />
              </label>
              <label className="crud-field">
                <span>Concepto (opcional)</span>
                <input value={conceptoCapital} onChange={(e) => setConceptoCapital(e.target.value)} />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowCapital(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardandoCapital}>
                {guardandoCapital ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>

        <div className="crud-list">
          {cuentas === null && <p className="crud-empty">Cargando…</p>}
          {cuentas?.length === 0 && <p className="crud-empty">No hay cuentas todavía.</p>}
          {cuentas?.map((cuenta) => (
            <Link
              key={cuenta.id}
              to={`/tesoreria/${cuenta.id}`}
              className="crud-card crud-card-title-link"
              style={{ display: 'block', opacity: cuenta.activa ? 1 : 0.5 }}
            >
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{cuenta.nombre}</div>
                  <div className="crud-card-meta">
                    <span className="badge">{cuenta.tipo === 'BANCO' ? 'Banco' : 'Caja'}</span>
                    {!cuenta.activa && <span className="badge badge-muted">INACTIVA</span>}
                  </div>
                </div>
                <div className="crud-card-actions">
                  <strong>{cuenta.saldo} €</strong>
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
