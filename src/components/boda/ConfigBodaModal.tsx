import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { actualizarConfigBoda, type ConfigBoda } from '../../api/boda';
import { Modal } from '../Modal';

interface Props {
  open: boolean;
  config: ConfigBoda | null;
  onClose: () => void;
  onGuardado: () => void;
  onError: (err: unknown) => void;
}

// datetime-local trabaja en hora local sin zona: convertimos desde/hacia ISO.
function aInputLocal(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  const desfase = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}

export function ConfigBodaModal({ open, config, onClose, onGuardado, onError }: Props) {
  const { accessToken } = useAuth();
  const [fechaLimite, setFechaLimite] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [urlBase, setUrlBase] = useState('');
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open || !config) return;
    setFechaLimite(aInputLocal(config.fechaLimiteEdicion));
    setMensaje(config.mensajeWhatsapp);
    setUrlBase(config.urlBaseInvitacion);
    setActivo(config.activo);
  }, [open, config]);

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await actualizarConfigBoda(accessToken, {
        fechaLimiteEdicion: fechaLimite ? new Date(fechaLimite).toISOString() : null,
        mensajeWhatsapp: mensaje,
        urlBaseInvitacion: urlBase,
        activo,
      });
      onGuardado();
      onClose();
    } catch (err) {
      onError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajustes de la invitación">
      <form className="crud-form" onSubmit={guardar}>
        <label className="crud-field">
          <span>Fecha límite para que los invitados cambien sus respuestas (vacía = sin límite)</span>
          <input type="datetime-local" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
        </label>
        <label className="crud-field">
          <span>Mensaje de WhatsApp ({'{nombre}'} y {'{enlace}'} se rellenan solos)</span>
          <textarea rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} required />
        </label>
        <label className="crud-field">
          <span>Dirección de la web de invitados</span>
          <input type="url" value={urlBase} onChange={(e) => setUrlBase(e.target.value)} required />
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span>Invitaciones activas (si se desmarca, todos los enlaces dejan de funcionar)</span>
        </label>
        <div className="crud-form-actions">
          <button type="button" className="crud-form-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="crud-btn-primary" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
