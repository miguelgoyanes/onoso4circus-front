import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import {
  actualizarInvitadoBoda,
  crearPersonaBoda,
  eliminarInvitadoBoda,
  eliminarPersonaBoda,
  guardarRespuestasBoda,
  historialInvitadoBoda,
  listarGruposBoda,
  listarPreguntasBoda,
  marcarEnviadoBoda,
  regenerarTokenBoda,
  reiniciarInvitadoBoda,
  renombrarPersonaBoda,
  type EventoBoda,
  type GrupoBoda,
  type HistorialBoda,
  type InvitadoBoda,
  type PersonaBoda,
  type PreguntaBoda,
  type RespuestaEntradaBoda,
} from "../api/boda";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { MenuAcciones } from "../components/boda/MenuAcciones";
import {
  copiarAlPortapapeles,
  estadoDe,
  etiquetaEstado,
  fechaCorta,
} from "../components/boda/estado";
import {
  CampoRespuesta,
  aplicaPregunta,
  formatearValor,
  ValorRespuesta,
  type ValoresBoda,
} from "../components/boda/respuestas";
import "../styles/crud-page.css";
import "../styles/boda.css";

// Borrador de edición: una entrada por (persona, pregunta); la persona vacía es la invitación entera.
type Borrador = Record<string, { valor: unknown; nota: string }>;

const clave = (personaId: string | null, claveP: string) =>
  `${personaId ?? ""}|${claveP}`;

interface CambioPregunta {
  clave: string;
  personaId: string | null;
  antes: unknown;
  despues: unknown;
}

type EntradaActividad =
  | {
      tipo: "sesion";
      fecha: string;
      numero: number;
      dispositivo: string;
      cambios: CambioPregunta[];
      completo: boolean;
    }
  | { tipo: "admin"; fecha: string; cambios: CambioPregunta[] }
  | { tipo: "nota"; fecha: string; texto: string };

const EVENTOS_RESPUESTA = new Set([
  "respuesta_creada",
  "respuesta_modificada",
  "respuesta_eliminada",
]);

function dispositivo(userAgent: string | null): string {
  if (!userAgent) return "";
  return /Mobile|Android|iPhone|iPad/i.test(userAgent)
    ? "desde el móvil"
    : "desde un ordenador";
}

// Varios cambios de una misma pregunta (y persona) dentro de un bloque se resumen en uno (primer "antes" → último "después").
function colapsar(eventos: EventoBoda[]): CambioPregunta[] {
  const mapa = new Map<string, CambioPregunta>();
  for (const e of eventos) {
    if (!e.preguntaClave) continue;
    const k = clave(e.personaId, e.preguntaClave);
    const previo = mapa.get(k);
    mapa.set(k, {
      clave: e.preguntaClave,
      personaId: e.personaId,
      antes: previo ? previo.antes : e.valorAnterior,
      despues: e.valorNuevo,
    });
  }
  return [...mapa.values()].filter(
    (c) =>
      JSON.stringify(c.antes ?? null) !== JSON.stringify(c.despues ?? null),
  );
}

