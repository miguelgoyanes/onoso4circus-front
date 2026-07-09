import { apiFetch } from './client';

export type TipoCuentaDinero = 'BANCO' | 'CAJA';
export type TipoMovimientoCapital = 'ENTRADA' | 'SALIDA';

export interface CuentaPublica {
  id: string;
  nombre: string;
  tipo: TipoCuentaDinero;
  activa: boolean;
  usableEnTaquilla: boolean;
  usableEnBar: boolean;
  saldo: string;
}

export interface MovimientoCuenta {
  journalEntryId: string;
  fecha: string;
  descripcion: string;
  importe: string;
}

export function listarCuentas(token: string): Promise<CuentaPublica[]> {
  return apiFetch<CuentaPublica[]>('/tesoreria/cuentas', token);
}

export function obtenerCuenta(token: string, id: string): Promise<CuentaPublica> {
  return apiFetch<CuentaPublica>(`/tesoreria/cuentas/${id}`, token);
}

export function listarMovimientos(token: string, id: string): Promise<MovimientoCuenta[]> {
  return apiFetch<MovimientoCuenta[]>(`/tesoreria/cuentas/${id}/movimientos`, token);
}

export function crearCuenta(
  token: string,
  data: { nombre: string; tipo: TipoCuentaDinero; usableEnTaquilla: boolean; usableEnBar: boolean },
): Promise<CuentaPublica> {
  return apiFetch<CuentaPublica>('/tesoreria/cuentas', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarCuenta(
  token: string,
  id: string,
  data: { nombre: string; usableEnTaquilla: boolean; usableEnBar: boolean },
): Promise<CuentaPublica> {
  return apiFetch<CuentaPublica>(`/tesoreria/cuentas/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function activarCuenta(token: string, id: string): Promise<CuentaPublica> {
  return apiFetch<CuentaPublica>(`/tesoreria/cuentas/${id}/activar`, token, { method: 'POST' });
}

export function desactivarCuenta(token: string, id: string): Promise<CuentaPublica> {
  return apiFetch<CuentaPublica>(`/tesoreria/cuentas/${id}/desactivar`, token, { method: 'POST' });
}

export function eliminarCuenta(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/tesoreria/cuentas/${id}`, token, { method: 'DELETE' });
}

export function crearTransferencia(
  token: string,
  data: { origenId: string; destinoId: string; importe: number; concepto?: string },
): Promise<void> {
  return apiFetch<void>('/tesoreria/transferencias', token, { method: 'POST', body: JSON.stringify(data) });
}

export function crearMovimientoCapital(
  token: string,
  data: { cuentaId: string; tipo: TipoMovimientoCapital; importe: number; concepto?: string },
): Promise<void> {
  return apiFetch<void>('/tesoreria/movimientos-capital', token, { method: 'POST', body: JSON.stringify(data) });
}
