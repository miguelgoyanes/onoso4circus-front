import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { obtenerBalance, type Balance } from '../api/contabilidad';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BalancePage() {
  const { accessToken, logout } = useAuth();
  const [fecha, setFecha] = useState<string>(hoyISO());
  const [balance, setBalance] = useState<Balance | null>(null);
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
    obtenerBalance(accessToken, fecha).then(setBalance).catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, fecha]);

  const cuadra = balance && Number(balance.totalActivo).toFixed(2) === (Number(balance.totalPasivo) + Number(balance.totalPatrimonioNeto)).toFixed(2);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Contabilidad', to: '/contabilidad' }, { label: 'Balance de situación' }]} />
          <h1>Balance de situación</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <label className="crud-field">
          <span>A fecha de</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>

        {balance && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{balance.totalActivo} €</div>
              <div className="detail-hero-meta">
                <span className="badge badge-muted">Total activo</span>
                <span className={cuadra ? 'badge badge-success' : 'badge badge-danger'}>
                  {cuadra ? 'Cuadra' : 'No cuadra'}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">Activo</p>
              <div className="detail-rows">
                {balance.activo.map((l) => (
                  <div className="detail-row" key={l.cuenta.id}>
                    <span className="detail-label">
                      {l.cuenta.code} — {l.cuenta.name}
                    </span>
                    <span className="detail-value">{l.saldo} €</span>
                  </div>
                ))}
                <div className="detail-row detail-row-total">
                  <span className="detail-label">Total activo</span>
                  <span className="detail-value">{balance.totalActivo} €</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">Pasivo</p>
              <div className="detail-rows">
                {balance.pasivo.length === 0 && <p className="crud-empty">Sin pasivo registrado.</p>}
                {balance.pasivo.map((l) => (
                  <div className="detail-row" key={l.cuenta.id}>
                    <span className="detail-label">
                      {l.cuenta.code} — {l.cuenta.name}
                    </span>
                    <span className="detail-value">{l.saldo} €</span>
                  </div>
                ))}
                <div className="detail-row detail-row-total">
                  <span className="detail-label">Total pasivo</span>
                  <span className="detail-value">{balance.totalPasivo} €</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">Patrimonio neto</p>
              <div className="detail-rows">
                {balance.patrimonioNeto.map((l) => (
                  <div className="detail-row" key={l.cuenta.id}>
                    <span className="detail-label">
                      {l.cuenta.code} — {l.cuenta.name}
                    </span>
                    <span className="detail-value">{l.saldo} €</span>
                  </div>
                ))}
                <div className="detail-row detail-row-total">
                  <span className="detail-label">Total patrimonio neto</span>
                  <span className="detail-value">{balance.totalPatrimonioNeto} €</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
