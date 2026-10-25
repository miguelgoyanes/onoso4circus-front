import { apiFetch } from './client';

export type TipoPregunta =
  | 'texto'
  | 'texto_largo'
  | 'si_no'
  | 'opcion'
  | 'multiopcion'
  | 'numero'
  | 'fecha';

export interface GrupoBoda {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  activo: boolean;
}

export type AmbitoBoda = 'invitacion' | 'persona';

export interface PersonaBoda {
  id: string;
  // Vacío en una plaza sin nombre hasta que el invitado lo escriba.
  nombre: string;
  titular: boolean;
  // Plaza sin nombre conocido: el nombre lo escribe el invitado.
  nombreLibre: boolean;
}

export interface PreguntaBoda {
  id: string;
  clave: string;
  texto: string;
  textoPlural: string | null;
  ambito: AmbitoBoda;
  tipo: TipoPregunta;
  opciones: string[] | null;
  obligatoria: boolean;
  permiteNota: boolean;
  editablePorInvitado: boolean;
  condicion: { clave: string; igual: unknown } | null;
  orden: number;
  activa: boolean;
  grupoIds: string[];
}

export interface RespuestaBoda {
  valor: unknown;
  nota: string | null;
  origen: 'invitado' | 'admin';
  actualizadoEn: string;
}

export interface InvitadoBoda {
  id: string;
  grupo: { id: string; nombre: string } | null;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  notasInternas: string | null;
  // Cómo se nombra la invitación entera ("la familia Goyanes"); null = los nombres de las personas.
  tratamiento: string | null;
  activo: boolean;
  esPrueba: boolean;
  enlace: string;
  whatsappUrl: string | null;
  enviadoEn: string | null;
  completadoEn: string | null;
  completado: boolean;
  aperturas: { total: number; primera: string | null; ultima: string | null };
  // Personas de la invitación (la primera es el titular) y cómo se las nombra juntas.
  personas: PersonaBoda[];
  nombresInvitacion: string;
  // true si va alguien, false si nadie, null mientras falte alguna persona por responder.
  asistencia: boolean | null;
  // Personas que han dicho que sí.
  asistentes: number;
  // Respuestas de la invitación entera, por clave.
  respuestas: Record<string, RespuestaBoda>;
  // Respuestas por persona: id de persona → clave → respuesta.
  respuestasPersona: Record<string, Record<string, RespuestaBoda>>;
}

export interface ResumenBoda {
  total: number;
  enviadas: number;
  abiertas: number;
  sinAbrir: number;
  completadas: number;
  personas: number;
  asistencia: { si: number; no: number; sinResponder: number };
  porGrupo: {
    grupo: string;
    total: number;
    abiertas: number;
    si: number;
    no: number;
    sinResponder: number;
  }[];
}

export interface ConfigBoda {
  fechaLimiteEdicion: string | null;
  mensajeWhatsapp: string;
  urlBaseInvitacion: string;
  activo: boolean;
}

export interface EventoBoda {
  id: string;
  fecha: string;
  tipo: string;
  preguntaClave: string | null;
  personaId: string | null;
  valorAnterior: unknown;
  valorNuevo: unknown;
  origen: 'invitado' | 'admin';
}

export interface HistorialBoda {
  invitado: InvitadoBoda;
  accesos: { id: string; fecha: string; userAgent: string | null }[];
  eventos: EventoBoda[];
}

export interface DatosInvitadoBoda {
  grupoId: string;
  nombre: string;
  apellidos: string;
  telefono?: string | null;
  notasInternas?: string | null;
  tratamiento?: string | null;
  // Otras personas de la invitación (pareja, familia…); solo al crear. "?" = plaza sin nombre.
  acompanantes?: string[];
}

export interface ImportInvitadoBoda {
  grupo: string;
  nombre: string;
  apellidos: string;
  telefono?: string | null;
  // Cómo se nombra la invitación entera ("Yago y familia"); sin él, los nombres de las personas.
  tratamiento?: string;
  notasInternas?: string;
  acompanantes?: string[];
}

export interface RespuestaEntradaBoda {
  clave: string;
  valor: unknown;
  nota?: string | null;
  // Solo en las preguntas por persona.
  personaId?: string;
}

const BASE = '/boda/admin';

