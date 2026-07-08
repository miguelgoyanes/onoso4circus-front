import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearPlaza,
  eliminarPlaza,
  listarPlazas,
  actualizarPlaza,
  type Plaza,
  type TipoPlaza,
} from '../api/plazas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

const TIPOS_PLAZA: TipoPlaza[] = ['CON_CIRCO', 'SIN_CIRCO'];

export function PlazasPage() {
  const { accessToken, logout } = useAuth();
  const [plazas, setPlazas] = useState<Plaza[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [tipoPlaza, setTipoPlaza] = useState<TipoPlaza>('CON_CIRCO');
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editUbicacion, setEditUbicacion] = useState('');
  const [editTipoPlaza, setEditTipoPlaza] = useState<TipoPlaza>('CON_CIRCO');

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
      setPlazas(await listarPlazas(accessToken));
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
      await crearPlaza(accessToken, { nombre, ubicacion, tipoPlaza });
      setNombre('');
      setUbicacion('');
      setTipoPlaza('CON_CIRCO');
      setShowForm(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(plaza: Plaza) {
    setEditandoId(plaza.id);
    setEditNombre(plaza.nombre);
    setEditUbicacion(plaza.ubicacion);
    setEditTipoPlaza(plaza.tipoPlaza);
  }

  async function handleActualizar(event: FormEvent, id: string) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await actualizarPlaza(accessToken, id, {
        nombre: editNombre,
        ubicacion: editUbicacion,
        tipoPlaza: editTipoPlaza,
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
      await eliminarPlaza(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Plazas' }]} />
          <h1>Plazas</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-toolbar">
          <button
            type="button"
            className="crud-btn-primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancelar' : 'Crear plaza'}
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
                <span>Ubicación</span>
                <input
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  required
                />
              </label>
              <label className="crud-field">
                <span>Tipo de plaza</span>
                <select
                  value={tipoPlaza}
                  onChange={(e) => setTipoPlaza(e.target.value as TipoPlaza)}
                >
                  {TIPOS_PLAZA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
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
          {plazas === null && <p className="crud-empty">Cargando…</p>}
          {plazas?.length === 0 && <p className="crud-empty">No hay plazas todavía.</p>}
          {plazas?.map((plaza) => (
            <div key={plaza.id} className="crud-card">
              {editandoId === plaza.id ? (
                <form className="crud-form-row" onSubmit={(e) => handleActualizar(e, plaza.id)}>
                  <label className="crud-field">
                    <span>Nombre</span>
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      required
                    />
                  </label>
                  <label className="crud-field">
                    <span>Ubicación</span>
                    <input
                      value={editUbicacion}
                      onChange={(e) => setEditUbicacion(e.target.value)}
                      required
                    />
                  </label>
                  <label className="crud-field">
                    <span>Tipo de plaza</span>
                    <select
                      value={editTipoPlaza}
                      onChange={(e) => setEditTipoPlaza(e.target.value as TipoPlaza)}
                    >
                      {TIPOS_PLAZA.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
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
                      to={`/plazas/${plaza.id}`}
                      className="crud-card-title crud-card-title-link"
                    >
                      {plaza.nombre}
                      <span className="crud-card-chevron">›</span>
                    </Link>
                    <p className="crud-card-subtitle">
                      {plaza.ubicacion} · <span className="badge">{plaza.tipoPlaza}</span>
                    </p>
                  </div>
                  <div className="crud-card-actions">
                    <button
                      type="button"
                      className="crud-link-btn"
                      onClick={() => empezarEdicion(plaza)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="crud-delete-btn"
                      onClick={() => handleEliminar(plaza.id)}
                    >
                      Eliminar
                    </button>
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
