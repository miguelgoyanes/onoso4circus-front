import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  activarUsuario,
  cambiarRolUsuario,
  crearUsuario,
  desactivarUsuario,
  listarUsuarios,
  resetearPasswordUsuario,
  type Rol,
  type UsuarioPublico,
} from '../api/usuarios';
import './UsuariosPage.css';

const ROLES: Rol[] = ['ADMIN', 'OPERADOR'];

export function UsuariosPage() {
  const { accessToken, user, logout } = useAuth();
  const esOwner = user?.rol === 'OWNER';

  const [usuarios, setUsuarios] = useState<UsuarioPublico[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('OPERADOR');
  const [creando, setCreando] = useState(false);

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [reseteando, setReseteando] = useState(false);

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

  async function cargarUsuarios() {
    if (!accessToken) return;
    try {
      const data = await listarUsuarios(accessToken);
      setUsuarios(data);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setCreando(true);
    try {
      await crearUsuario(accessToken, { nombre, username, password, rol });
      setNombre('');
      setUsername('');
      setPassword('');
      setRol('OPERADOR');
      setShowForm(false);
      await cargarUsuarios();
    } catch (err) {
      handleApiError(err);
    } finally {
      setCreando(false);
    }
  }

  async function handleDesactivar(id: string) {
    if (!accessToken) return;
    setError(null);
    setPendingIds((current) => new Set(current).add(id));
    try {
      await desactivarUsuario(accessToken, id);
      await cargarUsuarios();
    } catch (err) {
      handleApiError(err);
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleActivar(id: string) {
    if (!accessToken) return;
    setError(null);
    setPendingIds((current) => new Set(current).add(id));
    try {
      await activarUsuario(accessToken, id);
      await cargarUsuarios();
    } catch (err) {
      handleApiError(err);
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleCambiarRol(id: string, nuevoRol: Rol) {
    if (!accessToken) return;
    setError(null);
    setPendingIds((current) => new Set(current).add(id));
    try {
      await cambiarRolUsuario(accessToken, id, nuevoRol);
      await cargarUsuarios();
    } catch (err) {
      handleApiError(err);
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleResetearPassword(event: FormEvent, id: string) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setReseteando(true);
    try {
      await resetearPasswordUsuario(accessToken, id, resetPassword);
      setResetTargetId(null);
      setResetPassword('');
    } catch (err) {
      handleApiError(err);
    } finally {
      setReseteando(false);
    }
  }

  return (
    <div className="usuarios-page">
      <div className="usuarios-container">
        <div className="usuarios-header">
          <h1>Gestión de usuarios</h1>
          <Link to="/" className="usuarios-back">
            ← Volver
          </Link>
        </div>

        {error && <p className="usuarios-error">{error}</p>}

        <div className="usuarios-toolbar">
          <button
            type="button"
            className="usuarios-crear-btn"
            onClick={() => setShowForm((value) => !value)}
          >
            {showForm ? 'Cancelar' : 'Crear usuario'}
          </button>
        </div>

        {showForm && (
          <form className="usuarios-form" onSubmit={handleCrear}>
            <div className="usuarios-form-row">
              <label className="usuarios-field">
                <span>Nombre</span>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  required
                />
              </label>
              <label className="usuarios-field">
                <span>Usuario</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  pattern="[a-z0-9-]+"
                  title="Solo minúsculas, números y guiones"
                  required
                />
              </label>
            </div>
            <div className="usuarios-form-row">
              <label className="usuarios-field">
                <span>Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <label className="usuarios-field">
                <span>Rol</span>
                <select value={rol} onChange={(event) => setRol(event.target.value as Rol)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="usuarios-form-actions">
              <button type="submit" className="usuarios-crear-btn" disabled={creando}>
                {creando ? 'Creando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        <div className="usuarios-list">
          {usuarios === null && <p className="usuarios-empty">Cargando…</p>}
          {usuarios?.length === 0 && <p className="usuarios-empty">No hay usuarios todavía.</p>}
          {usuarios?.map((usuario) => {
            const pending = pendingIds.has(usuario.id);
            const esFilaOwner = usuario.rol === 'OWNER';
            return (
              <div key={usuario.id}>
                <div
                  className={`usuario-card ${usuario.activo ? '' : 'usuario-inactivo'}`}
                >
                  <div className="usuario-info">
                    <div className="usuario-nombre">{usuario.nombre}</div>
                    <p className="usuario-username">{usuario.username}</p>
                  </div>
                  <div className="usuario-badges">
                    <span className="badge badge-rol">{usuario.rol}</span>
                    <span
                      className={`badge ${usuario.activo ? 'badge-activo' : 'badge-inactivo'}`}
                    >
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="usuario-actions">
                    {!esFilaOwner && (
                      <select
                        value={usuario.rol}
                        disabled={pending}
                        onChange={(event) =>
                          handleCambiarRol(usuario.id, event.target.value as Rol)
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                    {!esFilaOwner &&
                      (usuario.activo ? (
                        <button
                          type="button"
                          className="usuario-desactivar-btn"
                          disabled={pending}
                          onClick={() => handleDesactivar(usuario.id)}
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="usuario-activar-btn"
                          disabled={pending}
                          onClick={() => handleActivar(usuario.id)}
                        >
                          Activar
                        </button>
                      ))}
                    {esOwner && (
                      <button
                        type="button"
                        className="usuario-reset-btn"
                        onClick={() =>
                          setResetTargetId((current) =>
                            current === usuario.id ? null : usuario.id,
                          )
                        }
                      >
                        Resetear contraseña
                      </button>
                    )}
                  </div>
                </div>

                {esOwner && resetTargetId === usuario.id && (
                  <form
                    className="usuarios-form usuarios-reset-form"
                    onSubmit={(event) => handleResetearPassword(event, usuario.id)}
                  >
                    <label className="usuarios-field">
                      <span>Nueva contraseña para {usuario.nombre}</span>
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(event) => setResetPassword(event.target.value)}
                        minLength={8}
                        required
                      />
                    </label>
                    <div className="usuarios-form-actions">
                      <button
                        type="button"
                        className="usuarios-form-cancel"
                        onClick={() => {
                          setResetTargetId(null);
                          setResetPassword('');
                        }}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="usuarios-crear-btn" disabled={reseteando}>
                        {reseteando ? 'Guardando…' : 'Confirmar'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
