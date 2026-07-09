import { calcularBaseDesdeTotal, calcularDesdeBase } from './iva';
import type { AjusteStock, RecepcionStock, TipoFiscal } from '../api/stock';

// Conversión entre el valor de un <input type="datetime-local"> (hora LOCAL, sin
// zona horaria, formato "YYYY-MM-DDTHH:mm") y un ISO string en UTC (lo que manda/entiende
// el backend). Necesario porque el navegador y el backend no hablan el mismo formato.
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function datetimeLocalDesdeIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function datetimeLocalAhora(): string {
  return datetimeLocalDesdeIso(new Date().toISOString());
}

export function isoDesdeDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

// El coste unitario es SIEMPRE la base por unidad (sin IVA) — de ahí se deriva el coste
// total (base × cantidad, + IVA si tipoFiscal=A), y viceversa: desde el coste total se
// vuelve a la base (repartiendo el IVA si aplica) y se divide por cantidad.
export function costeTotalDesdeUnitario(
  costeUnitario: string,
  cantidad: string,
  tipoFiscal: TipoFiscal,
  percent: string,
): string {
  if (!costeUnitario || !cantidad) return '';
  const baseTotal = Number(costeUnitario) * Number(cantidad);
  if (tipoFiscal === 'A') {
    return percent ? String(calcularDesdeBase(baseTotal, Number(percent)).total) : '';
  }
  return String(Math.round(baseTotal * 100) / 100);
}

export function costeUnitarioDesdeTotal(
  costeTotal: string,
  cantidad: string,
  tipoFiscal: TipoFiscal,
  percent: string,
): string {
  if (!costeTotal || !cantidad) return '';
  let baseTotal: number;
  if (tipoFiscal === 'A') {
    if (!percent) return '';
    baseTotal = calcularBaseDesdeTotal(Number(costeTotal), Number(percent)).base;
  } else {
    baseTotal = Number(costeTotal);
  }
  return String(Math.round((baseTotal / Number(cantidad)) * 100) / 100);
}

export interface ManejadoresRecepcion {
  onChangeCantidad: (v: string) => void;
  onChangeCosteUnitario: (v: string) => void;
  onChangeCosteTotal: (v: string) => void;
  onChangeIvaPercent: (v: string) => void;
  onChangeTipoFiscal: (v: TipoFiscal) => void;
}

export function crearManejadoresRecepcion(
  cantidad: string,
  setCantidad: (v: string) => void,
  tipoFiscal: TipoFiscal,
  setTipoFiscal: (v: TipoFiscal) => void,
  ivaPercent: string,
  setIvaPercent: (v: string) => void,
  costeUnitario: string,
  setCosteUnitario: (v: string) => void,
  costeTotal: string,
  setCosteTotal: (v: string) => void,
): ManejadoresRecepcion {
  return {
    onChangeCantidad: (v) => {
      setCantidad(v);
      if (costeUnitario) {
        setCosteTotal(costeTotalDesdeUnitario(costeUnitario, v, tipoFiscal, ivaPercent));
      } else if (costeTotal) {
        setCosteUnitario(costeUnitarioDesdeTotal(costeTotal, v, tipoFiscal, ivaPercent));
      }
    },
    onChangeCosteUnitario: (v) => {
      setCosteUnitario(v);
      setCosteTotal(costeTotalDesdeUnitario(v, cantidad, tipoFiscal, ivaPercent));
    },
    onChangeCosteTotal: (v) => {
      setCosteTotal(v);
      setCosteUnitario(costeUnitarioDesdeTotal(v, cantidad, tipoFiscal, ivaPercent));
    },
    onChangeIvaPercent: (v) => {
      setIvaPercent(v);
      if (costeUnitario) {
        setCosteTotal(costeTotalDesdeUnitario(costeUnitario, cantidad, tipoFiscal, v));
      } else if (costeTotal) {
        setCosteUnitario(costeUnitarioDesdeTotal(costeTotal, cantidad, tipoFiscal, v));
      }
    },
    onChangeTipoFiscal: (v) => {
      setTipoFiscal(v);
      if (costeUnitario) {
        setCosteTotal(costeTotalDesdeUnitario(costeUnitario, cantidad, v, ivaPercent));
      } else if (costeTotal) {
        setCosteUnitario(costeUnitarioDesdeTotal(costeTotal, cantidad, v, ivaPercent));
      }
    },
  };
}

export interface EventoHistorialStock {
  id: string;
  fecha: string;
  esEntrada: boolean;
  tipoLabel: string;
  cantidad: number;
  costeAplicado: number;
  saldoCantidad: number;
  costeMedio: number;
  valorTotal: number;
  origen: RecepcionStock | AjusteStock;
}

// Reconstruye el historial de stock replayando cronológicamente entradas (recepciones) y
// salidas (ajustes) — mismo algoritmo de coste medio ponderado que el backend
// (ProductoService.recalcularDesdeHistorial): solo las entradas mueven la media, las
// salidas solo restan cantidad. Es una réplica puramente para mostrar el detalle
// intermedio en el historial; el backend sigue siendo la fuente de verdad del coste actual.
//
// Se ordena por `fecha` — el único campo de fecha, con hora completa, siempre editable
// por el usuario. Es lo único que decide dónde encaja cada movimiento en el historial.
export function construirHistorialStock(
  recepciones: RecepcionStock[],
  ajustes: AjusteStock[],
): EventoHistorialStock[] {
  interface Base {
    fecha: string;
    esEntrada: boolean;
    cantidad: number;
    costeAplicado: number;
    tipoLabel: string;
    origen: RecepcionStock | AjusteStock;
  }

  const eventos: Base[] = [
    ...recepciones.map((r): Base => ({
      fecha: r.fecha,
      esEntrada: true,
      cantidad: r.cantidad,
      costeAplicado: Number(r.costeUnitario),
      tipoLabel: 'Recepción',
      origen: r,
    })),
    ...ajustes.map((a): Base => ({
      fecha: a.fecha,
      esEntrada: false,
      cantidad: a.cantidad,
      costeAplicado: Number(a.costeUnitarioAplicado),
      tipoLabel: a.tipo,
      origen: a,
    })),
  ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  let saldoCantidad = 0;
  let costeMedio = 0;
  const resultado: EventoHistorialStock[] = [];

  for (const evento of eventos) {
    if (evento.esEntrada) {
      const valorPrevio = costeMedio * saldoCantidad;
      const valorNuevo = evento.costeAplicado * evento.cantidad;
      saldoCantidad += evento.cantidad;
      costeMedio = saldoCantidad > 0 ? Math.round(((valorPrevio + valorNuevo) / saldoCantidad) * 100) / 100 : 0;
    } else {
      saldoCantidad -= evento.cantidad;
    }
    resultado.push({
      id: evento.origen.id,
      fecha: evento.fecha,
      esEntrada: evento.esEntrada,
      tipoLabel: evento.tipoLabel,
      cantidad: evento.cantidad,
      costeAplicado: evento.costeAplicado,
      saldoCantidad,
      costeMedio,
      valorTotal: Math.round(saldoCantidad * costeMedio * 100) / 100,
      origen: evento.origen,
    });
  }

  // Más reciente arriba, igual que el resto de listas de la app.
  return resultado.reverse();
}
