import { apiFetch } from './client';

export type TipoFiscal = 'A' | 'B';

export interface VentaBarLinea {
  productoId: string;
  cantidad: number;
  precioUnitarioAplicado: string;
  costeUnitarioAplicado: string;
}

export interface VentaBar {
  id: string;
  paseId: string;
  fechaId: string;
  plazaId: string;
  cuentaCobroId: string;
  lineas: VentaBarLinea[];
  importeTotal: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
}

export interface LineaPedidoInput {
  productoId: string;
  cantidad: number;
}

export interface ListarVentasBarFiltro {
  paseId?: string;
  fechaId?: string;
  plazaId?: string;
}

export function listarVentasBar(token: string, filtro: ListarVentasBarFiltro = {}): Promise<VentaBar[]> {
  const params = new URLSearchParams();
  if (filtro.paseId) params.set('paseId', filtro.paseId);
  if (filtro.fechaId) params.set('fechaId', filtro.fechaId);
  if (filtro.plazaId) params.set('plazaId', filtro.plazaId);
  const query = params.toString();
  return apiFetch<VentaBar[]>(`/ventas-bar${query ? `?${query}` : ''}`, token);
}

export function crearVentaBar(
  token: string,
  paseId: string,
  cuentaCobroId: string,
  lineas: LineaPedidoInput[],
  tipoFiscal?: TipoFiscal,
  ivaPercent?: number,
): Promise<VentaBar> {
  return apiFetch<VentaBar>('/ventas-bar', token, {
    method: 'POST',
    body: JSON.stringify({ paseId, cuentaCobroId, lineas, tipoFiscal, ivaPercent }),
  });
}

export function actualizarVentaBar(
  token: string,
  id: string,
  cuentaCobroId: string,
  lineas: LineaPedidoInput[],
): Promise<VentaBar> {
  return apiFetch<VentaBar>(`/ventas-bar/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ cuentaCobroId, lineas }),
  });
}

export function reclasificarLoteVentasBar(
  token: string,
  ids: string[],
  tipoFiscal: TipoFiscal,
  ivaPercent?: number,
): Promise<VentaBar[]> {
  return apiFetch<VentaBar[]>('/ventas-bar/reclasificar-lote', token, {
    method: 'PATCH',
    body: JSON.stringify({ ids, tipoFiscal, ivaPercent }),
  });
}

export function eliminarVentaBar(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/ventas-bar/${id}`, token, { method: 'DELETE' });
}

// Coste actual de un producto ELABORADO (ej. palomitas), calculado en caliente a partir de
// los insumos vinculados a su familia — ver CosteElaboradoService en el backend.
export function obtenerCosteElaborado(token: string, productoId: string): Promise<{ costeUnitarioActual: string }> {
  return apiFetch<{ costeUnitarioActual: string }>(`/ventas-bar/coste-elaborado/${productoId}`, token);
}
