import { apiFetch } from './client';

export type EstadoCobro = 'COBRADO' | 'PENDIENTE_COBRO';
export type TipoFiscal = 'A' | 'B';

export interface ContratoIngreso {
  id: string;
  cliente: string;
  concepto: string;
  importe: string;
  fecha: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  estadoCobro: EstadoCobro;
  cuentaDestinoId?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
}

export interface DatosContratoIngreso {
  cliente: string;
  concepto: string;
  fecha: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  tipoFiscal?: TipoFiscal;
  importe?: number;
  ivaPercent?: number;
  baseImponible?: number;
}

export interface CrearContratoIngresoInput extends DatosContratoIngreso {
  estadoCobro: EstadoCobro;
  cuentaDestinoId?: string;
}

export interface ListarContratosIngresoFiltro {
  plazaId?: string;
  estadoCobro?: EstadoCobro;
}

export function listarContratosIngreso(
  token: string,
  filtro: ListarContratosIngresoFiltro = {},
): Promise<ContratoIngreso[]> {
  const params = new URLSearchParams();
  if (filtro.plazaId) params.set('plazaId', filtro.plazaId);
  if (filtro.estadoCobro) params.set('estadoCobro', filtro.estadoCobro);
  const query = params.toString();
  return apiFetch<ContratoIngreso[]>(`/contratos-ingreso${query ? `?${query}` : ''}`, token);
}

export function obtenerContratoIngreso(token: string, id: string): Promise<ContratoIngreso> {
  return apiFetch<ContratoIngreso>(`/contratos-ingreso/${id}`, token);
}

export function crearContratoIngreso(token: string, data: CrearContratoIngresoInput): Promise<ContratoIngreso> {
  return apiFetch<ContratoIngreso>('/contratos-ingreso', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarContratoIngreso(
  token: string,
  id: string,
  data: DatosContratoIngreso,
): Promise<ContratoIngreso> {
  return apiFetch<ContratoIngreso>(`/contratos-ingreso/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function cobrarContratoIngreso(token: string, id: string, cuentaDestinoId: string): Promise<ContratoIngreso> {
  return apiFetch<ContratoIngreso>(`/contratos-ingreso/${id}/cobrar`, token, {
    method: 'POST',
    body: JSON.stringify({ cuentaDestinoId }),
  });
}

export function eliminarContratoIngreso(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/contratos-ingreso/${id}`, token, { method: 'DELETE' });
}
