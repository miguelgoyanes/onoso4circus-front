import { apiFetch } from './client';

export type RegimenEmpleado = 'CUENTA_AJENA' | 'AUTONOMO';

export interface Empleado {
  id: string;
  nombre: string;
  rol: string;
  regimen: RegimenEmpleado;
  activo: boolean;
  importeReferenciaDia?: string;
}

export interface EmpleadoInput {
  nombre: string;
  rol: string;
  regimen: RegimenEmpleado;
  importeReferenciaDia?: number;
}

export function listarEmpleados(token: string): Promise<Empleado[]> {
  return apiFetch<Empleado[]>('/empleados', token);
}

export function obtenerEmpleado(token: string, id: string): Promise<Empleado> {
  return apiFetch<Empleado>(`/empleados/${id}`, token);
}

export function crearEmpleado(token: string, data: EmpleadoInput): Promise<Empleado> {
  return apiFetch<Empleado>('/empleados', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarEmpleado(token: string, id: string, data: EmpleadoInput): Promise<Empleado> {
  return apiFetch<Empleado>(`/empleados/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function desactivarEmpleado(token: string, id: string): Promise<Empleado> {
  return apiFetch<Empleado>(`/empleados/${id}/desactivar`, token, { method: 'POST' });
}

export function reactivarEmpleado(token: string, id: string): Promise<Empleado> {
  return apiFetch<Empleado>(`/empleados/${id}/reactivar`, token, { method: 'POST' });
}
