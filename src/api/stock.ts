import { apiFetch, apiUpload } from './client';

export type TipoAjusteStock = 'CONSUMO_INTERNO' | 'MERMA';
export type TipoFiscal = 'A' | 'B';
export type DireccionOrden = 'ARRIBA' | 'ABAJO';
export type TipoProducto = 'VENTA_DIRECTA' | 'INSUMO' | 'ELABORADO';
export type UnidadMedida = 'KG' | 'GRAMOS' | 'LITROS' | 'MILILITROS' | 'UNIDADES';
export type EstadoLote = 'POR_CONSUMIR' | 'CONSUMIENDO' | 'CONSUMIDO';

export interface Producto {
  id: string;
  nombre: string;
  precioVentaPublico: string;
  costeUnitarioActual: string;
  cantidadActual: number;
  aplicaIva: boolean;
  activo: boolean;
  imagenUrl: string | null;
  orden: number;
  tipo: TipoProducto;
  familiaElaboradoId: string | null;
  factorEquivalencia: string | null;
}

export interface RecepcionStock {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  costeUnitario: string;
  baseImponible: string;
  importeTotal: string;
  fecha: string;
  cuentaOrigenId: string;
  plazaId?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  importeIva?: string;
  cantidadMedida?: string;
  unidadMedida?: UnidadMedida;
  fechaInicioUso?: string;
  estadoLote?: EstadoLote;
  // true si ya se asentó su asiento de cierre — historia asentada, no editable ni eliminable.
  cerrado?: boolean;
}

export interface FamiliaElaborado {
  id: string;
  nombre: string;
}

export interface VinculacionInsumo {
  id: string;
  insumoId: string;
  insumoNombre: string;
  familiaElaboradoId: string;
}

export interface AjusteStock {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: TipoAjusteStock;
  cantidad: number;
  costeUnitarioAplicado: string;
  fecha: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
}

export function listarProductos(token: string): Promise<Producto[]> {
  return apiFetch<Producto[]>('/productos', token);
}

// Vista reducida (sin coste ni cantidad en stock) para quien solo necesita vender, no gestionar.
export interface ProductoVenta {
  id: string;
  nombre: string;
  precioVentaPublico: string;
  aplicaIva: boolean;
  activo: boolean;
  imagenUrl: string | null;
  orden: number;
}

export function listarProductosVenta(token: string): Promise<ProductoVenta[]> {
  return apiFetch<ProductoVenta[]>('/productos/venta', token);
}

export function obtenerProducto(token: string, id: string): Promise<Producto> {
  return apiFetch<Producto>(`/productos/${id}`, token);
}

