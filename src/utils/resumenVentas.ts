import type { TipoEntrada, VentaEntradas } from '../api/taquilla';

export interface DesgloseTipoEntrada {
  tipoEntradaId: string;
  nombre: string;
  cantidad: number;
  importe: number;
}

export interface ResumenVentas {
  cantidad: number;
  importe: number;
  desglose: DesgloseTipoEntrada[];
}

export function importeVenta(venta: VentaEntradas): number {
  return venta.cantidad * Number(venta.precioUnitarioAplicado);
}

export function calcularResumenVentas(ventas: VentaEntradas[], tiposEntrada: TipoEntrada[]): ResumenVentas {
  const porTipo = new Map<string, { cantidad: number; importe: number }>();
  for (const venta of ventas) {
    const actual = porTipo.get(venta.tipoEntradaId) ?? { cantidad: 0, importe: 0 };
    actual.cantidad += venta.cantidad;
    actual.importe += importeVenta(venta);
    porTipo.set(venta.tipoEntradaId, actual);
  }
  const desglose = [...porTipo.entries()].map(([tipoEntradaId, stats]) => ({
    tipoEntradaId,
    nombre: tiposEntrada.find((t) => t.id === tipoEntradaId)?.nombre ?? tipoEntradaId,
    ...stats,
  }));
  return {
    cantidad: ventas.reduce((sum, v) => sum + v.cantidad, 0),
    importe: ventas.reduce((sum, v) => sum + importeVenta(v), 0),
    desglose,
  };
}