// Agrupa el historial en "sesiones" (cada apertura con lo que el invitado cambió en ella) y bloques de cambios del admin.
function construirActividad(historial: HistorialBoda): EntradaActividad[] {
  const accesos = [...historial.accesos].sort((a, b) =>
    a.fecha.localeCompare(b.fecha),
  );
  const eventos = [...historial.eventos].sort((a, b) =>
    a.fecha.localeCompare(b.fecha),
  );
  const sesiones = accesos.map((a, idx) => ({
    fecha: a.fecha,
    numero: idx + 1,
    dispositivo: dispositivo(a.userAgent),
    eventos: [] as EventoBoda[],
    completo: false,
  }));
  const bloquesAdmin: {
    fecha: string;
    ultima: number;
    eventos: EventoBoda[];
  }[] = [];
  const notas: EntradaActividad[] = [];

  for (const e of eventos) {
    const t = new Date(e.fecha).getTime();
    if (EVENTOS_RESPUESTA.has(e.tipo) && e.origen === "admin") {
      const ultimo = bloquesAdmin[bloquesAdmin.length - 1];
      if (ultimo && t - ultimo.ultima < 60_000) {
        ultimo.eventos.push(e);
        ultimo.ultima = t;
      } else {
        bloquesAdmin.push({ fecha: e.fecha, ultima: t, eventos: [e] });
      }
    } else if (EVENTOS_RESPUESTA.has(e.tipo) || e.tipo === "completado") {
      const sesion =
        [...sesiones].reverse().find((s) => s.fecha <= e.fecha) ?? sesiones[0];
      if (!sesion) continue;
      if (e.tipo === "completado") sesion.completo = true;
      else sesion.eventos.push(e);
    } else if (e.tipo === "envio_marcado") {
      notas.push({
        tipo: "nota",
        fecha: e.fecha,
        texto: "Marcada como enviada",
      });
    } else if (e.tipo === "token_regenerado") {
      notas.push({
        tipo: "nota",
        fecha: e.fecha,
        texto: "Enlace regenerado (el anterior dejó de funcionar)",
      });
    }
  }

  const entradas: EntradaActividad[] = [
    ...sesiones.map<EntradaActividad>((s) => ({
      tipo: "sesion",
      fecha: s.fecha,
      numero: s.numero,
      dispositivo: s.dispositivo,
      cambios: colapsar(s.eventos),
      completo: s.completo,
    })),
    ...bloquesAdmin.map<EntradaActividad>((b) => ({
      tipo: "admin",
      fecha: b.fecha,
      cambios: colapsar(b.eventos),
    })),
    ...notas,
  ];
  return entradas.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function Diff({
  cambio,
  etiqueta,
}: {
  cambio: CambioPregunta;
  etiqueta: string;
}) {
  const hayAntes = cambio.antes !== null && cambio.antes !== undefined;
  const hayDespues = cambio.despues !== null && cambio.despues !== undefined;
  return (
    <div className="boda-diff">
      <span className="boda-diff-pregunta">{etiqueta}</span>
      {hayAntes && (
        <span className="boda-diff-linea quitado">
          {formatearValor(cambio.antes)}
        </span>
      )}
      {hayDespues && (
        <span className="boda-diff-linea anadido">
          {formatearValor(cambio.despues)}
        </span>
      )}
    </div>
  );
}

// Añadir, renombrar y quitar a las personas de la invitación (pareja, familia…). Cada cambio se guarda al momento.
function PersonasEditor({
  invitado,
  onCambio,
  onError,
}: {
  invitado: InvitadoBoda;
  onCambio: () => Promise<void>;
  onError: (err: unknown) => void;
}) {
  const { accessToken } = useAuth();
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [nuevo, setNuevo] = useState("");

  useEffect(() => {
    setNombres(
      Object.fromEntries(invitado.personas.map((p) => [p.id, p.nombre])),
    );
  }, [invitado.personas]);

  async function ejecutar(accion: () => Promise<unknown>) {
    try {
      await accion();
      await onCambio();
    } catch (err) {
      onError(err);
    }
  }

  // Dejar vacío el nombre de un acompañante lo convierte en plaza sin nombre (lo escribe el invitado).
  function renombrar(persona: PersonaBoda) {
    const nombre = (nombres[persona.id] ?? "").trim();
    if (nombre === persona.nombre || (!nombre && persona.titular)) {
      setNombres((n) => ({ ...n, [persona.id]: persona.nombre }));
      return;
    }
    ejecutar(() =>
      renombrarPersonaBoda(accessToken, invitado.id, persona.id, nombre),
    );
  }

  function quitar(persona: PersonaBoda) {
    if (
      !window.confirm(
        `¿Quitar a ${persona.nombre || "esta plaza"} de la invitación? Se borran también sus respuestas.`,
      )
    )
      return;
    ejecutar(() => eliminarPersonaBoda(accessToken, invitado.id, persona.id));
  }

  function anadir(nombre: string) {
    ejecutar(async () => {
      await crearPersonaBoda(accessToken, invitado.id, nombre);
      setNuevo("");
    });
  }

  return (
    <div className="boda-personas-editor">
      {invitado.personas.map((p) => (
        <div key={p.id} className="boda-persona-fila">
          <input
            className="boda-input"
            value={nombres[p.id] ?? p.nombre}
            onChange={(e) =>
              setNombres((n) => ({ ...n, [p.id]: e.target.value }))
            }
            onBlur={() => renombrar(p)}
            placeholder="Sin nombre: lo escribe el invitado"
            aria-label={`Nombre de ${p.nombre || "la plaza sin nombre"}`}
          />
          {p.nombreLibre && p.nombre && (
            <span className="boda-sub">lo escribió el invitado</span>
          )}
          {p.titular ? (
            <span className="boda-sub">titular</span>
          ) : (
            <button
              type="button"
              className="boda-btn boda-btn-peligro"
              onClick={() => quitar(p)}
            >
              Quitar
            </button>
          )}
        </div>
      ))}
      <div className="boda-persona-fila">
        <input
          className="boda-input"
          value={nuevo}
          placeholder="Añadir persona (su pareja, un hijo…)"
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            nuevo.trim() &&
            (e.preventDefault(), anadir(nuevo.trim()))
          }
        />
        <button
          type="button"
          className="boda-btn"
          onClick={() => anadir(nuevo.trim())}
          disabled={!nuevo.trim()}
        >
          Añadir
        </button>
        <button
          type="button"
          className="boda-btn"
          onClick={() => anadir("")}
          title="Para quien no sabéis el nombre (p. ej. los hijos): lo escribirá el invitado"
        >
          Añadir sin nombre
        </button>
      </div>
    </div>
  );
}

