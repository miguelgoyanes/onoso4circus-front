function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularDesdeBase(base: number, pct: number): { iva: number; total: number } {
  const iva = redondear2(base * (pct / 100));
  return { iva, total: redondear2(base + iva) };
}

export function calcularBaseDesdeTotal(total: number, pct: number): { base: number; iva: number } {
  const base = redondear2(total / (1 + pct / 100));
  const iva = redondear2(total - base);
  return { base, iva };
}
