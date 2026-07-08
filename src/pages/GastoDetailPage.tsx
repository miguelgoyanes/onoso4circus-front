import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { eliminarGasto, obtenerGasto, pagarGasto, type Gasto } from '../api/gastos';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import { obtenerPlaza, obtenerFecha, listarPases, type Plaza, type Fecha, type Pase } from '../api/plazas';
import { obtenerEmpleado, type Empleado } from '../api/personal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function GastoDetailPage() {
  const { gastoId } = useParams<{ gastoId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [cuentas, setCuentas] = useState<CuentaPublica[]>([]);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [pase, setPase] = useState<Pase | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pagando, setPagando] = useState(false);
  const [pagarCuentaId, setPagarCuentaId] = useState('');

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

  async function cargar() {
    if (!accessToken || !gastoId) return;
    try {
      const [g, cuentasData] = await Promise.all([obtenerGasto(accessToken, gastoId), listarCuentas(accessToken)]);
      setGasto(g);
      setCuentas(cuentasData);
      setPlaza(g.plazaId ? await obtenerPlaza(accessToken, g.plazaId) : null);
      setFecha(g.fechaId ? await obtenerFecha(accessToken, g.fechaId) : null);
      if (g.fechaId && g.paseId) {
        const pases = await listarPases(accessToken, g.fechaId);
        setPase(pases.find((p) => p.id === g.paseId) ?? null);
      } else {
        setPase(null);
      }
      setEmpleado(g.empleadoId ? await obtenerEmpleado(accessToken, g.empleadoId) : null);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, gastoId]);

  useEffect(() => {
    const cuentasDeDinero = cuentas.filter((c) => c.esCuentaDeDinero);
    if (pagarCuentaId || cuentasDeDinero.length === 0) return;
    const porDefecto = cuentasDeDinero.find((c) => c.code === '570001') ?? cuentasDeDinero[0];
    setPagarCuentaId(porDefecto.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas]);

  async function handlePagar() {
    if (!accessToken || !gastoId || !pagarCuentaId) return;
    setError(null);
    try {
      await pagarGasto(accessToken, gastoId, pagarCuentaId);
      setPagando(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar() {
    if (!accessToken || !gastoId) return;
    setError(null);
    try {
      await eliminarGasto(accessToken, gastoId);
      navigate('/gastos');
    } catch (err) {
      handleApiError(err);
    }
  }

  const cuentaPago = cuentas.find((c) => c.id === gasto?.cuentaPagoId);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Gastos', to: '/gastos' },
              { label: gasto?.descripcion ?? '…' },
            ]}
          />
          <h1>{gasto?.descripcion ?? 'Gasto'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        {gasto && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{gasto.importe} €</div>
              <div className="detail-hero-meta">
                <span className="badge">{gasto.categoriaNombre}</span>
                <span className={gasto.estadoPago === 'PENDIENTE_PAGO' ? 'badge badge-danger' : 'badge badge-success'}>
                  {gasto.estadoPago === 'PENDIENTE_PAGO' ? 'Pendiente de pago' : 'Pagado'}
                </span>
                {gasto.tipoFiscal && <span className="badge badge-muted">IVA {gasto.tipoFiscal}</span>}
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">General</p>
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-label">Fecha</span>
                  <span className="detail-value">{gasto.fecha}</span>
                </div>
              </div>
            </div>

            {gasto.tipoFiscal === 'A' && (
              <div className="detail-section">
                <p className="detail-section-title">Desglose de IVA</p>
                <div className="detail-rows">
                  <div className="detail-row">
                    <span className="detail-label">Base imponible</span>
                    <span className="detail-value">{gasto.baseImponible} €</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">IVA ({gasto.ivaPercent}%)</span>
                    <span className="detail-value">{gasto.importeIva} €</span>
                  </div>
                  <div className="detail-row detail-row-total">
                    <span className="detail-label">Total</span>
                    <span className="detail-value">{gasto.importe} €</span>
                  </div>
                </div>
              </div>
            )}

            <div className="detail-section">
              <p className="detail-section-title">Pago</p>
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-label">Estado</span>
                  <span className="detail-value">
                    {gasto.estadoPago === 'PENDIENTE_PAGO' ? 'Pendiente de pago' : 'Pagado'}
                  </span>
                </div>
                {cuentaPago && (
                  <div className="detail-row">
                    <span className="detail-label">Cuenta</span>
                    <span className="detail-value">
                      {cuentaPago.nombre} ({cuentaPago.code})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {plaza && (
              <div className="detail-section">
                <p className="detail-section-title">Vinculado a</p>
                <div className="detail-rows">
                  <div className="detail-row">
                    <span className="detail-label">Plaza</span>
                    <span className="detail-value">{plaza.nombre}</span>
                  </div>
                  {fecha && (
                    <div className="detail-row">
                      <span className="detail-label">Fecha del evento</span>
                      <span className="detail-value">{fecha.fecha}</span>
                    </div>
                  )}
                  {pase && (
                    <div className="detail-row">
                      <span className="detail-label">Pase</span>
                      <span className="detail-value">{pase.hora}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {empleado && (
              <div className="detail-section">
                <p className="detail-section-title">Personal</p>
                <div className="detail-rows">
                  <div className="detail-row">
                    <span className="detail-label">Empleado</span>
                    <span className="detail-value">
                      {empleado.nombre} ({empleado.regimen})
                    </span>
                  </div>
                  {gasto.conceptos.map((c, i) => (
                    <div className="detail-row" key={i}>
                      <span className="detail-label">{c.concepto}</span>
                      <span className="detail-value">{c.importe} €</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-footer">
              {gasto.estadoPago === 'PENDIENTE_PAGO' &&
                (pagando ? (
                  <>
                    <select value={pagarCuentaId} onChange={(e) => setPagarCuentaId(e.target.value)}>
                      <option value="">Cuenta de pago…</option>
                      {cuentas
                        .filter((c) => c.esCuentaDeDinero)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} ({c.code})
                          </option>
                        ))}
                    </select>
                    <button type="button" className="crud-btn-primary" onClick={handlePagar}>
                      Confirmar
                    </button>
                    <button type="button" className="crud-form-cancel" onClick={() => setPagando(false)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button type="button" className="crud-link-btn" onClick={() => setPagando(true)}>
                    Pagar
                  </button>
                ))}
              <button type="button" className="crud-delete-btn" onClick={handleEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