export function BodaInvitadoPage() {
  const { id = "" } = useParams();
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [historial, setHistorial] = useState<HistorialBoda | null>(null);
  const [grupos, setGrupos] = useState<GrupoBoda[]>([]);
  const [preguntas, setPreguntas] = useState<PreguntaBoda[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [notas, setNotas] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [activo, setActivo] = useState(true);
  const [borrador, setBorrador] = useState<Borrador>({});

  function handleApiError(err: unknown): void {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        logout();
        return;
      }
      setError(err.message);
      return;
    }
    setError("Error inesperado");
  }

  async function cargar() {
    if (!accessToken) return;
    try {
      const [datos, gruposData, preguntasData] = await Promise.all([
        historialInvitadoBoda(accessToken, id),
        listarGruposBoda(accessToken),
        listarPreguntasBoda(accessToken),
      ]);
      setHistorial(datos);
      setGrupos(gruposData);
      setPreguntas(preguntasData);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, id]);

  const invitado = historial?.invitado ?? null;

  function mostrarAviso(texto: string) {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 2500);
  }

  function empezarEdicion() {
    if (!invitado) return;
    setNombre(invitado.nombre);
    setApellidos(invitado.apellidos);
    setTelefono(invitado.telefono ?? "");
    setGrupoId(invitado.grupo?.id ?? "");
    setNotas(invitado.notasInternas ?? "");
    setTratamiento(invitado.tratamiento ?? "");
    setActivo(invitado.activo);
    const inicial: Borrador = {};
    for (const [c, r] of Object.entries(invitado.respuestas))
      inicial[clave(null, c)] = { valor: r.valor, nota: r.nota ?? "" };
    for (const [personaId, porClave] of Object.entries(
      invitado.respuestasPersona,
    )) {
      for (const [c, r] of Object.entries(porClave))
        inicial[clave(personaId, c)] = { valor: r.valor, nota: r.nota ?? "" };
    }
    setBorrador(inicial);
    setEditando(true);
  }

  // Valores con los que se decide qué preguntas tocan: el borrador mientras se edita, lo guardado si no.
  const valores = useMemo<ValoresBoda>(() => {
    const v: ValoresBoda = { invitacion: {}, personas: {} };
    if (!invitado) return v;
    if (editando) {
      for (const [k, r] of Object.entries(borrador)) {
        const [personaId, c] = k.split("|");
        if (personaId) (v.personas[personaId] ??= {})[c] = r.valor;
        else v.invitacion[c] = r.valor;
      }
    } else {
      for (const [c, r] of Object.entries(invitado.respuestas))
        v.invitacion[c] = r.valor;
      for (const [personaId, porClave] of Object.entries(
        invitado.respuestasPersona,
      )) {
        v.personas[personaId] = Object.fromEntries(
          Object.entries(porClave).map(([c, r]) => [c, r.valor]),
        );
      }
    }
    return v;
  }, [invitado, editando, borrador]);

  // Preguntas activas de su grupo, ordenadas.
  const preguntasDelGrupo = useMemo(() => {
    if (!invitado) return [];
    const grupoActual = editando ? grupoId : invitado.grupo?.id;
    return preguntas
      .filter(
        (p) =>
          p.activa &&
          (p.grupoIds.length === 0 ||
            (grupoActual && p.grupoIds.includes(grupoActual))),
      )
      .sort((a, b) => a.orden - b.orden);
  }, [preguntas, invitado, editando, grupoId]);

  const preguntasInvitacion = preguntasDelGrupo.filter(
    (p) =>
      p.ambito === "invitacion" && aplicaPregunta(p, preguntas, valores, null),
  );
  const preguntasPersona = preguntasDelGrupo.filter(
    (p) => p.ambito === "persona",
  );

  const actividad = useMemo(
    () => (historial ? construirActividad(historial) : []),
    [historial],
  );
  const textoDe = (c: string) =>
    preguntas.find((p) => p.clave === c)?.texto ?? c;
  const nombrePersona = (personaId: string | null) =>
    personaId
      ? (invitado?.personas.find((p) => p.id === personaId)?.nombre ||
        "persona sin nombre o que ya no está")
      : null;
  const etiquetaCambio = (c: CambioPregunta) =>
    c.personaId
      ? `${nombrePersona(c.personaId)} · ${textoDe(c.clave)}`
      : textoDe(c.clave);

  async function guardar() {
    if (!invitado) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarInvitadoBoda(accessToken, invitado.id, {
        nombre,
        apellidos,
        telefono: telefono || null,
        grupoId,
        notasInternas: notas || null,
        tratamiento: tratamiento.trim() || null,
        activo,
      });
      // Solo se envía lo que ha cambiado respecto a lo guardado (valor undefined = borrar la respuesta).
      const cambios: RespuestaEntradaBoda[] = [];
      const candidatos: { p: PreguntaBoda; personaId: string | null }[] = [
        ...preguntasInvitacion.map((p) => ({ p, personaId: null })),
        ...preguntasPersona.flatMap((p) =>
          invitado.personas
            .filter((per) => aplicaPregunta(p, preguntas, valores, per.id))
            .map((per) => ({ p, personaId: per.id })),
        ),
      ];
      for (const { p, personaId } of candidatos) {
        const antes = personaId
          ? invitado.respuestasPersona[personaId]?.[p.clave]
          : invitado.respuestas[p.clave];
        const ahora = borrador[clave(personaId, p.clave)];
        const notaAntes = antes?.nota ?? "";
        const notaAhora = ahora?.nota ?? "";
        if (
          JSON.stringify(antes?.valor) === JSON.stringify(ahora?.valor) &&
          notaAntes === notaAhora
        )
          continue;
        const persona = personaId ? { personaId } : {};
        if (ahora?.valor === undefined) {
          if (antes) cambios.push({ clave: p.clave, valor: null, ...persona });
          continue;
        }
        cambios.push({
          clave: p.clave,
          valor: ahora.valor,
          nota: p.permiteNota ? notaAhora || null : undefined,
          ...persona,
        });
      }
      if (cambios.length > 0)
        await guardarRespuestasBoda(accessToken, invitado.id, cambios);
      setEditando(false);
      await cargar();
      mostrarAviso("Cambios guardados");
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function copiar() {
    if (!invitado) return;
    await copiarAlPortapapeles(invitado.enlace);
    mostrarAviso("Enlace copiado");
    if (!invitado.esPrueba && !invitado.enviadoEn) {
      await marcarEnviadoBoda(accessToken, invitado.id).catch(handleApiError);
      await cargar();
    }
  }

  async function regenerar() {
    if (!invitado) return;
    const texto = invitado.esPrueba
      ? "¿Generar un enlace nuevo para esta prueba? El anterior dejará de funcionar."
      : `¿Generar un enlace nuevo para ${invitado.nombresInvitacion}? El anterior dejará de funcionar y tendrás que volver a enviárselo. Sus respuestas se conservan.`;
    if (!window.confirm(texto)) return;
    try {
      await regenerarTokenBoda(accessToken, invitado.id);
      await cargar();
      mostrarAviso("Enlace nuevo generado");
    } catch (err) {
      handleApiError(err);
    }
  }

  async function reiniciar() {
    if (!invitado) return;
    if (
      !window.confirm(
        `¿Dejar a ${invitado.nombresInvitacion} como nuevo? Se borran sus respuestas, aperturas e historial. El enlace sigue siendo el mismo.`,
      )
    )
      return;
    try {
      await reiniciarInvitadoBoda(accessToken, invitado.id);
      await cargar();
      mostrarAviso("Reiniciado");
    } catch (err) {
      handleApiError(err);
    }
  }

  async function borrar() {
    if (!invitado) return;
    if (
      !window.confirm(
        `¿Borrar a ${invitado.nombresInvitacion}? Se elimina con todo su historial y su enlace deja de funcionar.`,
      )
    )
      return;
    try {
      await eliminarInvitadoBoda(accessToken, invitado.id);
      navigate("/boda");
    } catch (err) {
      handleApiError(err);
    }
  }

  if (!invitado) {
    return (
      <div className="crud-page boda">
        <div className="crud-container">
          <Breadcrumbs
            items={[
              { label: "Inicio", to: "/" },
              { label: "Boda", to: "/boda" },
              { label: "Invitado" },
            ]}
          />
          {error ? (
            <p className="crud-error">{error}</p>
          ) : (
            <p className="boda-vacio">Cargando…</p>
          )}
        </div>
      </div>
    );
  }

  const estado = estadoDe(invitado);
  const varias = invitado.personas.length > 1;

  // Tarjeta de una pregunta para una persona (o para la invitación si personaId es null).
  function tarjeta(p: PreguntaBoda, personaId: string | null) {
    const actual = personaId
      ? invitado?.respuestasPersona[personaId]?.[p.clave]
      : invitado?.respuestas[p.clave];
    const k = clave(personaId, p.clave);
    return (
      <article key={k} className="boda-respuesta">
        <h3>{p.texto}</h3>
        {editando ? (
          <>
            <CampoRespuesta
              pregunta={p}
              valor={borrador[k]?.valor}
              onChange={(v) =>
                setBorrador((b) => ({
                  ...b,
                  [k]: { valor: v, nota: b[k]?.nota ?? "" },
                }))
              }
            />
            {p.permiteNota && (
              <input
                className="boda-input"
                placeholder="Nota"
                value={borrador[k]?.nota ?? ""}
                onChange={(e) =>
                  setBorrador((b) => ({
                    ...b,
                    [k]: { valor: b[k]?.valor, nota: e.target.value },
                  }))
                }
              />
            )}
          </>
        ) : (
          <>
            <ValorRespuesta valor={actual?.valor} />
            {actual?.nota && <p className="boda-nota">“{actual.nota}”</p>}
            {actual && (
              <p className="boda-sub">
                {actual.origen === "admin"
                  ? "Apuntada por el admin"
                  : "Respondida por el invitado"}{" "}
                · {fechaCorta(actual.actualizadoEn)}
              </p>
            )}
          </>
        )}
      </article>
    );
  }

  return (
    <div className="crud-page boda">
      <div className="crud-container">
        <Breadcrumbs
          items={[
            { label: "Inicio", to: "/" },
            { label: "Boda", to: "/boda" },
            { label: `${invitado.nombre} ${invitado.apellidos}` },
          ]}
        />

        <header className="boda-cab">
          <div>
            <h1>
              {invitado.nombre} {invitado.apellidos}
            </h1>
            {varias && (
              <p className="boda-sub">
                Invitación para {invitado.nombresInvitacion}
              </p>
            )}
            <p className="boda-sub boda-cab-linea">
              <span className={`boda-pastilla boda-estado-${estado}`}>
                {etiquetaEstado(estado)}
              </span>
              {invitado.grupo?.nombre}
              {invitado.esPrueba && " · invitación de prueba"}
              {varias &&
                invitado.asistencia === true &&
                ` · vienen ${invitado.asistentes} de ${invitado.personas.length}`}
              {invitado.aperturas.total > 0 &&
                ` · abierta ${invitado.aperturas.total} ${invitado.aperturas.total === 1 ? "vez" : "veces"}`}
              {invitado.enviadoEn &&
                ` · enviada el ${fechaCorta(invitado.enviadoEn)}`}
            </p>
          </div>
          <div className="boda-cab-acciones">
            {editando ? (
              <>
                <button
                  type="button"
                  className="boda-btn"
                  onClick={() => setEditando(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="boda-btn boda-btn-primario"
                  onClick={guardar}
                  disabled={guardando}
                >
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="boda-btn" onClick={copiar}>
                  Copiar enlace
                </button>
                <button
                  type="button"
                  className="boda-btn boda-btn-primario"
                  onClick={empezarEdicion}
                >
                  Editar
                </button>
                <MenuAcciones
                  acciones={[
                    ...(invitado.whatsappUrl
                      ? [
                          {
                            etiqueta: "Enviar por WhatsApp",
                            onClick: () => {
                              window.open(
                                invitado.whatsappUrl as string,
                                "_blank",
                                "noreferrer",
                              );
                              if (!invitado.esPrueba && !invitado.enviadoEn) {
                                marcarEnviadoBoda(accessToken, invitado.id)
                                  .then(cargar)
                                  .catch(handleApiError);
                              }
                            },
                          },
                        ]
                      : []),
                    {
                      etiqueta: "Abrir la invitación",
                      onClick: () =>
                        window.open(invitado.enlace, "_blank", "noreferrer"),
                    },
                    { etiqueta: "Regenerar enlace", onClick: regenerar },
                    { etiqueta: "Reiniciar", onClick: reiniciar },
                    { etiqueta: "Borrar", onClick: borrar, peligro: true },
                  ]}
                />
              </>
            )}
          </div>
        </header>

        {error && <p className="crud-error">{error}</p>}

        <section className="boda-seccion">
          <h2>Datos</h2>
          {editando ? (
            <div className="boda-datos">
              <label>
                <span>Nombre</span>
                <input
                  className="boda-input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </label>
              <label>
                <span>Apellidos</span>
                <input
                  className="boda-input"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                />
              </label>
              <label>
                <span>Teléfono</span>
                <input
                  className="boda-input"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="600 11 22 33"
                />
              </label>
              <label>
                <span>Grupo</span>
                <select
                  className="boda-input"
                  value={grupoId}
                  onChange={(e) => setGrupoId(e.target.value)}
                >
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <div className="boda-datos-ancho">
                <span className="boda-datos-etiqueta">
                  Personas de la invitación (se guardan al momento)
                </span>
                <PersonasEditor
                  invitado={invitado}
                  onCambio={cargar}
                  onError={handleApiError}
                />
              </div>
              <label className="boda-datos-ancho">
                <span>
                  Cómo se nombra la invitación (opcional; si no, se usan los
                  nombres)
                </span>
                <input
                  className="boda-input"
                  value={tratamiento}
                  onChange={(e) => setTratamiento(e.target.value)}
                  placeholder="la familia Goyanes · Ana y familia"
                />
              </label>
              <label className="boda-datos-ancho">
                <span>Notas internas (no las ve el invitado)</span>
                <input
                  className="boda-input"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </label>
              <label className="boda-datos-ancho boda-check">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <span>
                  Activo (si se desactiva, su enlace deja de funcionar)
                </span>
              </label>
            </div>
          ) : (
            <dl className="boda-datos">
              <div>
                <dt>Teléfono</dt>
                <dd>{invitado.telefono || "—"}</dd>
              </div>
              <div>
                <dt>Grupo</dt>
                <dd>{invitado.grupo?.nombre ?? "—"}</dd>
              </div>
              <div className="boda-datos-ancho">
                <dt>Personas</dt>
                <dd>
                  {invitado.personas
                    .map((p) => p.nombre || "sin nombre")
                    .join(", ")}
                  {invitado.tratamiento &&
                    ` · se nombra como «${invitado.tratamiento}»`}
                </dd>
              </div>
              {invitado.notasInternas && (
                <div className="boda-datos-ancho">
                  <dt>Notas internas</dt>
                  <dd>{invitado.notasInternas}</dd>
                </div>
              )}
              {!invitado.activo && (
                <div className="boda-datos-ancho">
                  <dt>Estado del enlace</dt>
                  <dd>Desactivado</dd>
                </div>
              )}
            </dl>
          )}
        </section>

        <section className="boda-seccion">
          <h2>Respuestas</h2>
          {editando && (
            <p className="boda-sub">
              Lo que cambies queda en el historial como cambio del admin y no
              tiene fecha límite.
            </p>
          )}
          {invitado.personas.map((persona) => {
            const suyas = preguntasPersona.filter((p) =>
              aplicaPregunta(p, preguntas, valores, persona.id),
            );
            if (suyas.length === 0) return null;
            return (
              <div key={persona.id} className="boda-persona-bloque">
                {varias && (
                  <h3 className="boda-persona-titulo">{persona.nombre}</h3>
                )}
                <div className="boda-respuestas">
                  {suyas.map((p) => tarjeta(p, persona.id))}
                </div>
              </div>
            );
          })}
          {preguntasInvitacion.length > 0 && (
            <div className="boda-persona-bloque">
              {varias && (
                <h3 className="boda-persona-titulo">Toda la invitación</h3>
              )}
              <div className="boda-respuestas">
                {preguntasInvitacion.map((p) => tarjeta(p, null))}
              </div>
            </div>
          )}
          {preguntasDelGrupo.length === 0 && (
            <p className="boda-vacio">Este grupo no tiene preguntas.</p>
          )}
        </section>

        <section className="boda-seccion">
          <h2>Actividad</h2>
          {actividad.length === 0 && (
            <p className="boda-vacio">
              Todavía no ha pasado nada: ni abierta ni respondida.
            </p>
          )}
          <ol className="boda-linea">
            {actividad.map((a, idx) => (
              <li
                key={`${a.tipo}-${a.fecha}-${idx}`}
                className={`boda-hito boda-hito-${a.tipo}`}
              >
                <span className="boda-hito-punto" aria-hidden="true" />
                {a.tipo === "sesion" && (
                  <>
                    <p className="boda-hito-titulo">
                      <strong>Apertura nº {a.numero}</strong>
                      <span className="boda-sub">
                        {fechaCorta(a.fecha)}
                        {a.dispositivo && ` · ${a.dispositivo}`}
                      </span>
                      {a.completo && (
                        <span className="boda-pastilla boda-estado-si">
                          Completó la invitación
                        </span>
                      )}
                    </p>
                    {a.cambios.length === 0 ? (
                      <p className="boda-sub">No cambió ninguna respuesta.</p>
                    ) : (
                      a.cambios.map((c) => (
                        <Diff
                          key={clave(c.personaId, c.clave)}
                          cambio={c}
                          etiqueta={etiquetaCambio(c)}
                        />
                      ))
                    )}
                  </>
                )}
                {a.tipo === "admin" && (
                  <>
                    <p className="boda-hito-titulo">
                      <strong>Cambios del admin</strong>
                      <span className="boda-sub">{fechaCorta(a.fecha)}</span>
                    </p>
                    {a.cambios.length === 0 ? (
                      <p className="boda-sub">Sin cambios netos.</p>
                    ) : (
                      a.cambios.map((c) => (
                        <Diff
                          key={clave(c.personaId, c.clave)}
                          cambio={c}
                          etiqueta={etiquetaCambio(c)}
                        />
                      ))
                    )}
                  </>
                )}
                {a.tipo === "nota" && (
                  <p className="boda-hito-titulo">
                    <span>{a.texto}</span>
                    <span className="boda-sub">{fechaCorta(a.fecha)}</span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {aviso && <div className="boda-aviso">{aviso}</div>}
      </div>
    </div>
  );
}
