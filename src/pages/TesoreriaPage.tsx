import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearCuenta,
  listarCuentas,
  obtenerPatrimonio,
  type AccountType,
  type CuentaPublica,
} from '../api/tesoreria';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

const TIPOS: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

type Grupo = 'DINERO' | AccountType;

const GRUPOS: { key: Grupo; label: string }[] = [
  { key: 'DINERO', label: 'Tesorería y bancos' },
  { key: 'ASSET', label: 'Activos' },
  { key: 'LIABILITY', label: 'Pasivos' },
  { key: 'EQUITY', label: 'Patrimonio' },
  { key: 'INCOME', label: 'Ingresos' },
  { key: 'EXPENSE', label: 'Gastos' },
];

function cuentaPerteneceAGrupo(cuenta: CuentaPublica, grupo: Grupo): boolean {
  return grupo === 'DINERO' ? cuenta.esCuentaDeDinero : cuenta.type === grupo;
}

export function TesoreriaPage() {
  const { accessToken, logout } = useAuth();
  const [cuentas, setCuentas] = useState<CuentaPublica[] | null>(null);
  const [patrimonio, setPatrimonio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [gruposSeleccionados, setGruposSeleccionados] = useState<Set<Grupo>>(
    () => new Set(['DINERO']),
  );

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<AccountType>('ASSET');
  const [esCuentaDeDinero, setEsCuentaDeDinero] = useState(true);
  const [guardando, setGuardando] = useState(false);

  function toggleGrupo(grupo: Grupo) {
    setGruposSeleccionados((current) => {
      const next = new Set(current);
      if (next.has(grupo)) {
        next.delete(grupo);
      } else {
        next.add(grupo);
      }
      return next;
    });
  }

  const cuentasFiltradas = cuentas?.filter(
    (cuenta) =>
      gruposSeleccionados.size === 0 ||
      [...gruposSeleccionados].some((grupo) => cuentaPerteneceAGrupo(cuenta, grupo)),
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
    if (!accessToken) return;
    try {
      const [cuentasData, patrimonioData] = await Promise.all([
        listarCuentas(accessToken),
        obtenerPatrimonio(accessToken),
      ]);
      setCuentas(cuentasData);
      setPatrimonio(patrimonioData.patrimonio);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setGuardando(true);
    try {
      await crearCuenta(accessToken, { nombre, code, type, esCuentaDeDinero });
      setNombre('');
      setCode('');
      setType('ASSET');
      setEsCuentaDeDinero(true);
      setShowForm(false);
      await cargar();
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
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Tesorería' }]} />
          <div className="crud-header-row">
            <h1>Tesorería</h1>
            <button type="button" className="crud-btn-primary" onClick={() => setShowForm(true)}>
              Crear cuenta
            </button>
          </div>
          {patrimonio !== null && (
            <p>
              Patrimonio líquido total: <strong>{patrimonio} €</strong>
            </p>
          )}
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-filtros">
          <span className="crud-filtros-label">Filtrar por grupo</span>
          <div className="chip-row">
            {GRUPOS.map(({ key, label }) => {
              const activo = gruposSeleccionados.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip ${activo ? 'chip-active' : ''}`}
                  aria-pressed={activo}
                  onClick={() => toggleGrupo(key)}
                >
                  {label}
                </button>
              );
            })}
            {gruposSeleccionados.size > 0 && (
              <button
                type="button"
                className="chip-clear"
                onClick={() => setGruposSeleccionados(new Set())}
              >
                Limpiar filtro
              </button>
            )}
          </div>
        </div>

        <Modal open={showForm} onClose={() => setShowForm(false)} title="Crear cuenta">
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Código</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  pattern="\d{6}"
                  title="6 dígitos, ej. 570001"
                  placeholder="570001"
                  required
                />
              </label>
            </div>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Tipo</span>
                <select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>¿Es cuenta de dinero?</span>
                <input
                  type="checkbox"
                  checked={esCuentaDeDinero}
                  onChange={(e) => setEsCuentaDeDinero(e.target.checked)}
                />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardando}>
                {guardando ? 'Creando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        <div className="crud-list">
          {cuentasFiltradas === undefined && <p className="crud-empty">Cargando…</p>}
          {cuentasFiltradas?.length === 0 && (
            <p className="crud-empty">No hay cuentas que coincidan con el filtro.</p>
          )}
          {cuentasFiltradas?.map((cuenta) => (
            <div key={cuenta.id} className="crud-card">
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{cuenta.nombre}</div>
                  <div className="crud-card-meta">
                    <span>{cuenta.type}</span>
                    <span className="badge">{cuenta.code}</span>
                    {cuenta.esCuentaDeDinero && <span className="badge">DINERO</span>}
                  </div>
                </div>
                <div className="crud-card-actions">
                  <strong>{cuenta.saldo} €</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
