import { apiFetch } from './client';

export interface ResumenPeriodo {
  ingresos: string;
  gastos: string;
  beneficio: string;
  ventasTaquilla: string;
  ventasBar: string;
  ventasContratos: string;
}

export interface ResumenGeneral {
  patrimonioLiquido: string;
  periodoActual: ResumenPeriodo;
  periodoAnterior: ResumenPeriodo;
  gastosPendientes: { total: string; count: number };
  cobrosPendientes: { total: string; count: number };
}

export interface ResumenPlaza {
  plazaId: string;
  plazaNombre: string;
  ingresos: string;
  gastos: string;
  beneficio: string;
}

export interface DetallePlaza {
  plazaId: string;
  plazaNombre: string;
  ingresosTaquilla: string;
  ingresosBar: string;
  ingresosContratos: string;
  ingresosTotal: string;
  gastosPorCategoria: { categoriaNombre: string; importe: string }[];
  costePersonal: string;
  gastosTotal: string;
  beneficio: string;
}

export interface ResumenActivos {
  valorNetoContableTotal: string;
  amortizacionAcumuladaTotal: string;
  porCategoria: { categoriaNombre: string; valorNetoContable: string; amortizacionAcumulada: string }[];
}

export interface PuntoFlujoCaja {
  periodo: string;
  entradas: string;
  salidas: string;
}

export function obtenerResumenGeneral(token: string, desde: string, hasta: string): Promise<ResumenGeneral> {
  return apiFetch<ResumenGeneral>(`/analisis/resumen?desde=${desde}&hasta=${hasta}`, token);
}

export function listarResumenPlazas(token: string, desde?: string, hasta?: string): Promise<ResumenPlaza[]> {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const query = params.toString();
  return apiFetch<ResumenPlaza[]>(`/analisis/plazas${query ? `?${query}` : ''}`, token);
}

export function obtenerDetallePlaza(token: string, plazaId: string, desde?: string, hasta?: string): Promise<DetallePlaza> {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const query = params.toString();
  return apiFetch<DetallePlaza>(`/analisis/plazas/${plazaId}${query ? `?${query}` : ''}`, token);
}

export function obtenerResumenActivos(token: string): Promise<ResumenActivos> {
  return apiFetch<ResumenActivos>('/analisis/activos', token);
}

export function obtenerFlujoCaja(token: string, desde: string, hasta: string): Promise<PuntoFlujoCaja[]> {
  return apiFetch<PuntoFlujoCaja[]>(`/analisis/flujo-caja?desde=${desde}&hasta=${hasta}`, token);
}
