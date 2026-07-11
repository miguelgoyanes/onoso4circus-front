import { apiFetch } from './client';

export type EstadoPagoGasto = 'PAGADO' | 'PENDIENTE_PAGO';
export type TipoFiscal = 'A' | 'B';
export type ConceptoPersonal = 'SALARIO' | 'SEGURIDAD_SOCIAL' | 'DIETA' | 'SEGURO' | 'OTRO';

export interface CategoriaGasto {
  id: string;
  nombre: string;
  cuentaContableId: string | null;
  cuentaContableCode: string | null;
  requiereEmpleado: boolean;
  esPagoPersonal: boolean;
  aplicaIva: boolean;
  esPredefinida: boolean;
  usada: boolean;
}

export interface ConceptoPersonalGasto {
  concepto: ConceptoPersonal;
  importe: string;
}

export interface Gasto {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  fecha: string;
  descripcion: string;
  importe: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  empleadoId?: string;
  estadoPago: EstadoPagoGasto;
  cuentaPagoId?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
  conceptos: ConceptoPersonalGasto[];
}

export interface ConceptoPersonalInput {
  concepto: ConceptoPersonal;
  importe?: number;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: number;
  baseImponible?: number;
}

export interface CrearGastoInput {
  categoriaId: string;
  fecha: string;
  descripcion: string;
  estadoPago: EstadoPagoGasto;
  cuentaPagoId?: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  empleadoId?: string;
  importe?: number;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: number;
  baseImponible?: number;
  conceptos?: ConceptoPersonalInput[];
}

export interface ListarGastosFiltro {
  plazaId?: string;
  categoriaId?: string;
  estadoPago?: EstadoPagoGasto;
}

export function listarGastos(token: string, filtro: ListarGastosFiltro = {}): Promise<Gasto[]> {
  const params = new URLSearchParams();
  if (filtro.plazaId) params.set('plazaId', filtro.plazaId);
  if (filtro.categoriaId) params.set('categoriaId', filtro.categoriaId);
  if (filtro.estadoPago) params.set('estadoPago', filtro.estadoPago);
  const query = params.toString();
  return apiFetch<Gasto[]>(`/gastos${query ? `?${query}` : ''}`, token);
}

export function obtenerGasto(token: string, id: string): Promise<Gasto> {
  return apiFetch<Gasto>(`/gastos/${id}`, token);
}

export function crearGasto(token: string, data: CrearGastoInput): Promise<Gasto> {
  return apiFetch<Gasto>('/gastos', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarGasto(token: string, id: string, data: CrearGastoInput): Promise<Gasto> {
  return apiFetch<Gasto>(`/gastos/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function pagarGasto(token: string, id: string, cuentaPagoId: string): Promise<Gasto> {
  return apiFetch<Gasto>(`/gastos/${id}/pagar`, token, {
    method: 'POST',
    body: JSON.stringify({ cuentaPagoId }),
  });
}

export function eliminarGasto(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/gastos/${id}`, token, { method: 'DELETE' });
}

// Categorías de gasto
export function listarCategoriasGasto(token: string): Promise<CategoriaGasto[]> {
  return apiFetch<CategoriaGasto[]>('/categorias-gasto', token);
}

export function crearCategoriaGasto(
  token: string,
  data: { nombre: string; cuentaContableCode: string; requiereEmpleado: boolean; aplicaIva: boolean },
): Promise<CategoriaGasto> {
  return apiFetch<CategoriaGasto>('/categorias-gasto', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function actualizarCategoriaGasto(
  token: string,
  id: string,
  data: { nombre: string; aplicaIva: boolean; requiereEmpleado: boolean; cuentaContableCode?: string },
): Promise<CategoriaGasto> {
  return apiFetch<CategoriaGasto>(`/categorias-gasto/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function eliminarCategoriaGasto(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/categorias-gasto/${id}`, token, { method: 'DELETE' });
}
