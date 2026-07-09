import { apiFetch } from './client';

export type TipoCuentaDinero = 'BANCO' | 'CAJA';
export type TipoMovimientoCapital = 'ENTRADA' | 'SALIDA';
export type OrigenMovimiento = 'TRANSFERENCIA' | 'CAPITAL' | 'AJUSTE_ARQUEO';

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
  origenTipo: OrigenMovimiento | null;
  origenId: string | null;
}

export interface Transferencia {
  id: string;
  origenId: string;
  destinoId: string;
  importe: string;
  concepto?: string;
  fecha: string;
}

export interface MovimientoCapital {
  id: string;
  cuentaId: string;
  tipo: TipoMovimientoCapital;
  importe: string;
  concepto?: string;
  fecha: string;
}

export interface AjusteArqueo {
  id: string;
  cuentaId: string;
  importeTeorico: string;
  importeReal: string;
  diferencia: string;
  concepto?: string;
  fecha: string;
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

export function obtenerTransferencia(token: string, id: string): Promise<Transferencia> {
  return apiFetch<Transferencia>(`/tesoreria/transferencias/${id}`, token);
}

export function actualizarTransferencia(
  token: string,
  id: string,
  data: { origenId: string; destinoId: string; importe: number; concepto?: string },
): Promise<Transferencia> {
  return apiFetch<Transferencia>(`/tesoreria/transferencias/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarTransferencia(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/tesoreria/transferencias/${id}`, token, { method: 'DELETE' });
}

export function crearMovimientoCapital(
  token: string,
  data: { cuentaId: string; tipo: TipoMovimientoCapital; importe: number; concepto?: string },
): Promise<void> {
  return apiFetch<void>('/tesoreria/movimientos-capital', token, { method: 'POST', body: JSON.stringify(data) });
}

export function obtenerMovimientoCapital(token: string, id: string): Promise<MovimientoCapital> {
  return apiFetch<MovimientoCapital>(`/tesoreria/movimientos-capital/${id}`, token);
}

export function actualizarMovimientoCapital(
  token: string,
  id: string,
  data: { tipo: TipoMovimientoCapital; importe: number; concepto?: string },
): Promise<MovimientoCapital> {
  return apiFetch<MovimientoCapital>(`/tesoreria/movimientos-capital/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function eliminarMovimientoCapital(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/tesoreria/movimientos-capital/${id}`, token, { method: 'DELETE' });
}

export function crearAjusteArqueo(
  token: string,
  cuentaId: string,
  data: { importeReal: number; concepto?: string },
): Promise<AjusteArqueo> {
  return apiFetch<AjusteArqueo>(`/tesoreria/cuentas/${cuentaId}/ajustes-arqueo`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function obtenerAjusteArqueo(token: string, id: string): Promise<AjusteArqueo> {
  return apiFetch<AjusteArqueo>(`/tesoreria/ajustes-arqueo/${id}`, token);
}

export function actualizarAjusteArqueo(
  token: string,
  id: string,
  data: { importeReal: number; concepto?: string },
): Promise<AjusteArqueo> {
  return apiFetch<AjusteArqueo>(`/tesoreria/ajustes-arqueo/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarAjusteArqueo(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/tesoreria/ajustes-arqueo/${id}`, token, { method: 'DELETE' });
}