function enviar<T>(
  token: string | null,
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
): Promise<T> {
  return apiFetch<T>(`${BASE}${ruta}`, token, {
    method: metodo,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

export const listarInvitadosBoda = (t: string | null) =>
  enviar<InvitadoBoda[]>(t, 'GET', '/invitados');
export const listarPruebasBoda = (t: string | null) =>
  enviar<InvitadoBoda[]>(t, 'GET', '/invitados/pruebas');
export const resumenBoda = (t: string | null) => enviar<ResumenBoda>(t, 'GET', '/resumen');
export const listarGruposBoda = (t: string | null) =>
  enviar<GrupoBoda[]>(t, 'GET', '/grupos');
export const listarPreguntasBoda = (t: string | null) =>
  enviar<PreguntaBoda[]>(t, 'GET', '/preguntas');
export const obtenerConfigBoda = (t: string | null) =>
  enviar<ConfigBoda>(t, 'GET', '/config');
export const actualizarConfigBoda = (t: string | null, datos: Partial<ConfigBoda>) =>
  enviar<ConfigBoda>(t, 'PATCH', '/config', datos);

export const crearInvitadoBoda = (t: string | null, datos: DatosInvitadoBoda) =>
  enviar<InvitadoBoda>(t, 'POST', '/invitados', datos);
export const importarInvitadosBoda = (t: string | null, invitados: ImportInvitadoBoda[]) =>
  enviar<{ creados: number }>(t, 'POST', '/invitados/import', { invitados });
export const actualizarInvitadoBoda = (
  t: string | null,
  id: string,
  datos: Partial<DatosInvitadoBoda> & { activo?: boolean },
) => enviar<InvitadoBoda>(t, 'PATCH', `/invitados/${id}`, datos);
export const regenerarTokenBoda = (t: string | null, id: string) =>
  enviar<InvitadoBoda>(t, 'POST', `/invitados/${id}/regenerar-token`);
export const marcarEnviadoBoda = (t: string | null, id: string) =>
  enviar<InvitadoBoda>(t, 'POST', `/invitados/${id}/marcar-enviado`);
export const historialInvitadoBoda = (t: string | null, id: string) =>
  enviar<HistorialBoda>(t, 'GET', `/invitados/${id}/historial`);
export const guardarRespuestasBoda = (
  t: string | null,
  id: string,
  respuestas: RespuestaEntradaBoda[],
) => enviar<InvitadoBoda>(t, 'PATCH', `/invitados/${id}/respuestas`, { respuestas });

export const crearPersonaBoda = (t: string | null, invitadoId: string, nombre: string) =>
  enviar<InvitadoBoda>(t, 'POST', `/invitados/${invitadoId}/personas`, { nombre });
export const renombrarPersonaBoda = (t: string | null, invitadoId: string, personaId: string, nombre: string) =>
  enviar<InvitadoBoda>(t, 'PATCH', `/invitados/${invitadoId}/personas/${personaId}`, { nombre });
export const eliminarPersonaBoda = (t: string | null, invitadoId: string, personaId: string) =>
  enviar<InvitadoBoda>(t, 'DELETE', `/invitados/${invitadoId}/personas/${personaId}`);

export const crearPruebaBoda = (t: string | null, grupoId: string, nombre?: string) =>
  enviar<InvitadoBoda>(t, 'POST', '/invitados/pruebas', { grupoId, nombre });
export const reiniciarInvitadoBoda = (t: string | null, id: string) =>
  enviar<InvitadoBoda>(t, 'POST', `/invitados/${id}/reiniciar`);
export const eliminarInvitadoBoda = (t: string | null, id: string) =>
  enviar<{ ok: true }>(t, 'DELETE', `/invitados/${id}`);

export const crearGrupoBoda = (t: string | null, nombre: string) =>
  enviar<GrupoBoda>(t, 'POST', '/grupos', { nombre });

export interface DatosPreguntaBoda {
  clave?: string;
  texto: string;
  textoPlural?: string | null;
  ambito?: AmbitoBoda;
  tipo: TipoPregunta;
  opciones?: string[] | null;
  obligatoria?: boolean;
  permiteNota?: boolean;
  editablePorInvitado?: boolean;
  condicion?: { clave: string; igual: unknown } | null;
  orden?: number;
  activa?: boolean;
  grupoIds?: string[];
}

export const crearPreguntaBoda = (t: string | null, datos: DatosPreguntaBoda) =>
  enviar<PreguntaBoda>(t, 'POST', '/preguntas', datos);
export const actualizarPreguntaBoda = (t: string | null, id: string, datos: Partial<DatosPreguntaBoda>) =>
  enviar<PreguntaBoda>(t, 'PATCH', `/preguntas/${id}`, datos);
export const actualizarGrupoBoda = (
  t: string | null,
  id: string,
  datos: { nombre?: string; orden?: number; activo?: boolean },
) => enviar<GrupoBoda>(t, 'PATCH', `/grupos/${id}`, datos);
