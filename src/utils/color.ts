export const COLOR_POR_DEFECTO = '#64748b';

// Elige texto blanco o negro según el brillo del color de fondo, para que siempre
// se lea bien sin depender de qué color se haya elegido.
export function colorTextoLegible(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '#fff';
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  const brillo = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return brillo > 0.6 ? '#111' : '#fff';
}
