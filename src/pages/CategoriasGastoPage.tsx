import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  actualizarCategoriaGasto,
  crearCategoriaGasto,
  eliminarCategoriaGasto,
  listarCategoriasGasto,
  type CategoriaGasto,
} from '../api/gastos';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function CategoriasGastoPage() {
  const { accessToken, logout } = useAuth();
  const [categorias, setCategorias] = useState<CategoriaGasto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cuentaContableCode, setCuentaContableCode] = useState('');
  const [requiereEmpleado, setRequiereEmpleado] = useState(false);
  const [aplicaIva, setAplicaIva] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCuentaContableCode, setEditCuentaContableCode] = useState('');
  const [editRequiereEmpleado, setEditRequiereEmpleado] = useState(false);
  const [editAplicaIva, setEditAplicaIva] = useState(false);

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
      setCategorias(await listarCategoriasGasto(accessToken));
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
      await crearCategoriaGasto(accessToken, { nombre, cuentaContableCode, requiereEmpleado, aplicaIva });
      setNombre('');
      setCuentaContableCode('');
      setRequiereEmpleado(false);
      setAplicaIva(false);
      setShowForm(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(categoria: CategoriaGasto) {
    setEditandoId(categoria.id);
    setEditNombre(categoria.nombre);
    setEditCuentaContableCode('');
    setEditRequiereEmpleado(categoria.requiereEmpleado);
    setEditAplicaIva(categoria.aplicaIva);
  }

  async function handleActualizar(event: FormEvent, categoria: CategoriaGasto) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await actualizarCategoriaGasto(accessToken, categoria.id, {
        nombre: editNombre,
        aplicaIva: editAplicaIva,
        requiereEmpleado: editRequiereEmpleado,
        cuentaContableCode:
          !categoria.esPredefinida && !categoria.usada && editCuentaContableCode ? editCuentaContableCode : undefined,
      });
      setEditandoId(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarCategoriaGasto(accessToken, id);
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
              { label: 'Gastos', to: '/gastos' },
              { label: 'Categorías' },
            ]}
          />
          <h1>Categorías de gasto</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-toolbar">
          <button type="button" className="crud-btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : 'Crear categoría'}
          </button>
        </div>

        {showForm && (
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Código de cuenta contable (6 dígitos)</span>
                <input
                  value={cuentaContableCode}
                  onChange={(e) => setCuentaContableCode(e.target.value)}
                  placeholder="ej. 629006"
                  pattern="\d{6}"
                  required
                />
              </label>
            </div>
            <div className="crud-form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={requiereEmpleado} onChange={(e) => setRequiereEmpleado(e.target.checked)} />
                <span>Requiere seleccionar empleado</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={aplicaIva} onChange={(e) => setAplicaIva(e.target.checked)} />
                <span>Admite IVA soportado</span>
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="submit" className="crud-btn-primary" disabled={guardando}>
                {guardando ? 'Creando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        <div className="crud-list">
          {categorias === null && <p className="crud-empty">Cargando…</p>}
          {categorias?.length === 0 && <p className="crud-empty">No hay categorías todavía.</p>}
          {categorias?.map((categoria) => (
            <div key={categoria.id} className="crud-card">
              {editandoId === categoria.id ? (
                <form className="crud-form-row" onSubmit={(e) => handleActualizar(e, categoria)}>
                  <label className="crud-field">
                    <span>Nombre</span>
                    <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
                  </label>
                  {!categoria.esPredefinida && !categoria.usada && (
                    <label className="crud-field">
                      <span>Código de cuenta contable (dejar vacío para no cambiarla)</span>
                      <input
                        value={editCuentaContableCode}
                        onChange={(e) => setEditCuentaContableCode(e.target.value)}
                        placeholder={categoria.cuentaContableCode ?? ''}
                        pattern="\d{6}"
                      />
                    </label>
                  )}
                  {!categoria.esPredefinida && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={editRequiereEmpleado}
                          onChange={(e) => setEditRequiereEmpleado(e.target.checked)}
                        />
                        <span>Requiere empleado</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" checked={editAplicaIva} onChange={(e) => setEditAplicaIva(e.target.checked)} />
                        <span>Admite IVA</span>
                      </label>
                    </>
                  )}
                  <div className="crud-form-actions">
                    <button type="button" className="crud-form-cancel" onClick={() => setEditandoId(null)}>
                      Cancelar
                    </button>
                    <button type="submit" className="crud-btn-primary">
                      Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="crud-card-row">
                  <div className="crud-card-info">
                    <div className="crud-card-title">{categoria.nombre}</div>
                    <div className="crud-card-meta">
                      {categoria.cuentaContableCode && <span className="badge">{categoria.cuentaContableCode}</span>}
                      {categoria.esPredefinida && <span className="badge badge-muted">PREDEFINIDA</span>}
                      {categoria.esPagoPersonal && <span className="badge badge-muted">PERSONAL</span>}
                      {categoria.aplicaIva && <span className="badge badge-muted">IVA</span>}
                      {categoria.usada && <span className="badge badge-muted">EN USO</span>}
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <button type="button" className="crud-link-btn" onClick={() => empezarEdicion(categoria)}>
                      Editar
                    </button>
                    {!categoria.usada && (
                      <button type="button" className="crud-delete-btn" onClick={() => handleEliminar(categoria.id)}>
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
