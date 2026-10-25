import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { importarInvitadosBoda } from '../../api/boda';
import { Modal } from '../Modal';
import { leerArchivoCsv, leerCsvInvitados, plantillaCsv, type ResultadoCsv } from './csvInvitados';

interface Props {
  open: boolean;
  onClose: () => void;
  onImportado: () => void;
  onError: (err: unknown) => void;
}

// Importa la lista de invitados desde un CSV (formato en csvInvitados.ts): se elige el archivo, se ve cuántas
// invitaciones y personas salen y qué filas tienen errores, y se importa.
export function ImportarInvitadosModal({ open, onClose, onImportado, onError }: Props) {
  const { accessToken } = useAuth();
  const [archivo, setArchivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCsv | null>(null);
  const [guardando, setGuardando] = useState(false);
  const items = resultado?.items ?? [];

  function cerrar() {
    setArchivo(null);
    setResultado(null);
    onClose();
  }

  async function elegir(event: ChangeEvent<HTMLInputElement>) {
    const elegido = event.target.files?.[0];
    event.target.value = '';
    if (!elegido) return;
    setArchivo(elegido.name);
    setResultado(leerCsvInvitados(await leerArchivoCsv(elegido)));
  }

  function descargarPlantilla() {
    const url = URL.createObjectURL(new Blob([plantillaCsv()], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla-invitados.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  async function importar(event: FormEvent) {
    event.preventDefault();
    if (items.length === 0) return;
    setGuardando(true);
    try {
      await importarInvitadosBoda(accessToken, items);
      onImportado();
      cerrar();
    } catch (err) {
      onError(err);
    } finally {
      setGuardando(false);
    }
  }

  const grupos = new Set(items.map((i) => i.grupo));

  return (
    <Modal open={open} onClose={cerrar} title="Importar invitados">
      <form className="crud-form" onSubmit={importar}>
        <label className="crud-field">
          <span>
            Archivo CSV con una fila por invitación. Columnas: grupo, nombre, apellidos, telefono, acompanantes (nombres
            separados por |), sin_nombre (cuántos más vienen sin saber su nombre), tratamiento (cómo se nombra la
            invitación) y notas. Solo grupo y nombre son obligatorias.
          </span>
          <input type="file" accept=".csv,text/csv" onChange={elegir} />
        </label>
        <button type="button" className="boda-btn" onClick={descargarPlantilla} style={{ alignSelf: 'flex-start' }}>
          Descargar plantilla
        </button>
        {resultado && (
          <div className="crud-empty" style={{ margin: 0, textAlign: 'left' }}>
            <p style={{ margin: 0 }}>
              {archivo}: {items.length} invitación(es), {resultado.personas} persona(s) en {grupos.size} grupo(s). Los
              grupos que no existan se crean solos.
            </p>
            {resultado.errores.length > 0 && (
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
                {resultado.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="crud-form-actions">
          <button type="button" className="crud-form-cancel" onClick={cerrar}>
            Cancelar
          </button>
          <button type="submit" className="crud-btn-primary" disabled={guardando || items.length === 0}>
            {guardando ? 'Importando…' : `Importar ${items.length}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
