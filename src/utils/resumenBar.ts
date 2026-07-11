import type { VentaBar } from '../api/bar';

interface ProductoNombrado {
  id: string;
  nombre: string;
}

export interface DesgloseProducto {
  productoId: string;
  nombre: string;
  cantidad: number;
  importe: number;
}

export interface ResumenBar {
  cantidad: number;
  importe: number;
  desglose: DesgloseProducto[];
}

export function importePedido(pedido: VentaBar): number {
  return Number(pedido.importeTotal);
}

export function calcularResumenBar(pedidos: VentaBar[], productos: ProductoNombrado[]): ResumenBar {
  const porProducto = new Map<string, { cantidad: number; importe: number }>();
  let cantidadTotal = 0;
  for (const pedido of pedidos) {
    for (const linea of pedido.lineas) {
      const actual = porProducto.get(linea.productoId) ?? { cantidad: 0, importe: 0 };
      const importeLinea = linea.cantidad * Number(linea.precioUnitarioAplicado);
      actual.cantidad += linea.cantidad;
      actual.importe += importeLinea;
      porProducto.set(linea.productoId, actual);
      cantidadTotal += linea.cantidad;
    }
  }
  const desglose = [...porProducto.entries()].map(([productoId, stats]) => ({
    productoId,
    nombre: productos.find((p) => p.id === productoId)?.nombre ?? productoId,
    ...stats,
  }));
  return {
    cantidad: cantidadTotal,
    importe: pedidos.reduce((sum, p) => sum + importePedido(p), 0),
    desglose,
  };
}
