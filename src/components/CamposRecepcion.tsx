import type { TipoFiscal } from '../api/stock';
import type { ManejadoresRecepcion } from '../utils/stock';

export function CamposRecepcion({
  cantidad,
  tipoFiscal,
  ivaPercent,
  costeUnitario,
  costeTotal,
  manejadores,
  mostrarCantidad = true,
}: {
  cantidad: string;
  tipoFiscal: TipoFiscal;
  ivaPercent: string;
  costeUnitario: string;
  costeTotal: string;
  manejadores: ManejadoresRecepcion;
  // false para INSUMO — cada lote es siempre 1 unidad (el saco/garrafa entero), no hay
  // "cantidad" que preguntar; costeUnitario/costeTotal representan el coste del lote entero.
  mostrarCantidad?: boolean;
}) {
  return (
    <>
      <div className="crud-form-row">
        {mostrarCantidad && (
          <label className="crud-field">
            <span>Cantidad</span>
            <input
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={(e) => manejadores.onChangeCantidad(e.target.value)}
              required
            />
          </label>
        )}
        <label className="crud-field">
          <span>¿Lleva IVA?</span>
          <select value={tipoFiscal} onChange={(e) => manejadores.onChangeTipoFiscal(e.target.value as TipoFiscal)}>
            <option value="B">B — sin factura, coste tal cual</option>
            <option value="A">A — con factura, reparte IVA soportado</option>
          </select>
        </label>
      </div>
      {tipoFiscal === 'A' && (
        <div className="crud-form-row">
          <label className="crud-field">
            <span>IVA (%)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ivaPercent}
              onChange={(e) => manejadores.onChangeIvaPercent(e.target.value)}
              required
            />
          </label>
        </div>
      )}
      <div className="crud-form-row">
        <label className="crud-field">
          <span>Coste unitario{tipoFiscal === 'A' ? ', sin IVA' : ''} (€)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={costeUnitario}
            onChange={(e) => manejadores.onChangeCosteUnitario(e.target.value)}
            required
          />
        </label>
        <label className="crud-field">
          <span>Coste total{tipoFiscal === 'A' ? ', con IVA' : ''} (€)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={costeTotal}
            onChange={(e) => manejadores.onChangeCosteTotal(e.target.value)}
            required
          />
        </label>
      </div>
    </>
  );
}
