import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  activarTipoEntrada,
  actualizarTipoEntrada,
  crearTipoEntrada,
  desactivarTipoEntrada,
  eliminarTipoEntrada,
  listarTiposEntrada,
  moverTipoEntrada,
  type DireccionOrden,
  type TipoEntrada,
} from '../api/taquilla';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

export function TiposEntradaPage() {
  const { accessToken, logout } = useAuth();
  const [tipos, setTipos] = useState<TipoEntrada[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [aplicaIva, setAplicaIva] = useState(false);
  const [color, setColor] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editAplicaIva, setEditAplicaIva] = useState(false);
  const [editColor, setEditColor] = useState('');

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
      setTipos(await listarTiposEntrada(accessToken));
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
      await crearTipoEntrada(accessToken, { nombre, precio: Number(precio), aplicaIva, color: color || undefined });
      setNombre('');
      setPrecio('');
      setAplicaIva(false);
      setColor('');
      setShowForm(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(tipo: TipoEntrada) {
    setEditandoId(tipo.id);
    setEditNombre(tipo.nombre);
    setEditPrecio(tipo.precio);
    setEditAplicaIva(tipo.aplicaIva);
    setEditColor(tipo.color ?? '');
  }

  async function handleActualizar(event: FormEvent, id: string) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await actualizarTipoEntrada(accessToken, id, {
        nombre: editNombre,
        precio: Number(editPrecio),
        aplicaIva: editAplicaIva,
        color: editColor || undefined,
      });
      setEditandoId(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleMover(id: string, direccion: DireccionOrden) {
    if (!accessToken) return;
    setError(null);
    try {
      setTipos(await moverTipoEntrada(accessToken, id, direccion));
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleActivar(tipo: TipoEntrada) {
    if (!accessToken) return;
    setError(null);
    try {
      const actualizado = tipo.activo ? await desactivarTipoEntrada(accessToken, tipo.id) : await activarTipoEntrada(accessToken, tipo.id);
      setTipos((prev) => prev?.map((t) => (t.id === actualizado.id ? actualizado : t)) ?? prev);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarTipoEntrada(accessToken, id);
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
              { label: 'Tipos de entrada' },
            ]}
          />
          <h1>Tipos de entrada</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-toolbar">
          <button type="button" className="crud-btn-primary" onClick={() => setShowForm(true)}>
            Crear tipo de entrada
          </button>
        </div>

        <Modal open={showForm} onClose={() => setShowForm(false)} title="Crear tipo de entrada">
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Precio (€)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Color (opcional)</span>
                <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="ej. #ff6a00" />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={aplicaIva} onChange={(e) => setAplicaIva(e.target.checked)} />
              <span>Admite IVA repercutido</span>
            </label>
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
          {tipos === null && <p className="crud-empty">Cargando…</p>}
          {tipos?.length === 0 && <p className="crud-empty">No hay tipos de entrada todavía.</p>}
          {tipos?.map((tipo, indice) => (
            <div key={tipo.id} className="crud-card" style={tipo.activo ? undefined : { opacity: 0.6 }}>
              {editandoId === tipo.id ? (
                <form className="crud-form-row" onSubmit={(e) => handleActualizar(e, tipo.id)}>
                  <label className="crud-field">
                    <span>Nombre</span>
                    <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
                  </label>
                  <label className="crud-field">
                    <span>Precio (€)</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editPrecio}
                      onChange={(e) => setEditPrecio(e.target.value)}
                      required
                    />
                  </label>
                  <label className="crud-field">
                    <span>Color</span>
                    <input value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={editAplicaIva} onChange={(e) => setEditAplicaIva(e.target.checked)} />
                    <span>Admite IVA</span>
                  </label>
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
                  <div className="crud-card-orden">
                    <button
                      type="button"
                      className="crud-card-orden-btn"
                      disabled={indice === 0}
                      onClick={() => handleMover(tipo.id, 'ARRIBA')}
                      aria-label="Subir"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="crud-card-orden-btn"
                      disabled={indice === tipos.length - 1}
                      onClick={() => handleMover(tipo.id, 'ABAJO')}
                      aria-label="Bajar"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="crud-card-info">
                    <div className="crud-card-title">{tipo.nombre}</div>
                    <div className="crud-card-meta">
                      <span className="badge">{tipo.precio} €</span>
                      {tipo.aplicaIva && <span className="badge badge-muted">IVA</span>}
                      {!tipo.activo && <span className="badge badge-muted">INACTIVO</span>}
                      {tipo.usado && <span className="badge badge-muted">EN USO</span>}
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <button type="button" className="crud-link-btn" onClick={() => empezarEdicion(tipo)}>
                      Editar
                    </button>
                    <button type="button" className="crud-link-btn" onClick={() => handleActivar(tipo)}>
                      {tipo.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    {!tipo.usado && (
                      <button type="button" className="crud-delete-btn" onClick={() => handleEliminar(tipo.id)}>
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
