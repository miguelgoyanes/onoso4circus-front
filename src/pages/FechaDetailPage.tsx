import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  actualizarPase,
  crearPase,
  eliminarPase,
  listarPases,
  obtenerFecha,
  obtenerPlaza,
  type Fecha,
  type Pase,
  type Plaza,
} from '../api/plazas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

export function FechaDetailPage() {
  const { fechaId } = useParams<{ fechaId: string }>();
  const { accessToken, logout } = useAuth();
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [pases, setPases] = useState<Pase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [hora, setHora] = useState('');
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editHora, setEditHora] = useState('');
  const [editNombre, setEditNombre] = useState('');

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
    if (!accessToken || !fechaId) return;
    try {
      const [f, p] = await Promise.all([
        obtenerFecha(accessToken, fechaId),
        listarPases(accessToken, fechaId),
      ]);
      setFecha(f);
      setPases(p);
      setPlaza(await obtenerPlaza(accessToken, f.plazaId));
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, fechaId]);

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !fechaId) return;
    setError(null);
    setGuardando(true);
    try {
      await crearPase(accessToken, fechaId, { hora, nombre: nombre || undefined });
      setHora('');
      setNombre('');
      setShowForm(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(pase: Pase) {
    setEditandoId(pase.id);
    setEditHora(pase.hora);
    setEditNombre(pase.nombre ?? '');
  }

  async function handleActualizar(event: FormEvent, id: string) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await actualizarPase(accessToken, id, { hora: editHora, nombre: editNombre || undefined });
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
      await eliminarPase(accessToken, id);
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
              { label: 'Plazas', to: '/plazas' },
              { label: plaza?.nombre ?? '…', to: plaza ? `/plazas/${plaza.id}` : undefined },
              { label: fecha?.fecha ?? '…' },
            ]}
          />
          <h1>{fecha?.fecha ?? 'Fecha'}</h1>
          {fecha && <p>{fecha.tipoActividad}</p>}
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-toolbar">
          <button type="button" className="crud-btn-primary" onClick={() => setShowForm(true)}>
            Crear pase
          </button>
        </div>

        <Modal open={showForm} onClose={() => setShowForm(false)} title="Crear pase">
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Hora</span>
                <input
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  placeholder="17:00"
                  required
                />
              </label>
              <label className="crud-field">
                <span>Nombre (opcional)</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Pase de tarde"
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
          {pases === null && <p className="crud-empty">Cargando…</p>}
          {pases?.length === 0 && <p className="crud-empty">No hay pases todavía.</p>}
          {pases?.map((pase) => (
            <div key={pase.id} className="crud-card">
              {editandoId === pase.id ? (
                <form className="crud-form-row" onSubmit={(e) => handleActualizar(e, pase.id)}>
                  <label className="crud-field">
                    <span>Hora</span>
                    <input
                      value={editHora}
                      onChange={(e) => setEditHora(e.target.value)}
                      required
                    />
                  </label>
                  <label className="crud-field">
                    <span>Nombre (opcional)</span>
                    <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
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
                    <div className="crud-card-title">{pase.hora}</div>
                    {pase.nombre && <p className="crud-card-subtitle">{pase.nombre}</p>}
                  </div>
                  <div className="crud-card-actions">
                    <button
                      type="button"
                      className="crud-link-btn"
                      onClick={() => empezarEdicion(pase)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="crud-delete-btn"
                      onClick={() => handleEliminar(pase.id)}
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
