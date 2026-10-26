import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearGrupoBoda,
  crearInvitadoBoda,
  crearPruebaBoda,
  eliminarInvitadoBoda,
  listarGruposBoda,
  listarInvitadosBoda,
  listarPruebasBoda,
  marcarEnviadoBoda,
  obtenerConfigBoda,
  regenerarTokenBoda,
  reiniciarInvitadoBoda,
  type ConfigBoda,
  type GrupoBoda,
  type InvitadoBoda,
} from '../api/boda';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import { ConfigBodaModal } from '../components/boda/ConfigBodaModal';
import { ImportarInvitadosModal } from '../components/boda/ImportarInvitadosModal';
import { MenuAcciones } from '../components/boda/MenuAcciones';
import {
  copiarAlPortapapeles,
  ESTADOS,
  estadoDe,
  etiquetaEstado,
  fechaCorta,
  type EstadoInvitado,
} from '../components/boda/estado';
import '../styles/crud-page.css';
import '../styles/boda.css';

function subtitulo(i: InvitadoBoda): string {
  const partes: string[] = [];
  if (i.grupo) partes.push(i.grupo.nombre);
  if (i.personas.length > 1) {
    partes.push(i.asistencia === true ? `vienen ${i.asistentes} de ${i.personas.length}` : `${i.personas.length} personas`);
  }
  if (i.aperturas.total > 0 && i.aperturas.ultima) partes.push(`abierta ${i.aperturas.total}× · última ${fechaCorta(i.aperturas.ultima)}`);
  if (!i.activo) partes.push('desactivado');
  return partes.join(' · ');
}

interface AccionesFila {
  abrir: (i: InvitadoBoda) => void;
  copiar: (i: InvitadoBoda) => void;
  enviado: (i: InvitadoBoda) => void;
  regenerar: (i: InvitadoBoda) => void;
  reiniciar: (i: InvitadoBoda) => void;
  borrar: (i: InvitadoBoda) => void;
}

// Fila de la lista: pulsar en cualquier sitio abre al invitado; solo hay "Copiar enlace" y el menú "⋯".
function Fila({ i, acciones }: { i: InvitadoBoda; acciones: AccionesFila }) {
  const estado = estadoDe(i);
  return (
    <div className={`boda-fila boda-estado-${estado}`} onClick={() => acciones.abrir(i)}>
      <span className="boda-punto" aria-hidden="true" />
      <div className="boda-fila-texto">
        <span className="boda-nombre">
          {i.nombre} {i.apellidos}
        </span>
        <span className="boda-sub">{subtitulo(i)}</span>
      </div>
      <span className={`boda-pastilla boda-estado-${estado}`}>{etiquetaEstado(estado)}</span>
      <div className="boda-fila-acciones" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="boda-btn boda-btn-suave" onClick={() => acciones.copiar(i)}>
          Copiar enlace
        </button>
        <MenuAcciones
          acciones={[
            ...(i.whatsappUrl
              ? [
                  {
                    etiqueta: 'Enviar por WhatsApp',
                    onClick: () => {
                      window.open(i.whatsappUrl as string, '_blank', 'noreferrer');
                      acciones.enviado(i);
                    },
                  },
                ]
              : []),
            { etiqueta: 'Regenerar enlace', onClick: () => acciones.regenerar(i) },
            { etiqueta: 'Reiniciar', onClick: () => acciones.reiniciar(i) },
            { etiqueta: 'Borrar', onClick: () => acciones.borrar(i), peligro: true },
          ]}
        />
      </div>
    </div>
  );
}

