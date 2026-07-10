import { apiFetch } from './client';

export interface CuentaContable {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
}

export interface LineaAsiento {
  cuenta: CuentaContable;
  debit: string;
  credit: string;
}

export interface AsientoDiario {
  id: string;
  fecha: string;
  descripcion: string;
  lineas: LineaAsiento[];
}

export interface MovimientoMayor {
  fecha: string;
  descripcion: string;
  debit: string;
  credit: string;
  saldo: string;
}

export interface LibroMayor {
  cuenta: CuentaContable;
  saldoInicial: string;
  movimientos: MovimientoMayor[];
  saldoFinal: string;
}

export interface LineaPyg {
  cuenta: CuentaContable;
  importe: string;
}

export interface Pyg {
  ingresos: LineaPyg[];
  totalIngresos: string;
  gastos: LineaPyg[];
  totalGastos: string;
  resultado: string;
}

export interface LineaBalance {
  cuenta: CuentaContable;
  saldo: string;
}

export interface Balance {
  activo: LineaBalance[];
  totalActivo: string;
  pasivo: LineaBalance[];
  totalPasivo: string;
  patrimonioNeto: LineaBalance[];
  totalPatrimonioNeto: string;
}

export function listarCuentasContables(token: string): Promise<CuentaContable[]> {
  return apiFetch<CuentaContable[]>('/contabilidad/cuentas', token);
}

export function obtenerLibroDiario(
  token: string,
  desde?: string,
  hasta?: string,
  cuentaIds?: string[],
): Promise<AsientoDiario[]> {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (cuentaIds && cuentaIds.length > 0) params.set('cuentaIds', cuentaIds.join(','));
  const query = params.toString();
  return apiFetch<AsientoDiario[]>(`/contabilidad/diario${query ? `?${query}` : ''}`, token);
}

export function obtenerLibroMayor(token: string, cuentaId: string, desde: string, hasta: string): Promise<LibroMayor> {
  return apiFetch<LibroMayor>(`/contabilidad/mayor/${cuentaId}?desde=${desde}&hasta=${hasta}`, token);
}

export function obtenerPyg(token: string, desde: string, hasta: string): Promise<Pyg> {
  return apiFetch<Pyg>(`/contabilidad/pyg?desde=${desde}&hasta=${hasta}`, token);
}

export function obtenerBalance(token: string, fecha: string): Promise<Balance> {
  return apiFetch<Balance>(`/contabilidad/balance?fecha=${fecha}`, token);
}
