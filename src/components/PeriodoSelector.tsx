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

export function PeriodoSelector({ periodo, onChange }: { periodo: Periodo; onChange: (periodo: Periodo) => void }) {
  const [preset, setPreset] = useState<PeriodoPreset>('mes');

  function seleccionar(p: PeriodoPreset) {
    setPreset(p);
    if (p === 'mes') onChange(periodoEsteMes());
    else if (p === 'anio') onChange(periodoEsteAnio());
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
