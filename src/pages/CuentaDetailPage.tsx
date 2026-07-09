import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  activarCuenta,
  actualizarCuenta,
  desactivarCuenta,
  eliminarCuenta,
  listarMovimientos,
  obtenerCuenta,
  type CuentaPublica,
  type MovimientoCuenta,
} from '../api/tesoreria';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

export function CuentaDetailPage() {
  const { cuentaId } = useParams<{ cuentaId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();
  const [cuenta, setCuenta] = useState<CuentaPublica | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCuenta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showEditar, setShowEditar] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editUsableEnTaquilla, setEditUsableEnTaquilla] = useState(false);
  const [editUsableEnBar, setEditUsableEnBar] = useState(false);

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
    if (!accessToken || !cuentaId) return;
    try {
      const [c, m] = await Promise.all([obtenerCuenta(accessToken, cuentaId), listarMovimientos(accessToken, cuentaId)]);
      setCuenta(c);
      setMovimientos(m);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, cuentaId]);

  function abrirEditar() {
    if (!cuenta) return;
    setEditNombre(cuenta.nombre);
    setEditUsableEnTaquilla(cuenta.usableEnTaquilla);
    setEditUsableEnBar(cuenta.usableEnBar);
    setShowEditar(true);
  }

  async function handleEditar(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !cuentaId) return;
    setError(null);
    try {
      await actualizarCuenta(accessToken, cuentaId, {
        nombre: editNombre,
        usableEnTaquilla: editUsableEnTaquilla,
        usableEnBar: editUsableEnBar,
      });
      setShowEditar(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleToggleActiva() {
    if (!accessToken || !cuentaId || !cuenta) return;
    setError(null);
    try {
      if (cuenta.activa) await desactivarCuenta(accessToken, cuentaId);
      else await activarCuenta(accessToken, cuentaId);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar() {
    if (!accessToken || !cuentaId) return;
    setError(null);
    try {
      await eliminarCuenta(accessToken, cuentaId);
      navigate('/tesoreria');
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
              { label: 'Tesorería', to: '/tesoreria' },
              { label: cuenta?.nombre ?? '…' },
            ]}
          />
          <h1>{cuenta?.nombre ?? 'Cuenta'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <Modal open={showEditar} onClose={() => setShowEditar(false)} title="Editar cuenta">
          <form className="crud-form" onSubmit={handleEditar}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
              </label>
            </div>
            <div className="crud-form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={editUsableEnTaquilla}
                  onChange={(e) => setEditUsableEnTaquilla(e.target.checked)}
                />
                <span>Usable en taquilla</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={editUsableEnBar} onChange={(e) => setEditUsableEnBar(e.target.checked)} />
                <span>Usable en bar</span>
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowEditar(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>

        {cuenta && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{cuenta.saldo} €</div>
              <div className="detail-hero-meta">
                <span className="badge">{cuenta.tipo === 'BANCO' ? 'Banco' : 'Caja'}</span>
                {cuenta.usableEnTaquilla && <span className="badge badge-muted">Taquilla</span>}
                {cuenta.usableEnBar && <span className="badge badge-muted">Bar</span>}
                <span className={cuenta.activa ? 'badge badge-success' : 'badge badge-danger'}>
                  {cuenta.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
            <div className="detail-footer">
              <button type="button" className="crud-link-btn" onClick={abrirEditar}>
                Editar
              </button>
              <button type="button" className="crud-link-btn" onClick={handleToggleActiva}>
                {cuenta.activa ? 'Desactivar' : 'Activar'}
              </button>
              <button type="button" className="crud-delete-btn" onClick={handleEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        )}

        <div className="crud-header-row">
          <h2>Movimientos</h2>
        </div>

        <div className="crud-list">
          {movimientos === null && <p className="crud-empty">Cargando…</p>}
          {movimientos?.length === 0 && <p className="crud-empty">No hay movimientos todavía.</p>}
          {movimientos?.map((m) => {
            const positivo = Number(m.importe) >= 0;
            return (
              <div key={m.journalEntryId} className="crud-card">
                <div className="crud-card-row">
                  <div className="crud-card-info">
                    <div className="crud-card-title">{m.descripcion}</div>
                    <div className="crud-card-meta">
                      <span>{new Date(m.fecha).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                  <div className="crud-card-actions">
                    <strong style={{ color: positivo ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {positivo ? '+' : ''}
                      {m.importe} €
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
