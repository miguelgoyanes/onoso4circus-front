import { apiFetch, apiUpload } from './client';

export type TipoVenta = 'ONLINE' | 'PRESENCIAL' | 'AMBOS';

export interface PlazaWeb {
  id: string;
  ciudad: string;
  ubicacion: string;
  mapsUrl: string;
  descripcion: string | null;
  cartelUrl: string | null;
  entradasUrl: string;
  venta: TipoVenta;
  horasAntes: number | null;
  plazaId: string | null;
}

export interface Oferta {
  descuento: number;
  descripcion?: string;
}

export interface FuncionWeb {
  id: string;
  plazaWebId: string;
  fecha: string;
  horarios: string[];
  descuento: number | null;
  descuentoDescripcion: string | null;
}

export interface DatosPlazaWeb {
  ciudad: string;
  ubicacion: string;
  mapsUrl: string;
  descripcion?: string | null;
  entradasUrl: string;
  venta: TipoVenta;
  horasAntes?: number | null;
  plazaId?: string | null;
}

export interface DatosFuncionWeb {
  fecha: string;
  horarios: string[];
  oferta?: Oferta;
}

// Plazas web
export function listarPlazasWeb(token: string): Promise<PlazaWeb[]> {
  return apiFetch<PlazaWeb[]>('/plazas-web', token);
}

export function obtenerPlazaWeb(token: string, id: string): Promise<PlazaWeb> {
  return apiFetch<PlazaWeb>(`/plazas-web/${id}`, token);
}

export function crearPlazaWeb(token: string, data: DatosPlazaWeb): Promise<PlazaWeb> {
  return apiFetch<PlazaWeb>('/plazas-web', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarPlazaWeb(token: string, id: string, data: DatosPlazaWeb): Promise<PlazaWeb> {
  return apiFetch<PlazaWeb>(`/plazas-web/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarPlazaWeb(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/plazas-web/${id}`, token, { method: 'DELETE' });
}

export function subirCartelPlazaWeb(token: string, id: string, archivo: File): Promise<PlazaWeb> {
  const formData = new FormData();
  formData.append('cartel', archivo);
  return apiUpload<PlazaWeb>(`/plazas-web/${id}/cartel`, token, formData);
}

// Funciones web
export function listarFuncionesWeb(token: string, plazaWebId: string): Promise<FuncionWeb[]> {
  return apiFetch<FuncionWeb[]>(`/plazas-web/${plazaWebId}/funciones`, token);
}

export function obtenerFuncionWeb(token: string, id: string): Promise<FuncionWeb> {
  return apiFetch<FuncionWeb>(`/funciones-web/${id}`, token);
}

export function crearFuncionWeb(token: string, plazaWebId: string, data: DatosFuncionWeb): Promise<FuncionWeb> {
  return apiFetch<FuncionWeb>(`/plazas-web/${plazaWebId}/funciones`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function actualizarFuncionWeb(token: string, id: string, data: DatosFuncionWeb): Promise<FuncionWeb> {
  return apiFetch<FuncionWeb>(`/funciones-web/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarFuncionWeb(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/funciones-web/${id}`, token, { method: 'DELETE' });
}
