import type { InvitadoBoda } from '../../api/boda';

// Recorrido de un invitado: sin enviar → enviada → abierta (sin decidir) → dice que sí / que no.
export type EstadoInvitado = 'sin-enviar' | 'enviada' | 'abierta' | 'si' | 'no';

export const ESTADOS: { valor: EstadoInvitado; etiqueta: string }[] = [
  { valor: 'sin-enviar', etiqueta: 'Sin enviar' },
  { valor: 'enviada', etiqueta: 'Sin abrir' },
  { valor: 'abierta', etiqueta: 'Sin decidir' },
  { valor: 'si', etiqueta: 'Viene' },
  { valor: 'no', etiqueta: 'No viene' },
];

export function estadoDe(i: InvitadoBoda): EstadoInvitado {
  if (i.asistencia === true) return 'si';
  if (i.asistencia === false) return 'no';
  if (i.aperturas.total > 0) return 'abierta';
  return i.enviadoEn ? 'enviada' : 'sin-enviar';
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
