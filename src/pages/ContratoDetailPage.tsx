import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  actualizarContratoIngreso,
  cobrarContratoIngreso,
  eliminarContratoIngreso,
  obtenerContratoIngreso,
  type ContratoIngreso,
  type TipoFiscal,
} from '../api/ventas';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import { obtenerPlaza, obtenerFecha, listarPases, type Plaza, type Fecha, type Pase } from '../api/plazas';
import { calcularBaseDesdeTotal, calcularDesdeBase } from '../utils/iva';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

export function ContratoDetailPage() {
  const { contratoId } = useParams<{ contratoId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();
  const [contrato, setContrato] = useState<ContratoIngreso | null>(null);
  const [cuentas, setCuentas] = useState<CuentaPublica[]>([]);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [pase, setPase] = useState<Pase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [cobrando, setCobrando] = useState(false);
  const [cobrarCuentaId, setCobrarCuentaId] = useState('');

  const [editando, setEditando] = useState(false);
  const [eCliente, setECliente] = useState('');
  const [eConcepto, setEConcepto] = useState('');
  const [eFecha, setEFecha] = useState('');
  const [eTipoFiscal, setETipoFiscal] = useState<TipoFiscal>('B');
  const [eImporte, setEImporte] = useState('');
  const [eIvaBase, setEIvaBase] = useState('');
  const [eIvaTotal, setEIvaTotal] = useState('');
  const [eIvaPercent, setEIvaPercent] = useState('21');

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
    if (!accessToken || !contratoId) return;
    try {
      const [c, cuentasData] = await Promise.all([
        obtenerContratoIngreso(accessToken, contratoId),
        listarCuentas(accessToken),
      ]);
      setContrato(c);
      setCuentas(cuentasData);
      setPlaza(c.plazaId ? await obtenerPlaza(accessToken, c.plazaId) : null);
      setFecha(c.fechaId ? await obtenerFecha(accessToken, c.fechaId) : null);
      if (c.fechaId && c.paseId) {
        const pases = await listarPases(accessToken, c.fechaId);
        setPase(pases.find((p) => p.id === c.paseId) ?? null);
      } else {
        setPase(null);
      }
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, contratoId]);

  useEffect(() => {
    const cuentasDeDinero = cuentas.filter((c) => c.activa);
    if (cobrarCuentaId || cuentasDeDinero.length === 0) return;
    setCobrarCuentaId(cuentasDeDinero[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas]);

  async function handleCobrar() {
    if (!accessToken || !contratoId || !cobrarCuentaId) return;
    setError(null);
    try {
      await cobrarContratoIngreso(accessToken, contratoId, cobrarCuentaId);
      setCobrando(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  function abrirEditar() {
    if (!contrato) return;
    setECliente(contrato.cliente);
    setEConcepto(contrato.concepto);
    setEFecha(contrato.fecha);
    setETipoFiscal(contrato.tipoFiscal ?? 'B');
    setEImporte(contrato.tipoFiscal === 'A' ? '' : contrato.importe);
    setEIvaBase(contrato.baseImponible ?? '');
    setEIvaTotal(contrato.tipoFiscal === 'A' ? contrato.importe : '');
    setEIvaPercent(contrato.ivaPercent ?? '21');
    setEditando(true);
  }

  async function handleActualizar(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !contratoId) return;
    setError(null);
    try {
      await actualizarContratoIngreso(accessToken, contratoId, {
        cliente: eCliente,
        concepto: eConcepto,
        fecha: eFecha,
        ...(eTipoFiscal === 'A'
          ? { tipoFiscal: 'A' as TipoFiscal, baseImponible: Number(eIvaBase), ivaPercent: Number(eIvaPercent) }
          : { importe: Number(eImporte), tipoFiscal: 'B' as TipoFiscal }),
      });
      setEditando(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar() {
    if (!accessToken || !contratoId) return;
    setError(null);
    try {
      await eliminarContratoIngreso(accessToken, contratoId);
      navigate('/ventas/contratos');
    } catch (err) {
      handleApiError(err);
    }
  }

  const manejadoresEditarIva = {
    onChangeBase: (v: string) => {
      setEIvaBase(v);
      setEIvaTotal(v && eIvaPercent ? String(calcularDesdeBase(Number(v), Number(eIvaPercent)).total) : eIvaTotal);
    },
    onChangeTotal: (v: string) => {
      setEIvaTotal(v);
      setEIvaBase(v && eIvaPercent ? String(calcularBaseDesdeTotal(Number(v), Number(eIvaPercent)).base) : eIvaBase);
    },
    onChangePercent: (v: string) => {
      setEIvaPercent(v);
      if (eIvaBase) {
        setEIvaTotal(v ? String(calcularDesdeBase(Number(eIvaBase), Number(v)).total) : '');
      } else if (eIvaTotal) {
        setEIvaBase(v ? String(calcularBaseDesdeTotal(Number(eIvaTotal), Number(v)).base) : '');
      }
    },
  };

  const cuentaDestino = cuentas.find((c) => c.id === contrato?.cuentaDestinoId);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Ventas', to: '/ventas' },
              { label: 'Contratos', to: '/ventas/contratos' },
              { label: contrato?.cliente ?? '…' },
            ]}
          />
          <h1>{contrato?.cliente ?? 'Contrato'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        {contrato && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{contrato.importe} €</div>
              <div className="detail-hero-meta">
                <span className="badge">{contrato.concepto}</span>
                <span
                  className={contrato.estadoCobro === 'PENDIENTE_COBRO' ? 'badge badge-danger' : 'badge badge-success'}
                >
                  {contrato.estadoCobro === 'PENDIENTE_COBRO' ? 'Pendiente de cobro' : 'Cobrado'}
                </span>
                {contrato.tipoFiscal && <span className="badge badge-muted">IVA {contrato.tipoFiscal}</span>}
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">General</p>
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-label">Fecha</span>
                  <span className="detail-value">{contrato.fecha}</span>
                </div>
              </div>
            </div>

            {contrato.tipoFiscal === 'A' && (
              <div className="detail-section">
                <p className="detail-section-title">Desglose de IVA</p>
                <div className="detail-rows">
                  <div className="detail-row">
                    <span className="detail-label">Base imponible</span>
                    <span className="detail-value">{contrato.baseImponible} €</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">IVA ({contrato.ivaPercent}%)</span>
                    <span className="detail-value">{contrato.importeIva} €</span>
                  </div>
                  <div className="detail-row detail-row-total">
                    <span className="detail-label">Total</span>
                    <span className="detail-value">{contrato.importe} €</span>
                  </div>
                </div>
              </div>
            )}

            <div className="detail-section">
              <p className="detail-section-title">Cobro</p>
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-label">Estado</span>
                  <span className="detail-value">
                    {contrato.estadoCobro === 'PENDIENTE_COBRO' ? 'Pendiente de cobro' : 'Cobrado'}
                  </span>
                </div>
                {cuentaDestino && (
                  <div className="detail-row">
                    <span className="detail-label">Cuenta</span>
                    <span className="detail-value">{cuentaDestino.nombre}</span>
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

            <div className="detail-footer">
              {contrato.estadoCobro === 'PENDIENTE_COBRO' &&
                (cobrando ? (
                  <>
                    <select value={cobrarCuentaId} onChange={(e) => setCobrarCuentaId(e.target.value)}>
                      <option value="">Cuenta destino…</option>
                      {cuentas
                        .filter((c) => c.activa)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                    </select>
                    <button type="button" className="crud-btn-primary" onClick={handleCobrar}>
                      Confirmar
                    </button>
                    <button type="button" className="crud-form-cancel" onClick={() => setCobrando(false)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button type="button" className="crud-link-btn" onClick={() => setCobrando(true)}>
                    Cobrar
                  </button>
                ))}
              <button type="button" className="crud-link-btn" onClick={abrirEditar}>
                Editar
              </button>
              <button type="button" className="crud-delete-btn" onClick={handleEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        )}

        <Modal open={editando} onClose={() => setEditando(false)} title="Editar contrato">
          <form className="crud-form" onSubmit={handleActualizar}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Cliente</span>
                <input value={eCliente} onChange={(e) => setECliente(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Concepto</span>
                <input value={eConcepto} onChange={(e) => setEConcepto(e.target.value)} required />
              </label>
            </div>

            <div className="crud-form-row">
              <label className="crud-field">
                <span>IVA</span>
                <select value={eTipoFiscal} onChange={(e) => setETipoFiscal(e.target.value as TipoFiscal)}>
                  <option value="B">B — sin factura, importe completo</option>
                  <option value="A">A — con factura, reparte IVA repercutido</option>
                </select>
              </label>
            </div>
            {eTipoFiscal === 'A' ? (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Base imponible (€)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={eIvaBase}
                    onChange={(e) => manejadoresEditarIva.onChangeBase(e.target.value)}
                  />
                </label>
                <label className="crud-field">
                  <span>IVA (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={eIvaPercent}
                    onChange={(e) => manejadoresEditarIva.onChangePercent(e.target.value)}
                  />
                </label>
                <label className="crud-field">
                  <span>Total con IVA (€)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={eIvaTotal}
                    onChange={(e) => manejadoresEditarIva.onChangeTotal(e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Importe (€)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={eImporte}
                    onChange={(e) => setEImporte(e.target.value)}
                    required
                  />
                </label>
              </div>
            )}

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha</span>
                <input type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} required />
              </label>
            </div>

            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setEditando(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
