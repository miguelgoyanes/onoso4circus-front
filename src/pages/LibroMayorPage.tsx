import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { listarCuentasContables, type CuentaContable } from '../api/contabilidad';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

const GRUPOS: { tipo: CuentaContable['type']; titulo: string }[] = [
  { tipo: 'ASSET', titulo: 'Activo' },
  { tipo: 'LIABILITY', titulo: 'Pasivo' },
  { tipo: 'EQUITY', titulo: 'Patrimonio neto' },
  { tipo: 'INCOME', titulo: 'Ingresos' },
  { tipo: 'EXPENSE', titulo: 'Gastos' },
];

export function LibroMayorPage() {
  const { accessToken, logout } = useAuth();
  const [cuentas, setCuentas] = useState<CuentaContable[] | null>(null);
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

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Contabilidad', to: '/contabilidad' }, { label: 'Libro mayor' }]} />
          <h1>Libro mayor</h1>
          <p>Elige una cuenta para ver su histórico y saldo acumulado.</p>
        </div>

        {error && <p className="crud-error">{error}</p>}
        {cuentas === null && <p className="crud-empty">Cargando…</p>}

        {cuentas &&
          GRUPOS.map(({ tipo, titulo }) => {
            const cuentasDelGrupo = cuentas.filter((c) => c.type === tipo);
            if (cuentasDelGrupo.length === 0) return null;
            return (
              <div key={tipo}>
                <div className="crud-header-row">
                  <h2>{titulo}</h2>
                </div>
                <div className="crud-list">
                  {cuentasDelGrupo.map((c) => (
                    <Link key={c.id} to={`/contabilidad/mayor/${c.id}`} className="crud-card crud-card-title-link" style={{ display: 'block' }}>
                      <div className="crud-card-row">
                        <div className="crud-card-info">
                          <div className="crud-card-title">
                            {c.code} — {c.name}
                          </div>
                        </div>
                        <span className="crud-card-chevron" aria-hidden="true">
                          ›
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
