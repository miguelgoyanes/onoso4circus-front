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
  type ModalidadTipoEntrada,
  type TipoEntrada,
} from '../api/taquilla';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import { COLOR_POR_DEFECTO, colorTextoLegible } from '../utils/color';
import '../styles/crud-page.css';

export function TiposEntradaPage() {
  const { accessToken, logout } = useAuth();
  const [tipos, setTipos] = useState<TipoEntrada[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [aplicaIva, setAplicaIva] = useState(false);
  const [color, setColor] = useState(COLOR_POR_DEFECTO);
  const [modalidad, setModalidad] = useState<ModalidadTipoEntrada>('PRESENCIAL');
  const [guardando, setGuardando] = useState(false);

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

  function abrirCrear() {
    setEditandoId(null);
    setNombre('');
    setPrecio('');
    setAplicaIva(false);
    setColor(COLOR_POR_DEFECTO);
    setModalidad('PRESENCIAL');
    setModalAbierto(true);
  }

  function abrirEdicion(tipo: TipoEntrada) {
    setEditandoId(tipo.id);
    setNombre(tipo.nombre);
    setPrecio(tipo.precio);
    setAplicaIva(tipo.aplicaIva);
    setColor(tipo.color ?? COLOR_POR_DEFECTO);
    setModalidad(tipo.modalidad);
    setModalAbierto(true);
  }

  async function handleGuardar(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setGuardando(true);
    try {
      const datos = { nombre, precio: Number(precio), aplicaIva, color, modalidad };
      if (editandoId) {
        await actualizarTipoEntrada(accessToken, editandoId, datos);
      } else {
        await crearTipoEntrada(accessToken, datos);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
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
          <button type="button" className="crud-btn-primary" onClick={abrirCrear}>
            Crear tipo de entrada
          </button>
        </div>

        <Modal
          open={modalAbierto}
          onClose={() => setModalAbierto(false)}
          title={editandoId ? 'Editar tipo de entrada' : 'Crear tipo de entrada'}
        >
          <form className="crud-form" onSubmit={handleGuardar}>
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
                <span>Color</span>
                <input
                  type="color"
                  className="crud-color-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>
              <label className="crud-field">
                <span>Modalidad</span>
                <select value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadTipoEntrada)}>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="ONLINE">Online</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={aplicaIva} onChange={(e) => setAplicaIva(e.target.checked)} />
              <span>Admite IVA repercutido</span>
            </label>

            <div className="crud-field">
              <span>Vista previa</span>
              <div
                className="tipo-entrada-tile tipo-entrada-tile-preview"
                style={{ background: color, color: colorTextoLegible(color) }}
              >
                <span className="tipo-entrada-tile-nombre">{nombre || 'Nombre'}</span>
                <span className="tipo-entrada-tile-precio">{precio ? `${precio} €` : '0 €'}</span>
              </div>
            </div>

            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setModalAbierto(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        <div className="crud-list">
          {tipos === null && <p className="crud-empty">Cargando…</p>}
          {tipos?.length === 0 && <p className="crud-empty">No hay tipos de entrada todavía.</p>}
          {tipos?.map((tipo, indice) => (
            <div key={tipo.id} className="crud-card" style={tipo.activo ? undefined : { opacity: 0.6 }}>
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
                    <span className="badge badge-muted">{tipo.modalidad === 'PRESENCIAL' ? 'Presencial' : 'Online'}</span>
                    {tipo.aplicaIva && <span className="badge badge-muted">IVA</span>}
                    {!tipo.activo && <span className="badge badge-muted">INACTIVO</span>}
                    {tipo.usado && <span className="badge badge-muted">EN USO</span>}
                  </div>
                </div>
                <div className="crud-card-actions">
                  <button type="button" className="crud-link-btn" onClick={() => abrirEdicion(tipo)}>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
