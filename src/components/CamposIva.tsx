import { calcularBaseDesdeTotal, calcularDesdeBase } from '../utils/iva';

export interface ManejadoresIva {
  onChangeBase: (v: string) => void;
  onChangeTotal: (v: string) => void;
  onChangePercent: (v: string) => void;
}

export function crearManejadoresIva(
  base: string,
  setBase: (v: string) => void,
  total: string,
  setTotal: (v: string) => void,
  percent: string,
  setPercent: (v: string) => void,
): ManejadoresIva {
  return {
    onChangeBase: (v: string) => {
      setBase(v);
      setTotal(v && percent ? String(calcularDesdeBase(Number(v), Number(percent)).total) : total);
    },
    onChangeTotal: (v: string) => {
      setTotal(v);
      setBase(v && percent ? String(calcularBaseDesdeTotal(Number(v), Number(percent)).base) : base);
    },
    onChangePercent: (v: string) => {
      setPercent(v);
      if (base) {
        setTotal(v ? String(calcularDesdeBase(Number(base), Number(v)).total) : '');
      } else if (total) {
        setBase(v ? String(calcularBaseDesdeTotal(Number(total), Number(v)).base) : '');
      }
    },
  };
}

export function CamposIva({
  base,
  total,
  percent,
  manejadores,
}: {
  base: string;
  total: string;
  percent: string;
  manejadores: ManejadoresIva;
}) {
  return (
    <div className="crud-form-row">
      <label className="crud-field">
        <span>Base imponible (€)</span>
        <input type="number" min="0" step="0.01" value={base} onChange={(e) => manejadores.onChangeBase(e.target.value)} />
      </label>
      <label className="crud-field">
        <span>IVA (%)</span>
        <input type="number" min="0" step="0.01" value={percent} onChange={(e) => manejadores.onChangePercent(e.target.value)} />
      </label>
      <label className="crud-field">
        <span>Total con IVA (€)</span>
        <input type="number" min="0" step="0.01" value={total} onChange={(e) => manejadores.onChangeTotal(e.target.value)} />
      </label>
    </div>
  );
}
