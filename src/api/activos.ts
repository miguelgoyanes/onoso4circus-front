import { apiFetch } from './client';

export type TipoFiscal = 'A' | 'B';

export interface CategoriaActivo {
  id: string;
  nombre: string;
  cuentaContableId: string;
  cuentaContableCode: string;
  aplicaIva: boolean;
  esPredefinida: boolean;
  usada: boolean;
}

export interface Activo {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  nombre: string;
  fechaCompra: string;
  coste: string;
  cuentaPagoId: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
  vidaUtilAnios: number;
  valorResidual: string;
  activo: boolean;
  amortizacionAcumulada: string;
  valorNetoContable: string;
  ultimaAmortizacionRegistradaEn?: string;
}

export interface DatosEconomicosActivoInput {
  categoriaId: string;
  fechaCompra: string;
  cuentaPagoId: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: number;
  baseImponible?: number;
  importe?: number;
}

export interface CrearActivoInput extends DatosEconomicosActivoInput {
  nombre: string;
  vidaUtilAnios: number;
  valorResidual: number;
}

export interface ActualizarActivoInput {
  nombre: string;
  vidaUtilAnios: number;
  valorResidual: number;
  economia?: DatosEconomicosActivoInput;
}

export interface ListarActivosFiltro {
  categoriaId?: string;
}

export function listarActivos(token: string, filtro: ListarActivosFiltro = {}): Promise<Activo[]> {
  const params = new URLSearchParams();
  if (filtro.categoriaId) params.set('categoriaId', filtro.categoriaId);
  const query = params.toString();
  return apiFetch<Activo[]>(`/activos${query ? `?${query}` : ''}`, token);
}

export function obtenerActivo(token: string, id: string): Promise<Activo> {
  return apiFetch<Activo>(`/activos/${id}`, token);
}

export function crearActivo(token: string, data: CrearActivoInput): Promise<Activo> {
  return apiFetch<Activo>('/activos', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarActivo(token: string, id: string, data: ActualizarActivoInput): Promise<Activo> {
  return apiFetch<Activo>(`/activos/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function darDeBajaActivo(token: string, id: string): Promise<Activo> {
  return apiFetch<Activo>(`/activos/${id}/dar-de-baja`, token, { method: 'POST' });
}

export function reactivarActivo(token: string, id: string): Promise<Activo> {
  return apiFetch<Activo>(`/activos/${id}/reactivar`, token, { method: 'POST' });
}

export function eliminarActivo(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/activos/${id}`, token, { method: 'DELETE' });
}

// Categorías de activo
export function listarCategoriasActivo(token: string): Promise<CategoriaActivo[]> {
  return apiFetch<CategoriaActivo[]>('/categorias-activo', token);
}

export function crearCategoriaActivo(
  token: string,
  data: { nombre: string; cuentaContableCode: string; aplicaIva: boolean },
): Promise<CategoriaActivo> {
  return apiFetch<CategoriaActivo>('/categorias-activo', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarCategoriaActivo(
  token: string,
  id: string,
  data: { nombre: string; aplicaIva: boolean; cuentaContableCode?: string },
): Promise<CategoriaActivo> {
  return apiFetch<CategoriaActivo>(`/categorias-activo/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarCategoriaActivo(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/categorias-activo/${id}`, token, { method: 'DELETE' });
}
