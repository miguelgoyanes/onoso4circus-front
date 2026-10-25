import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  actualizarGrupoBoda,
  actualizarPreguntaBoda,
  crearGrupoBoda,
  crearPreguntaBoda,
  listarGruposBoda,
  listarPreguntasBoda,
  type AmbitoBoda,
  type GrupoBoda,
  type PreguntaBoda,
  type TipoPregunta,
} from '../api/boda';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

const TIPOS: { valor: TipoPregunta; etiqueta: string }[] = [
  { valor: 'texto', etiqueta: 'Texto corto' },
  { valor: 'texto_largo', etiqueta: 'Texto largo' },
  { valor: 'si_no', etiqueta: 'Sí / No' },
  { valor: 'opcion', etiqueta: 'Una opción' },
  { valor: 'multiopcion', etiqueta: 'Varias opciones' },
  { valor: 'numero', etiqueta: 'Número' },
  { valor: 'fecha', etiqueta: 'Fecha' },
];

interface Formulario {
  id: string | null;
  clave: string;
  texto: string;
  textoPlural: string;
  ambito: AmbitoBoda;
  tipo: TipoPregunta;
  opciones: string;
  obligatoria: boolean;
  permiteNota: boolean;
  editablePorInvitado: boolean;
  condicionClave: string;
  condicionValor: 'si' | 'no';
  orden: string;
  activa: boolean;
  grupoIds: string[];
}

function formularioVacio(orden: number): Formulario {
  return {
    id: null,
    clave: '',
    texto: '',
    textoPlural: '',
    ambito: 'invitacion',
    tipo: 'texto',
    opciones: '',
    obligatoria: true,
    permiteNota: false,
    editablePorInvitado: true,
    condicionClave: '',
    condicionValor: 'si',
    orden: String(orden),
    activa: true,
    grupoIds: [],
  };
}

function aFormulario(p: PreguntaBoda): Formulario {
  return {
    id: p.id,
    clave: p.clave,
    texto: p.texto,
    textoPlural: p.textoPlural ?? '',
    ambito: p.ambito,
    tipo: p.tipo,
    opciones: (p.opciones ?? []).join('\n'),
    obligatoria: p.obligatoria,
    permiteNota: p.permiteNota,
    editablePorInvitado: p.editablePorInvitado,
    condicionClave: p.condicion?.clave ?? '',
    condicionValor: p.condicion?.igual === false ? 'no' : 'si',
    orden: String(p.orden),
    activa: p.activa,
    grupoIds: p.grupoIds,
  };
}

