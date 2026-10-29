import type { InvitadoBoda, PersonaBoda } from '../../api/boda';

// Recorrido de un invitado: sin enviar → enviada → abierta (sin decidir) → dice que sí / que no.
// "parcial" = invitación de varias personas en la que vienen unas y otras no.
export type EstadoInvitado = 'sin-enviar' | 'enviada' | 'abierta' | 'si' | 'parcial' | 'no';

export const CLAVE_ASISTENCIA = 'asistencia';

export const ESTADOS: { valor: EstadoInvitado; etiqueta: string }[] = [
  { valor: 'sin-enviar', etiqueta: 'Sin enviar' },
  { valor: 'enviada', etiqueta: 'Sin abrir' },
  { valor: 'abierta', etiqueta: 'Sin decidir' },
  { valor: 'si', etiqueta: 'Viene' },
  { valor: 'parcial', etiqueta: 'Vienen solo algunos' },
  { valor: 'no', etiqueta: 'No viene' },
];

export function estadoDe(i: InvitadoBoda): EstadoInvitado {
  // asistencia === true: todas las personas han respondido y al menos una viene.
  if (i.asistencia === true) return i.asistentes < i.personas.length ? 'parcial' : 'si';
  if (i.asistencia === false) return 'no';
  if (i.aperturas.total > 0) return 'abierta';
  return i.enviadoEn ? 'enviada' : 'sin-enviar';
}

// Quién viene, quién no y quién no ha respondido, persona a persona.
export function desglose(i: InvitadoBoda) {
  const vienen: PersonaBoda[] = [];
  const noVienen: PersonaBoda[] = [];
  const pendientes: PersonaBoda[] = [];
  for (const p of i.personas) {
    const valor = i.respuestasPersona[p.id]?.[CLAVE_ASISTENCIA]?.valor;
    (valor === true ? vienen : valor === false ? noVienen : pendientes).push(p);
  }
  return { vienen, noVienen, pendientes };
}

export function nombrePersona(p: PersonaBoda): string {
  return p.nombre.trim() || 'plaza sin nombre';
}

// Lo que dice la pastilla de una invitación: con varias personas, cuántas vienen.
export function etiquetaInvitado(i: InvitadoBoda): string {
  const estado = estadoDe(i);
  const n = i.personas.length;
  if (n > 1 && estado === 'parcial') return `Vienen ${i.asistentes} de ${n}`;
  if (n > 1 && estado === 'si') return `Vienen los ${n}`;
  if (n > 1 && estado === 'no') return 'No vienen';
  return etiquetaEstado(estado);
}

export function etiquetaEstado(estado: EstadoInvitado): string {
  return ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado;
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export async function copiarAlPortapapeles(texto: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // Contextos sin permiso de portapapeles (p. ej. http): se cae a un textarea temporal.
    const campo = document.createElement('textarea');
    campo.value = texto;
    document.body.appendChild(campo);
    campo.select();
    document.execCommand('copy');
    campo.remove();
  }
}
