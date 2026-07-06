import { apiFetch } from './client';

export type TipoActividad = 'SHOW' | 'TALLER' | 'OTRO';

export interface Plaza {
  id: string;
  nombre: string;
  ubicacion: string;
}

export interface Fecha {
  id: string;
  plazaId: string;
  fecha: string;
  tipoActividad: TipoActividad;
}

export interface Pase {
  id: string;
  fechaId: string;
  hora: string;
  nombre?: string;
}

// Plazas
export function listarPlazas(token: string): Promise<Plaza[]> {
  return apiFetch<Plaza[]>('/plazas', token);
}

export function obtenerPlaza(token: string, id: string): Promise<Plaza> {
  return apiFetch<Plaza>(`/plazas/${id}`, token);
}

export function crearPlaza(
  token: string,
  data: { nombre: string; ubicacion: string },
): Promise<Plaza> {
  return apiFetch<Plaza>('/plazas', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarPlaza(
  token: string,
  id: string,
  data: { nombre: string; ubicacion: string },
): Promise<Plaza> {
  return apiFetch<Plaza>(`/plazas/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarPlaza(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/plazas/${id}`, token, { method: 'DELETE' });
}

// Fechas
export function listarFechas(token: string, plazaId: string): Promise<Fecha[]> {
  return apiFetch<Fecha[]>(`/plazas/${plazaId}/fechas`, token);
}

export function obtenerFecha(token: string, id: string): Promise<Fecha> {
  return apiFetch<Fecha>(`/fechas/${id}`, token);
}

export function crearFecha(
  token: string,
  plazaId: string,
  data: { fecha: string; tipoActividad: TipoActividad },
): Promise<Fecha> {
  return apiFetch<Fecha>(`/plazas/${plazaId}/fechas`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function actualizarFecha(
  token: string,
  id: string,
  data: { fecha: string; tipoActividad: TipoActividad },
): Promise<Fecha> {
  return apiFetch<Fecha>(`/fechas/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarFecha(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/fechas/${id}`, token, { method: 'DELETE' });
}

// Pases
export function listarPases(token: string, fechaId: string): Promise<Pase[]> {
  return apiFetch<Pase[]>(`/fechas/${fechaId}/pases`, token);
}

export function crearPase(
  token: string,
  fechaId: string,
  data: { hora: string; nombre?: string },
): Promise<Pase> {
  return apiFetch<Pase>(`/fechas/${fechaId}/pases`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function actualizarPase(
  token: string,
  id: string,
  data: { hora: string; nombre?: string },
): Promise<Pase> {
  return apiFetch<Pase>(`/pases/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarPase(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/pases/${id}`, token, { method: 'DELETE' });
}
