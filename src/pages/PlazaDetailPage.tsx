import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  actualizarFecha,
  crearFecha,
  eliminarFecha,
  listarFechas,
  obtenerPlaza,
  type Fecha,
  type Plaza,
  type TipoActividad,
} from '../api/plazas';
import { listarGastos, type Gasto } from '../api/gastos';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

const TIPOS: TipoActividad[] = ['SHOW', 'TALLER', 'OTRO'];

export function PlazaDetailPage() {
  const { plazaId } = useParams<{ plazaId: string }>();
  const { accessToken, logout } = useAuth();
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [fechas, setFechas] = useState<Fecha[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [fechaInput, setFechaInput] = useState('');
  const [tipoActividad, setTipoActividad] = useState<TipoActividad>('SHOW');
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState('');
  const [editTipo, setEditTipo] = useState<TipoActividad>('SHOW');

  const [gastos, setGastos] = useState<Gasto[] | null>(null);

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
    if (!accessToken || !plazaId) return;
    try {
      const [p, f, g] = await Promise.all([
        obtenerPlaza(accessToken, plazaId),
        listarFechas(accessToken, plazaId),
        listarGastos(accessToken, { plazaId, tipo: 'PLAZA' }),
      ]);
      setPlaza(p);
      setFechas(f);
      setGastos(g);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, plazaId]);

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !plazaId) return;
    setError(null);
    setGuardando(true);
    try {
      await crearFecha(accessToken, plazaId, { fecha: fechaInput, tipoActividad });
      setFechaInput('');
      setTipoActividad('SHOW');
      setShowForm(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  function empezarEdicion(fecha: Fecha) {
    setEditandoId(fecha.id);
    setEditFecha(fecha.fecha);
    setEditTipo(fecha.tipoActividad);
  }

  async function handleActualizar(event: FormEvent, id: string) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await actualizarFecha(accessToken, id, { fecha: editFecha, tipoActividad: editTipo });
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
      await eliminarFecha(accessToken, id);
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
              { label: plaza?.nombre ?? '…' },
            ]}
          />
          <h1>{plaza?.nombre ?? 'Plaza'}</h1>
          {plaza && <p>{plaza.ubicacion}</p>}
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-toolbar">
          <button
            type="button"
            className="crud-btn-primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancelar' : 'Crear fecha'}
          </button>
        </div>

        {showForm && (
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha</span>
                <input
                  type="date"
                  value={fechaInput}
                  onChange={(e) => setFechaInput(e.target.value)}
                  required
                />
              </label>
              <label className="crud-field">
                <span>Tipo de actividad</span>
                <select
                  value={tipoActividad}
                  onChange={(e) => setTipoActividad(e.target.value as TipoActividad)}
                >
                  {TIPOS.map((t) => (
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
          {fechas === null && <p className="crud-empty">Cargando…</p>}
          {fechas?.length === 0 && <p className="crud-empty">No hay fechas todavía.</p>}
          {fechas?.map((fecha) => (
            <div key={fecha.id} className="crud-card">
              {editandoId === fecha.id ? (
                <form className="crud-form-row" onSubmit={(e) => handleActualizar(e, fecha.id)}>
                  <label className="crud-field">
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={editFecha}
                      onChange={(e) => setEditFecha(e.target.value)}
                      required
                    />
                  </label>
                  <label className="crud-field">
                    <span>Tipo de actividad</span>
                    <select
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value as TipoActividad)}
                    >
                      {TIPOS.map((t) => (
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
                      to={`/fechas/${fecha.id}`}
                      className="crud-card-title crud-card-title-link"
                    >
                      {fecha.fecha}
                      <span className="crud-card-chevron">›</span>
                    </Link>
                    <div>
                      <span className="badge">{fecha.tipoActividad}</span>
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <button
                      type="button"
                      className="crud-link-btn"
                      onClick={() => empezarEdicion(fecha)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="crud-delete-btn"
                      onClick={() => handleEliminar(fecha.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="crud-header-row">
          <h2>Gastos</h2>
        </div>

        <div className="crud-list">
          {gastos === null && <p className="crud-empty">Cargando…</p>}
          {gastos?.length === 0 && <p className="crud-empty">No hay gastos registrados.</p>}
          {gastos?.map((gasto) => (
            <div key={gasto.id} className="crud-card">
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">
                    {gasto.descripcion} <span className="badge">{gasto.categoriaPlaza}</span>
                    {gasto.fechaId && <span className="badge">FECHA CONCRETA</span>}
                  </div>
                  <p className="crud-card-subtitle">{gasto.fecha}</p>
                </div>
                <div className="crud-card-actions">
                  <strong>{gasto.importeTotal} €</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