export function crearProducto(
  token: string,
  data: {
    nombre: string;
    // Ausente para INSUMO — nunca se vende directamente, no tiene PVP.
    precioVentaPublico?: number;
    aplicaIva: boolean;
    tipo?: TipoProducto;
    familiaElaboradoId?: string;
    factorEquivalencia?: number;
  },
): Promise<Producto> {
  return apiFetch<Producto>('/productos', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarProducto(
  token: string,
  id: string,
  data: { nombre: string; precioVentaPublico?: number; aplicaIva: boolean },
): Promise<Producto> {
  return apiFetch<Producto>(`/productos/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function desactivarProducto(token: string, id: string): Promise<Producto> {
  return apiFetch<Producto>(`/productos/${id}/desactivar`, token, { method: 'POST' });
}

export function activarProducto(token: string, id: string): Promise<Producto> {
  return apiFetch<Producto>(`/productos/${id}/activar`, token, { method: 'POST' });
}

export function moverProducto(token: string, id: string, direccion: DireccionOrden): Promise<Producto[]> {
  return apiFetch<Producto[]>(`/productos/${id}/mover`, token, {
    method: 'POST',
    body: JSON.stringify({ direccion }),
  });
}

export function eliminarProducto(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/productos/${id}`, token, { method: 'DELETE' });
}

export function subirImagenProducto(token: string, id: string, archivo: File): Promise<Producto> {
  const formData = new FormData();
  formData.append('imagen', archivo);
  return apiUpload<Producto>(`/productos/${id}/imagen`, token, formData);
}

export function crearRecepcionStock(
  token: string,
  data: {
    productoId: string;
    cantidad: number;
    fecha: string;
    cuentaOrigenId: string;
    plazaId?: string;
    tipoFiscal?: TipoFiscal;
    costeUnitario?: number;
    ivaPercent?: number;
    baseImponible?: number;
    cantidadMedida?: number;
    unidadMedida?: UnidadMedida;
  },
): Promise<RecepcionStock> {
  return apiFetch<RecepcionStock>('/recepciones-stock', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarRecepcionStock(
  token: string,
  id: string,
  data: {
    cantidad: number;
    fecha: string;
    cuentaOrigenId: string;
    plazaId?: string;
    tipoFiscal?: TipoFiscal;
    costeUnitario?: number;
    ivaPercent?: number;
    baseImponible?: number;
    cantidadMedida?: number;
    unidadMedida?: UnidadMedida;
  },
): Promise<RecepcionStock> {
  return apiFetch<RecepcionStock>(`/recepciones-stock/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarRecepcionStock(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/recepciones-stock/${id}`, token, { method: 'DELETE' });
}

export function listarRecepcionesStock(token: string, productoId: string): Promise<RecepcionStock[]> {
  return apiFetch<RecepcionStock[]>(`/recepciones-stock?productoId=${productoId}`, token);
}

// Única acción manual del ciclo de un lote de INSUMO — fecha seleccionable, no solo "ahora".
// Vive en /ventas-bar (no /recepciones-stock): cerrar el lote anterior exige leer ventas.
export function iniciarUsoLote(token: string, id: string, fecha: string): Promise<RecepcionStock> {
  return apiFetch<RecepcionStock>(`/ventas-bar/lotes/${id}/iniciar-uso`, token, {
    method: 'POST',
    body: JSON.stringify({ fecha }),
  });
}

export function listarFamiliasElaborado(token: string): Promise<FamiliaElaborado[]> {
  return apiFetch<FamiliaElaborado[]>('/familias-elaborado', token);
}

export function crearFamiliaElaborado(token: string, nombre: string): Promise<FamiliaElaborado> {
  return apiFetch<FamiliaElaborado>('/familias-elaborado', token, { method: 'POST', body: JSON.stringify({ nombre }) });
}

export function listarInsumosDeFamilia(token: string, familiaId: string): Promise<VinculacionInsumo[]> {
  return apiFetch<VinculacionInsumo[]>(`/familias-elaborado/${familiaId}/insumos`, token);
}

export function vincularInsumo(token: string, familiaId: string, insumoId: string): Promise<VinculacionInsumo> {
  return apiFetch<VinculacionInsumo>(`/familias-elaborado/${familiaId}/insumos`, token, {
    method: 'POST',
    body: JSON.stringify({ insumoId }),
  });
}

export function desvincularInsumo(token: string, vinculacionId: string): Promise<void> {
  return apiFetch<void>(`/familias-elaborado/vinculaciones/${vinculacionId}`, token, { method: 'DELETE' });
}

export function crearAjusteStock(
  token: string,
  data: {
    productoId: string;
    tipo: TipoAjusteStock;
    cantidad: number;
    fecha: string;
    plazaId?: string;
    fechaId?: string;
    paseId?: string;
  },
): Promise<AjusteStock> {
  return apiFetch<AjusteStock>('/ajustes-stock', token, { method: 'POST', body: JSON.stringify(data) });
}

export function actualizarAjusteStock(
  token: string,
  id: string,
  data: {
    tipo: TipoAjusteStock;
    cantidad: number;
    fecha: string;
    plazaId?: string;
    fechaId?: string;
    paseId?: string;
  },
): Promise<AjusteStock> {
  return apiFetch<AjusteStock>(`/ajustes-stock/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function eliminarAjusteStock(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/ajustes-stock/${id}`, token, { method: 'DELETE' });
}

export function listarAjustesStock(token: string, productoId: string): Promise<AjusteStock[]> {
  return apiFetch<AjusteStock[]>(`/ajustes-stock?productoId=${productoId}`, token);
}
