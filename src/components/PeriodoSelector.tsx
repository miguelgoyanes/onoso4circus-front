import { useState } from 'react';

export interface Periodo {
  desde: string;
  hasta: string;
}

type PeriodoPreset = 'mes' | 'anio' | 'personalizado';

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function periodoEsteMes(): Periodo {
  const hoy = new Date();
  return { desde: toISO(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1))), hasta: toISO(hoy) };
}

export function periodoEsteAnio(): Periodo {
  const hoy = new Date();
  return { desde: toISO(new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1))), hasta: toISO(hoy) };
}

// Variante "mes/año completo" (no capada en hoy) — para vistas tipo libro contable (Libro
// diario/mayor, PyG) que deben incluir también asientos con fecha futura dentro del mismo
// mes/año (p. ej. una venta de un pase de una fecha próxima ya vendida hoy). Análisis usa
// las variantes de arriba a propósito porque ahí "Este mes" significa "lo llevado hasta hoy".
export function periodoEsteMesCompleto(): Periodo {
  const hoy = new Date();
  const ultimoDia = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 0));
  return { desde: toISO(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1))), hasta: toISO(ultimoDia) };
}

export function periodoEsteAnioCompleto(): Periodo {
  const hoy = new Date();
  return { desde: toISO(new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1))), hasta: toISO(new Date(Date.UTC(hoy.getUTCFullYear(), 11, 31))) };
}

export function PeriodoSelector({
  periodo,
  onChange,
  completo = false,
}: {
  periodo: Periodo;
  onChange: (periodo: Periodo) => void;
  // Ver periodoEsteMesCompleto/periodoEsteAnioCompleto — solo lo pasan las páginas de Contabilidad.
  completo?: boolean;
}) {
  const [preset, setPreset] = useState<PeriodoPreset>('mes');

  function seleccionar(p: PeriodoPreset) {
    setPreset(p);
    if (p === 'mes') onChange(completo ? periodoEsteMesCompleto() : periodoEsteMes());
    else if (p === 'anio') onChange(completo ? periodoEsteAnioCompleto() : periodoEsteAnio());
  }

  return (
    <div className="crud-form-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="crud-toolbar" style={{ margin: 0 }}>
        <button type="button" className={preset === 'mes' ? 'crud-btn-primary' : 'crud-link-btn'} onClick={() => seleccionar('mes')}>
          Este mes
        </button>
        <button type="button" className={preset === 'anio' ? 'crud-btn-primary' : 'crud-link-btn'} onClick={() => seleccionar('anio')}>
          Este año
        </button>
        <button
          type="button"
          className={preset === 'personalizado' ? 'crud-btn-primary' : 'crud-link-btn'}
          onClick={() => setPreset('personalizado')}
        >
          Personalizado
        </button>
      </div>
      {preset === 'personalizado' && (
        <>
          <label className="crud-field">
            <span>Desde</span>
            <input type="date" value={periodo.desde} onChange={(e) => onChange({ ...periodo, desde: e.target.value })} />
          </label>
          <label className="crud-field">
            <span>Hasta</span>
            <input type="date" value={periodo.hasta} onChange={(e) => onChange({ ...periodo, hasta: e.target.value })} />
          </label>
        </>
      )}
    </div>
  );
}