export function BodaPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [invitados, setInvitados] = useState<InvitadoBoda[] | null>(null);
  const [pruebas, setPruebas] = useState<InvitadoBoda[]>([]);
  const [grupos, setGrupos] = useState<GrupoBoda[]>([]);
  const [config, setConfig] = useState<ConfigBoda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoInvitado | null>(null);
  const [vista, setVista] = useState<'lista' | 'tablero'>(() => {
    try {
      return localStorage.getItem('boda-vista') === 'tablero' ? 'tablero' : 'lista';
    } catch {
      return 'lista';
    }
  });

  const [showCrear, setShowCrear] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [nuevoGrupo, setNuevoGrupo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [acompanantes, setAcompanantes] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [grupoPrueba, setGrupoPrueba] = useState('');

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
      const [lista, listaPruebas, gruposData, configData] = await Promise.all([
        listarInvitadosBoda(accessToken),
        listarPruebasBoda(accessToken),
        listarGruposBoda(accessToken),
        obtenerConfigBoda(accessToken),
      ]);
      setInvitados(lista);
      setPruebas(listaPruebas);
      setGrupos(gruposData);
      setConfig(configData);
      setGrupoId((actual) => actual || gruposData[0]?.id || '');
      setGrupoPrueba((actual) => actual || gruposData[0]?.id || '');
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (invitados ?? []).filter(
      (i) =>
        (!filtroGrupo || i.grupo?.id === filtroGrupo) &&
        (!filtroEstado || estadoDe(i) === filtroEstado) &&
        (!texto || `${i.nombre} ${i.apellidos}`.toLowerCase().includes(texto)),
    );
  }, [invitados, busqueda, filtroGrupo, filtroEstado]);

  const cuentaEstados = useMemo(() => {
    const cuenta: Record<EstadoInvitado, number> = { 'sin-enviar': 0, enviada: 0, abierta: 0, si: 0, no: 0 };
    for (const i of invitados ?? []) cuenta[estadoDe(i)] += 1;
    return cuenta;
  }, [invitados]);

  // Lista agrupada por grupo, respetando el orden de los grupos.
  const porGrupo = useMemo(
    () =>
      grupos
        .map((g) => ({ grupo: g, miembros: visibles.filter((i) => i.grupo?.id === g.id) }))
        .filter((x) => x.miembros.length > 0),
    [grupos, visibles],
  );

  function cambiarVista(nueva: 'lista' | 'tablero') {
    setVista(nueva);
    try {
      localStorage.setItem('boda-vista', nueva);
    } catch {
      // Sin almacenamiento: la vista simplemente no se recuerda.
    }
  }

  const total = invitados?.length ?? 0;
  const respondidos = cuentaEstados.si + cuentaEstados.no;
  const personasConfirmadas = (invitados ?? []).reduce((total, i) => total + i.asistentes, 0);
  const personasTotal = (invitados ?? []).reduce((total, i) => total + i.personas.length, 0);

  function mostrarAviso(texto: string) {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 2500);
  }

  async function marcarEnviado(i: InvitadoBoda) {
    if (i.esPrueba || i.enviadoEn) return;
    try {
      await marcarEnviadoBoda(accessToken, i.id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function copiarEnlace(i: InvitadoBoda) {
    await copiarAlPortapapeles(i.enlace);
    mostrarAviso(`Enlace de ${i.nombre} copiado`);
    await marcarEnviado(i);
  }

  async function regenerar(i: InvitadoBoda) {
    const pregunta = i.esPrueba
      ? `¿Generar un enlace nuevo para esta prueba? El anterior dejará de funcionar.`
      : `¿Generar un enlace nuevo para ${i.nombre} ${i.apellidos}? El enlace anterior dejará de funcionar y tendrás que volver a enviárselo. Sus respuestas se conservan.`;
    if (!window.confirm(pregunta)) return;
    try {
      await regenerarTokenBoda(accessToken, i.id);
      await cargar();
      mostrarAviso('Enlace nuevo generado');
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setGuardando(true);
    try {
      let destino = grupoId;
      if (nuevoGrupo.trim()) destino = (await crearGrupoBoda(accessToken, nuevoGrupo.trim())).id;
      await crearInvitadoBoda(accessToken, {
        grupoId: destino,
        nombre,
        apellidos,
        telefono: telefono || null,
        tratamiento: tratamiento.trim() || null,
        acompanantes: acompanantes
          .split(/[,;]/)
          .map((n) => n.trim())
          .filter(Boolean),
      });
      setAcompanantes('');
      setTratamiento('');
      setNombre('');
      setApellidos('');
      setTelefono('');
      setNuevoGrupo('');
      setShowCrear(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function crearPrueba() {
    if (!grupoPrueba) return;
    try {
      await crearPruebaBoda(accessToken, grupoPrueba);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function reiniciar(i: InvitadoBoda) {
    if (!window.confirm(`¿Dejar a ${i.nombre} como nuevo? Se borran sus respuestas, aperturas e historial. El enlace sigue siendo el mismo.`)) return;
    try {
      await reiniciarInvitadoBoda(accessToken, i.id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function borrar(i: InvitadoBoda) {
    if (!window.confirm(`¿Borrar a ${i.nombre} ${i.apellidos}? Se elimina con todo su historial y su enlace deja de funcionar.`)) return;
    try {
      await eliminarInvitadoBoda(accessToken, i.id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  const acciones: AccionesFila = {
    abrir: (i) => navigate(`/boda/invitados/${i.id}`),
    copiar: copiarEnlace,
    enviado: marcarEnviado,
    regenerar,
    reiniciar,
    borrar,
  };

  return (
    <div className="crud-page boda">
      <div className="crud-container">
        <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Boda' }]} />

        <header className="boda-cab">
          <div>
            <h1>Brandan y Fátima</h1>
            <p className="boda-sub">
              {config?.fechaLimiteEdicion
                ? `Los invitados pueden cambiar sus respuestas hasta el ${new Date(config.fechaLimiteEdicion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
                : 'Sin fecha límite para cambiar respuestas'}
            </p>
          </div>
          <div className="boda-cab-acciones">
            <Link to="/boda/preguntas" className="boda-btn">
              Preguntas
            </Link>
            <button type="button" className="boda-btn" onClick={() => setShowImportar(true)}>
              Importar
            </button>
            <button type="button" className="boda-btn" onClick={() => setShowConfig(true)}>
              Ajustes
            </button>
            <button type="button" className="boda-btn boda-btn-primario" onClick={() => setShowCrear(true)}>
              Añadir
            </button>
          </div>
        </header>

        {error && <p className="crud-error">{error}</p>}

        {total > 0 && (
          <section className="boda-resumen">
            <p className="boda-resumen-titulo">
              <strong>{respondidos}</strong> de {total} han respondido
            </p>
            <p className="boda-sub">
              {personasConfirmadas} {personasConfirmadas === 1 ? 'persona confirmada' : 'personas confirmadas'} · {personasTotal}{' '}
              invitadas en total
            </p>
            <div className="boda-barra" aria-hidden="true">
              {ESTADOS.map((e) => (
                <span key={e.valor} className={`boda-estado-${e.valor}`} style={{ flexGrow: cuentaEstados[e.valor] }} />
              ))}
            </div>
            <div className="boda-leyenda">
              {ESTADOS.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  className={`boda-filtro boda-estado-${e.valor} ${filtroEstado === e.valor ? 'activo' : ''}`}
                  onClick={() => setFiltroEstado(filtroEstado === e.valor ? null : e.valor)}
                >
                  <span className="boda-punto" aria-hidden="true" />
                  <strong>{cuentaEstados[e.valor]}</strong> {e.etiqueta}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="boda-barra-herramientas">
          <input
            type="search"
            className="boda-input"
            placeholder="Buscar invitado…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select className="boda-input" value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)} aria-label="Grupo">
            <option value="">Todos los grupos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
          <div className="boda-segmentado" role="group" aria-label="Vista">
            <button type="button" className={vista === 'lista' ? 'activo' : ''} onClick={() => cambiarVista('lista')}>
              Lista
            </button>
            <button type="button" className={vista === 'tablero' ? 'activo' : ''} onClick={() => cambiarVista('tablero')}>
              Tablero
            </button>
          </div>
        </div>

        {invitados === null && <p className="boda-vacio">Cargando…</p>}
        {invitados?.length === 0 && <p className="boda-vacio">Todavía no hay invitados. Añade uno o importa la lista.</p>}
        {invitados && invitados.length > 0 && visibles.length === 0 && (
          <p className="boda-vacio">Ningún invitado coincide con los filtros.</p>
        )}

        {vista === 'lista' &&
          porGrupo.map(({ grupo, miembros }) => (
            <section key={grupo.id} className="boda-grupo">
              <h2>
                {grupo.nombre} <span>{miembros.length}</span>
              </h2>
              {miembros.map((i) => (
                <Fila key={i.id} i={i} acciones={acciones} />
              ))}
            </section>
          ))}

        {vista === 'tablero' && visibles.length > 0 && (
          <div className="boda-tablero">
            {ESTADOS.map((e) => {
              const fichas = visibles.filter((i) => estadoDe(i) === e.valor);
              return (
                <div key={e.valor} className={`boda-columna boda-estado-${e.valor}`}>
                  <h3>
                    <span className="boda-punto" aria-hidden="true" />
                    {e.etiqueta}
                    <span className="boda-contador">{fichas.length}</span>
                  </h3>
                  {fichas.map((i) => (
                    <div key={i.id} className="boda-ficha" role="button" tabIndex={0} onClick={() => acciones.abrir(i)}>
                      <span className="boda-nombre">
                        {i.nombre} {i.apellidos}
                      </span>
                      <span className="boda-sub">{subtitulo(i)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <details className="boda-pruebas">
          <summary>Invitaciones de prueba{pruebas.length > 0 && ` (${pruebas.length})`}</summary>
          <p className="boda-sub">
            Para ver cómo queda la invitación sin usar la de un invitado real. No cuentan en el resumen y se pueden reiniciar o borrar.
          </p>
          <div className="boda-pruebas-crear">
            <select className="boda-input" value={grupoPrueba} onChange={(e) => setGrupoPrueba(e.target.value)} aria-label="Grupo de la prueba">
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
            <button type="button" className="boda-btn" onClick={crearPrueba} disabled={!grupoPrueba}>
              Crear prueba
            </button>
          </div>
          {pruebas.map((i) => (
            <Fila key={i.id} i={i} acciones={acciones} />
          ))}
        </details>

        {aviso && <div className="boda-aviso">{aviso}</div>}

        <Modal open={showCrear} onClose={() => setShowCrear(false)} title="Añadir invitado">
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Apellidos</span>
                <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
              </label>
            </div>
            <label className="crud-field">
              <span>Teléfono (para WhatsApp, opcional)</span>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 11 22 33" />
            </label>
            <label className="crud-field">
              <span>
                Otras personas de la invitación: pareja, familia… (opcional, separadas por comas). Pon ? por cada una
                cuyo nombre no sepáis: lo escribirá el invitado
              </span>
              <input
                value={acompanantes}
                onChange={(e) => setAcompanantes(e.target.value)}
                placeholder="su pareja   ·   Marta, Lucía, Hugo   ·   ?, ?"
              />
            </label>
            <label className="crud-field">
              <span>Cómo se nombra la invitación (opcional; si no, se usan los nombres)</span>
              <input
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                placeholder="la familia Goyanes   ·   Ana y familia"
              />
            </label>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Grupo</span>
                <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} disabled={!!nuevoGrupo.trim()}>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>…o crear un grupo nuevo</span>
                <input value={nuevoGrupo} onChange={(e) => setNuevoGrupo(e.target.value)} />
              </label>
            </div>
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowCrear(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardando || (!grupoId && !nuevoGrupo.trim())}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        <ImportarInvitadosModal
          open={showImportar}
          onClose={() => setShowImportar(false)}
          onImportado={cargar}
          onError={handleApiError}
        />
        <ConfigBodaModal
          open={showConfig}
          config={config}
          onClose={() => setShowConfig(false)}
          onGuardado={cargar}
          onError={handleApiError}
        />
      </div>
    </div>
  );
}
