import { apiFetch } from './client';

export type OrigenVenta = 'FISICA' | 'ONLINE_MANUAL';
export type TipoFiscal = 'A' | 'B';
export type DireccionOrden = 'ARRIBA' | 'ABAJO';
export type ModalidadTipoEntrada = 'PRESENCIAL' | 'ONLINE';

export interface TipoEntrada {
  id: string;
  nombre: string;
  precio: string;
  aplicaIva: boolean;
  color: string | null;
  modalidad: ModalidadTipoEntrada;
  orden: number;
  activo: boolean;
  usado: boolean;
}

export interface DatosTipoEntrada {
  nombre: string;
  precio: number;
  aplicaIva: boolean;
  color?: string;
  modalidad: ModalidadTipoEntrada;
}

export interface VentaEntradas {
  id: string;
  paseId: string;
  fechaId: string;
  plazaId: string;
  tipoEntradaId: string;
  cantidad: number;
  precioUnitarioAplicado: string;
  cuentaCobroId: string;
  origen: OrigenVenta;
  numeroEntradaDesde?: string;
  numeroEntradaHasta?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
}

export interface LineaVentaEntradas {
  tipoEntradaId: string;
  cantidad: number;
  cuentaCobroId: string;
  origen: OrigenVenta;
  numeroEntradaDesde?: string;
  numeroEntradaHasta?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: number;
}

export interface ListarVentasEntradasFiltro {
  paseId?: string;
  fechaId?: string;
  plazaId?: string;
}

export function listarTiposEntrada(token: string): Promise<TipoEntrada[]> {
  return apiFetch<TipoEntrada[]>('/tipos-entrada', token);
}

export function crearTipoEntrada(token: string, data: DatosTipoEntrada): Promise<TipoEntrada> {
  return apiFetch<TipoEntrada>('/tipos-entrada', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarTipoEntrada(token: string, id: string, data: DatosTipoEntrada): Promise<TipoEntrada> {
  return apiFetch<TipoEntrada>(`/tipos-entrada/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function moverTipoEntrada(token: string, id: string, direccion: DireccionOrden): Promise<TipoEntrada[]> {
  return apiFetch<TipoEntrada[]>(`/tipos-entrada/${id}/mover`, token, {
    method: 'POST',
    body: JSON.stringify({ direccion }),
  });
}

export function desactivarTipoEntrada(token: string, id: string): Promise<TipoEntrada> {
  return apiFetch<TipoEntrada>(`/tipos-entrada/${id}/desactivar`, token, { method: 'POST' });
}

export function activarTipoEntrada(token: string, id: string): Promise<TipoEntrada> {
  return apiFetch<TipoEntrada>(`/tipos-entrada/${id}/activar`, token, { method: 'POST' });
}

export function eliminarTipoEntrada(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/tipos-entrada/${id}`, token, { method: 'DELETE' });
}

export function listarVentasEntradas(
  token: string,
  filtro: ListarVentasEntradasFiltro = {},
): Promise<VentaEntradas[]> {
  const params = new URLSearchParams();
  if (filtro.paseId) params.set('paseId', filtro.paseId);
  if (filtro.fechaId) params.set('fechaId', filtro.fechaId);
  if (filtro.plazaId) params.set('plazaId', filtro.plazaId);
  const query = params.toString();
  return apiFetch<VentaEntradas[]>(`/ventas-entradas${query ? `?${query}` : ''}`, token);
}

export function crearLoteVentasEntradas(
  token: string,
  paseId: string,
  lineas: LineaVentaEntradas[],
): Promise<VentaEntradas[]> {
  return apiFetch<VentaEntradas[]>('/ventas-entradas', token, {
    method: 'POST',
    body: JSON.stringify({ paseId, lineas }),
  });
}

export function actualizarVentaEntradas(
  token: string,
  id: string,
  data: LineaVentaEntradas,
): Promise<VentaEntradas> {
  return apiFetch<VentaEntradas>(`/ventas-entradas/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function reclasificarLoteVentasEntradas(
  token: string,
  ids: string[],
  tipoFiscal: TipoFiscal,
  ivaPercent?: number,
): Promise<VentaEntradas[]> {
  return apiFetch<VentaEntradas[]>('/ventas-entradas/reclasificar-lote', token, {
    method: 'PATCH',
    body: JSON.stringify({ ids, tipoFiscal, ivaPercent }),
  });
}

export function eliminarVentaEntradas(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/ventas-entradas/${id}`, token, { method: 'DELETE' });
}
