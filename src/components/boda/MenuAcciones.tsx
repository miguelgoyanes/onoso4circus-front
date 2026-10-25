import { useState } from 'react';

export interface AccionMenu {
  etiqueta: string;
  onClick: () => void;
  peligro?: boolean;
}

// Botón "⋯" con un menú pequeño. Se cierra al elegir una opción o al pulsar fuera.
export function MenuAcciones({ acciones }: { acciones: AccionMenu[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="boda-menu" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="boda-btn boda-btn-icono" aria-label="Más acciones" onClick={() => setAbierto((a) => !a)}>
        ⋯
      </button>
      {abierto && (
        <>
          <div className="boda-menu-fondo" onClick={() => setAbierto(false)} />
          <div className="boda-menu-lista">
            {acciones.map((a) => (
              <button
                key={a.etiqueta}
                type="button"
                className={a.peligro ? 'peligro' : ''}
                onClick={() => {
                  setAbierto(false);
                  a.onClick();
                }}
              >
                {a.etiqueta}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
