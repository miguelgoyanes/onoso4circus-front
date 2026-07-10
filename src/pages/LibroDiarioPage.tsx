import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { listarCuentasContables, obtenerLibroDiario, type AsientoDiario, type CuentaContable } from '../api/contabilidad';
import { PeriodoSelector, periodoEsteMesCompleto, type Periodo } from '../components/PeriodoSelector';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

function formatFecha(iso: string): string {
  return iso.slice(0, 10);
}

export function LibroDiarioPage() {
  const { accessToken, logout } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(periodoEsteMesCompleto());
  const [cuentas, setCuentas] = useState<CuentaContable[] | null>(null);
  const [cuentaIdsSeleccionadas, setCuentaIdsSeleccionadas] = useState<string[]>([]);
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [asientos, setAsientos] = useState<AsientoDiario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleApiError(err: unknown): void {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        logout();
        return;
      }
      setError(err.message);
      return;
    }
    setError('Error inesperado');
  }

  useEffect(() => {
    if (!accessToken) return;
    listarCuentasContables(accessToken).then(setCuentas).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    obtenerLibroDiario(accessToken, periodo.desde, periodo.hasta, cuentaIdsSeleccionadas.length > 0 ? cuentaIdsSeleccionadas : undefined)
      .then(setAsientos)
      .catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, periodo, cuentaIdsSeleccionadas]);

  function toggleCuenta(id: string): void {
    setCuentaIdsSeleccionadas((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  return (
    <div className="crud-page">
      <div className="crud-container crud-container-wide">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Contabilidad', to: '/contabilidad' }, { label: 'Libro diario' }]} />
          <h1>Libro diario</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-form-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <PeriodoSelector periodo={periodo} onChange={setPeriodo} completo />
          <button type="button" className="crud-link-btn" onClick={() => setFiltroAbierto(true)}>
            Filtrar por cuenta{cuentaIdsSeleccionadas.length > 0 ? ` (${cuentaIdsSeleccionadas.length})` : ''}
          </button>
        </div>

        <Modal open={filtroAbierto} onClose={() => setFiltroAbierto(false)} title="Filtrar por cuenta">
          <div className="chip-row">
            {cuentas?.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cuentaIdsSeleccionadas.includes(c.id) ? 'chip chip-active' : 'chip'}
                onClick={() => toggleCuenta(c.id)}
              >
                {c.code} — {c.name}
              </button>
            ))}
          </div>
          {cuentaIdsSeleccionadas.length > 0 && (
            <button type="button" className="chip-clear" onClick={() => setCuentaIdsSeleccionadas([])}>
              Quitar filtro
            </button>
          )}
        </Modal>

        {asientos === null && <p className="crud-empty">Cargando…</p>}
        {asientos?.length === 0 && <p className="crud-empty">No hay asientos en este periodo.</p>}

        {asientos && asientos.length > 0 && (
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Cuenta</th>
                  <th>Debe</th>
                  <th>Haber</th>
                </tr>
              </thead>
              <tbody>
                {asientos.map((asiento) =>
                  asiento.lineas.map((linea, i) => (
                    <tr key={`${asiento.id}-${i}`} className={i === 0 ? 'crud-table-asiento-first' : undefined}>
                      {i === 0 && <td rowSpan={asiento.lineas.length}>{formatFecha(asiento.fecha)}</td>}
                      {i === 0 && <td rowSpan={asiento.lineas.length}>{asiento.descripcion}</td>}
                      <td>
                        {linea.cuenta.code} — {linea.cuenta.name}
                      </td>
                      <td className="crud-table-num">{Number(linea.debit) > 0 ? `${linea.debit} €` : ''}</td>
                      <td className="crud-table-num">{Number(linea.credit) > 0 ? `${linea.credit} €` : ''}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
