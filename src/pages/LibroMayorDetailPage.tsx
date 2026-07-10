import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { obtenerLibroMayor, type LibroMayor } from '../api/contabilidad';
import { PeriodoSelector, periodoEsteMesCompleto, type Periodo } from '../components/PeriodoSelector';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

function formatFecha(iso: string): string {
  return iso.slice(0, 10);
}

export function LibroMayorDetailPage() {
  const { cuentaId } = useParams<{ cuentaId: string }>();
  const { accessToken, logout } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(periodoEsteMesCompleto());
  const [libroMayor, setLibroMayor] = useState<LibroMayor | null>(null);
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
    if (!accessToken || !cuentaId) return;
    obtenerLibroMayor(accessToken, cuentaId, periodo.desde, periodo.hasta).then(setLibroMayor).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, cuentaId, periodo]);

  return (
    <div className="crud-page">
      <div className="crud-container crud-container-wide">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Contabilidad', to: '/contabilidad' },
              { label: 'Libro mayor', to: '/contabilidad/mayor' },
              { label: libroMayor ? `${libroMayor.cuenta.code} — ${libroMayor.cuenta.name}` : '…' },
            ]}
          />
          <h1>{libroMayor ? `${libroMayor.cuenta.code} — ${libroMayor.cuenta.name}` : 'Cuenta'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <PeriodoSelector periodo={periodo} onChange={setPeriodo} completo />

        {libroMayor && (
          <>
            <div className="crud-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="detail-card">
                <div className="detail-hero">
                  <div className="detail-hero-amount">{libroMayor.saldoInicial} €</div>
                  <div className="detail-hero-meta">
                    <span className="badge badge-muted">Saldo inicial</span>
                  </div>
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-hero">
                  <div className="detail-hero-amount">{libroMayor.saldoFinal} €</div>
                  <div className="detail-hero-meta">
                    <span className="badge badge-muted">Saldo final</span>
                  </div>
                </div>
              </div>
            </div>

            {libroMayor.movimientos.length === 0 && <p className="crud-empty">No hay movimientos en este periodo.</p>}

            {libroMayor.movimientos.length > 0 && (
              <div className="crud-table-wrap">
                <table className="crud-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Debe</th>
                      <th>Haber</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {libroMayor.movimientos.map((m, i) => (
                      <tr key={i}>
                        <td>{formatFecha(m.fecha)}</td>
                        <td>{m.descripcion}</td>
                        <td className="crud-table-num">{Number(m.debit) > 0 ? `${m.debit} €` : ''}</td>
                        <td className="crud-table-num">{Number(m.credit) > 0 ? `${m.credit} €` : ''}</td>
                        <td className="crud-table-num">{m.saldo} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
