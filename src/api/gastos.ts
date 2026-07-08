import { apiFetch } from './client';

export type TipoGasto = 'PERSONAL' | 'PLAZA' | 'GENERAL';
export type EstadoPagoGasto = 'PAGADO' | 'PENDIENTE_PAGO';
export type CategoriaGastoPlaza = 'MONTAJE' | 'ALQUILER_MATERIAL' | 'PERMISO_LICENCIA' | 'OTRO';
export type CategoriaGastoGeneral =
  | 'GESTORIA'
  | 'SEGURO_GENERAL'
  | 'MARKETING'
  | 'SUSCRIPCION'
  | 'OTRO';
export type ConceptoGastoDerivado = 'DIETA' | 'SEGURO' | 'OTRO';

export interface GastoDerivado {
  concepto: ConceptoGastoDerivado;
  importe: string;
}

export interface Gasto {
  id: string;
  tipo: TipoGasto;
  fecha: string;
  descripcion: string;
  estadoPago: EstadoPagoGasto;
  importeTotal: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  empleadoId?: string;
  asignacionId?: string;
  importeSalario?: string;
  costeSs?: string;
  gastosDerivados: GastoDerivado[];
  categoriaPlaza?: CategoriaGastoPlaza;
  categoriaGeneral?: CategoriaGastoGeneral;
  importe?: string;
}

export interface CrearGastoInput {
  tipo: TipoGasto;
  fecha: string;
  descripcion: string;
  estadoPago: EstadoPagoGasto;
  cuentaPagoId?: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  empleadoId?: string;
  asignacionId?: string;
  importeSalario?: number;
  costeSs?: number;
  gastosDerivados?: { concepto: ConceptoGastoDerivado; importe: number }[];
  categoriaPlaza?: CategoriaGastoPlaza;
  categoriaGeneral?: CategoriaGastoGeneral;
  importe?: number;
}

export interface ListarGastosFiltro {
  plazaId?: string;
  tipo?: TipoGasto;
  estadoPago?: EstadoPagoGasto;
}

export function listarGastos(token: string, filtro: ListarGastosFiltro = {}): Promise<Gasto[]> {
  const params = new URLSearchParams();
  if (filtro.plazaId) params.set('plazaId', filtro.plazaId);
  if (filtro.tipo) params.set('tipo', filtro.tipo);
  if (filtro.estadoPago) params.set('estadoPago', filtro.estadoPago);
  const query = params.toString();
  return apiFetch<Gasto[]>(`/gastos${query ? `?${query}` : ''}`, token);
}

export function crearGasto(token: string, data: CrearGastoInput): Promise<Gasto> {
  return apiFetch<Gasto>('/gastos', token, { method: 'POST', body: JSON.stringify(data) });
}

export function pagarGasto(token: string, id: string, cuentaPagoId: string): Promise<Gasto> {
  return apiFetch<Gasto>(`/gastos/${id}/pagar`, token, {
    method: 'POST',
    body: JSON.stringify({ cuentaPagoId }),
  });
}