export function BodaPreguntasPage() {
  const { accessToken, logout } = useAuth();
  const [preguntas, setPreguntas] = useState<PreguntaBoda[] | null>(null);
  const [grupos, setGrupos] = useState<GrupoBoda[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nuevoGrupo, setNuevoGrupo] = useState('');

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
      const [p, g] = await Promise.all([listarPreguntasBoda(accessToken), listarGruposBoda(accessToken)]);
      setPreguntas(p);
      setGrupos(g);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function actualizar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((f) => (f ? { ...f, [campo]: valor } : f));
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    setGuardando(true);
    try {
      const conOpciones = form.tipo === 'opcion' || form.tipo === 'multiopcion';
      const datos = {
        texto: form.texto,
        textoPlural: form.textoPlural.trim() || null,
        ambito: form.ambito,
        tipo: form.tipo,
        opciones: conOpciones ? form.opciones.split('\n').map((o) => o.trim()).filter(Boolean) : null,
        obligatoria: form.obligatoria,
        permiteNota: form.permiteNota,
        editablePorInvitado: form.editablePorInvitado,
        condicion: form.condicionClave ? { clave: form.condicionClave, igual: form.condicionValor === 'si' } : null,
        orden: Number(form.orden) || 0,
        activa: form.activa,
        grupoIds: form.grupoIds,
      };
      if (form.id) await actualizarPreguntaBoda(accessToken, form.id, datos);
      else await crearPreguntaBoda(accessToken, { ...datos, clave: form.clave });
      setForm(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function crearGrupo(event: FormEvent) {
    event.preventDefault();
    if (!nuevoGrupo.trim()) return;
    try {
      await crearGrupoBoda(accessToken, nuevoGrupo.trim());
      setNuevoGrupo('');
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function alternarGrupo(g: GrupoBoda) {
    try {
      await actualizarGrupoBoda(accessToken, g.id, { activo: !g.activo });
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function renombrarGrupo(g: GrupoBoda) {
    const nombre = window.prompt('Nuevo nombre del grupo', g.nombre);
    if (!nombre || nombre.trim() === g.nombre) return;
    try {
      await actualizarGrupoBoda(accessToken, g.id, { nombre: nombre.trim() });
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  const preguntasSiNo = (preguntas ?? []).filter((p) => p.tipo === 'si_no' && p.id !== form?.id);
  const conOpciones = form?.tipo === 'opcion' || form?.tipo === 'multiopcion';

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[{ label: 'Inicio', to: '/' }, { label: 'Boda', to: '/boda' }, { label: 'Preguntas y grupos' }]}
          />
          <h1>Boda · preguntas y grupos</h1>
          <p>Las preguntas se muestran a los invitados en este orden</p>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-header-row">
          <h2>Grupos</h2>
        </div>
        <div className="crud-list">
          {grupos.map((g) => (
            <div key={g.id} className="crud-card">
              <div className="crud-card-info">
                <div className="crud-card-title">{g.nombre}</div>
                {!g.activo && (
                  <div className="crud-card-meta">
                    <span className="badge badge-danger">Desactivado</span>
                  </div>
                )}
              </div>
              <div className="crud-card-actions">
                <button type="button" className="crud-link-btn" onClick={() => renombrarGrupo(g)}>
                  Renombrar
                </button>
                <button type="button" className="crud-link-btn" onClick={() => alternarGrupo(g)}>
                  {g.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <form className="crud-toolbar" style={{ gap: '0.5rem', justifyContent: 'flex-start' }} onSubmit={crearGrupo}>
          <input placeholder="Nuevo grupo" value={nuevoGrupo} onChange={(e) => setNuevoGrupo(e.target.value)} />
          <button type="submit" className="crud-btn-primary" disabled={!nuevoGrupo.trim()}>
            Crear grupo
          </button>
        </form>

        <div className="crud-header-row" style={{ marginTop: '1.5rem' }}>
          <h2>Preguntas</h2>
          <button
            type="button"
            className="crud-btn-primary"
            onClick={() => setForm(formularioVacio((preguntas?.length ?? 0) + 1))}
          >
            Nueva pregunta
          </button>
        </div>
        <div className="crud-list">
          {preguntas === null && <p className="crud-empty">Cargando…</p>}
          {preguntas?.map((p) => (
            <button
              key={p.id}
              type="button"
              className="crud-card crud-card-title-link"
              style={{ textAlign: 'left', width: '100%' }}
              onClick={() => setForm(aFormulario(p))}
            >
              <div className="crud-card-info">
                <div className="crud-card-title">
                  {p.orden}. {p.texto}
                </div>
                <div className="crud-card-meta">
                  <span className="badge badge-muted">{TIPOS.find((t) => t.valor === p.tipo)?.etiqueta}</span>
                  <span className="badge badge-muted">{p.clave}</span>
                  {p.obligatoria && <span className="badge badge-muted">Obligatoria</span>}
                  {p.ambito === 'persona' && <span className="badge badge-muted">Por persona</span>}
                  {p.condicion && <span className="badge badge-muted">Condicionada</span>}
                  <span className="badge badge-muted">
                    {p.grupoIds.length === 0
                      ? 'Todos los grupos'
                      : grupos
                          .filter((g) => p.grupoIds.includes(g.id))
                          .map((g) => g.nombre)
                          .join(', ')}
                  </span>
                  {!p.activa && <span className="badge badge-danger">Oculta</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        <Modal open={form !== null} onClose={() => setForm(null)} title={form?.id ? 'Editar pregunta' : 'Nueva pregunta'}>
          {form && (
            <form className="crud-form" onSubmit={guardar}>
              {!form.id && (
                <label className="crud-field">
                  <span>Clave (minúsculas y guiones bajos; no se puede cambiar después)</span>
                  <input
                    value={form.clave}
                    onChange={(e) => actualizar('clave', e.target.value)}
                    pattern="[a-z][a-z0-9_]*"
                    required
                  />
                </label>
              )}
              <label className="crud-field">
                <span>Pregunta</span>
                <input value={form.texto} onChange={(e) => actualizar('texto', e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Pregunta en plural (opcional): se usa si la invitación tiene varias personas</span>
                <input value={form.textoPlural} onChange={(e) => actualizar('textoPlural', e.target.value)} />
              </label>
              <label className="crud-field">
                <span>Se responde</span>
                <select value={form.ambito} onChange={(e) => actualizar('ambito', e.target.value as AmbitoBoda)}>
                  <option value="invitacion">Una vez por invitación (p. ej. dress code)</option>
                  <option value="persona">Una vez por cada persona (p. ej. asistencia, nombre artístico)</option>
                </select>
              </label>
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Tipo de respuesta</span>
                  <select value={form.tipo} onChange={(e) => actualizar('tipo', e.target.value as TipoPregunta)}>
                    {TIPOS.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="crud-field">
                  <span>Orden</span>
                  <input type="number" value={form.orden} onChange={(e) => actualizar('orden', e.target.value)} />
                </label>
              </div>
              {conOpciones && (
                <label className="crud-field">
                  <span>Opciones (una por línea). Si cambias el texto de una opción, las respuestas ya dadas con ella no se actualizan.</span>
                  <textarea rows={5} value={form.opciones} onChange={(e) => actualizar('opciones', e.target.value)} />
                </label>
              )}
              <label className="crud-field">
                <span>Grupos a los que se pregunta (ninguno marcado = a todos)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {grupos.map((g) => (
                    <label key={g.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={form.grupoIds.includes(g.id)}
                        onChange={(e) =>
                          actualizar(
                            'grupoIds',
                            e.target.checked ? [...form.grupoIds, g.id] : form.grupoIds.filter((id) => id !== g.id),
                          )
                        }
                      />
                      <span>{g.nombre}</span>
                    </label>
                  ))}
                </div>
              </label>
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Solo se pregunta si…</span>
                  <select value={form.condicionClave} onChange={(e) => actualizar('condicionClave', e.target.value)}>
                    <option value="">(siempre)</option>
                    {preguntasSiNo.map((p) => (
                      <option key={p.id} value={p.clave}>
                        {p.texto}
                      </option>
                    ))}
                  </select>
                </label>
                {form.condicionClave && (
                  <label className="crud-field">
                    <span>…la respuesta es</span>
                    <select value={form.condicionValor} onChange={(e) => actualizar('condicionValor', e.target.value as 'si' | 'no')}>
                      <option value="si">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                )}
              </div>
              {[
                ['obligatoria', 'Obligatoria'],
                ['permiteNota', 'Permite añadir una nota'],
                ['editablePorInvitado', 'El invitado puede cambiarla después'],
                ['activa', 'Activa (si no, no se muestra)'],
              ].map(([campo, etiqueta]) => (
                <label key={campo} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form[campo as 'obligatoria']}
                    onChange={(e) => actualizar(campo as 'obligatoria', e.target.checked)}
                  />
                  <span>{etiqueta}</span>
                </label>
              ))}
              <div className="crud-form-actions">
                <button type="button" className="crud-form-cancel" onClick={() => setForm(null)}>
                  Cancelar
                </button>
                <button type="submit" className="crud-btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
}
