import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearEmpleado,
  desactivarEmpleado,
  listarEmpleados,
  reactivarEmpleado,
  actualizarEmpleado,
  type Empleado,
  type RegimenEmpleado,
} from '../api/personal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

const REGIMENES: RegimenEmpleado[] = ['CUENTA_AJENA', 'AUTONOMO'];

export function PersonalPage() {
  const { accessToken, logout } = useAuth();
  const [empleados, setEmpleados] = useState<Empleado[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [regimen, setRegimen] = useState<RegimenEmpleado>('CUENTA_AJENA');
  const [importeReferenciaDia, setImporteReferenciaDia] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState('');
  const [editRegimen, setEditRegimen] = useState<RegimenEmpleado>('CUENTA_AJENA');
  const [editImporteReferenciaDia, setEditImporteReferenciaDia] = useState('');

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
      setEmpleados(await listarEmpleados(accessToken));
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
      await crearEmpleado(accessToken, {
        nombre,
        rol,
        regimen,
        importeReferenciaDia: importeReferenciaDia ? Number(importeReferenciaDia) : undefined,
      });
      setNombre('');
      setRol('');
      setRegimen('CUENTA_AJENA');
      setImporteReferenciaDia('');
      setShowForm(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(empleado: Empleado) {
    setEditandoId(empleado.id);
    setEditNombre(empleado.nombre);
    setEditRol(empleado.rol);
    setEditRegimen(empleado.regimen);
    setEditImporteReferenciaDia(empleado.importeReferenciaDia ?? '');
  }

  async function handleActualizar(event: FormEvent, id: string) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await actualizarEmpleado(accessToken, id, {
        nombre: editNombre,
        rol: editRol,
        regimen: editRegimen,
        importeReferenciaDia: editImporteReferenciaDia ? Number(editImporteReferenciaDia) : undefined,
      });
      setEditandoId(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleDesactivar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await desactivarEmpleado(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleReactivar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await reactivarEmpleado(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Personal' }]} />
          <h1>Personal</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-toolbar">
          <button type="button" className="crud-btn-primary" onClick={() => setShowForm(true)}>
            Crear empleado
          </button>
        </div>

        <Modal open={showForm} onClose={() => setShowForm(false)} title="Crear empleado">
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Rol</span>
                <input
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  placeholder="ej. malabarista, técnico, taquillero"
                  required
                />
              </label>
              <label className="crud-field">
                <span>Régimen</span>
                <select value={regimen} onChange={(e) => setRegimen(e.target.value as RegimenEmpleado)}>
                  {REGIMENES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>Importe de referencia al día (€, opcional)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={importeReferenciaDia}
                  onChange={(e) => setImporteReferenciaDia(e.target.value)}
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
          {empleados === null && <p className="crud-empty">Cargando…</p>}
          {empleados?.length === 0 && <p className="crud-empty">No hay empleados todavía.</p>}
          {empleados?.map((empleado) => (
            <div key={empleado.id} className="crud-card">
              {editandoId === empleado.id ? (
                <form className="crud-form-row" onSubmit={(e) => handleActualizar(e, empleado.id)}>
                  <label className="crud-field">
                    <span>Nombre</span>
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      required
                    />
                  </label>
                  <label className="crud-field">
                    <span>Rol</span>
                    <input value={editRol} onChange={(e) => setEditRol(e.target.value)} required />
                  </label>
                  <label className="crud-field">
                    <span>Régimen</span>
                    <select
                      value={editRegimen}
                      onChange={(e) => setEditRegimen(e.target.value as RegimenEmpleado)}
                    >
                      {REGIMENES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="crud-field">
                    <span>Importe de referencia al día (€, opcional)</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editImporteReferenciaDia}
                      onChange={(e) => setEditImporteReferenciaDia(e.target.value)}
                    />
                  </label>
                  <div className="crud-form-actions">
                    <button
                      type="button"
                      className="crud-form-cancel"
                      onClick={() => setEditandoId(null)}
                    >
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
                    <Link
                      to={`/personal/${empleado.id}`}
                      className="crud-card-title crud-card-title-link"
                    >
                      {empleado.nombre}
                    </Link>
                    <div className="crud-card-meta">
                      <span>{empleado.rol}</span>
                      <span className="badge">{empleado.regimen}</span>
                      {empleado.importeReferenciaDia && <span>{empleado.importeReferenciaDia} €/día</span>}
                      {!empleado.activo && <span className="badge badge-muted">INACTIVO</span>}
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <button
                      type="button"
                      className="crud-link-btn"
                      onClick={() => empezarEdicion(empleado)}
                    >
                      Editar
                    </button>
                    {empleado.activo ? (
                      <button
                        type="button"
                        className="crud-delete-btn"
                        onClick={() => handleDesactivar(empleado.id)}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="crud-link-btn"
                        onClick={() => handleReactivar(empleado.id)}
                      >
                        Reactivar
                      </button>
                    )}
                  </div>
                  <span className="crud-card-chevron" aria-hidden="true">
                    ›
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
