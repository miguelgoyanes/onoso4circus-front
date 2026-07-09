import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearContratoIngreso,
  listarContratosIngreso,
  type ContratoIngreso,
  type EstadoCobro,
  type TipoFiscal,
} from '../api/ventas';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import { listarFechas, listarPases, listarPlazas, type Fecha, type Pase, type Plaza } from '../api/plazas';
import { calcularBaseDesdeTotal, calcularDesdeBase } from '../utils/iva';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

const ESTADOS_COBRO: EstadoCobro[] = ['COBRADO', 'PENDIENTE_COBRO'];

export function ContratosPage() {
  const { accessToken, logout } = useAuth();
  const [contratos, setContratos] = useState<ContratoIngreso[] | null>(null);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaPublica[]>([]);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<EstadoCobro | ''>('');

  const [showForm, setShowForm] = useState(false);
  const [cliente, setCliente] = useState('');
  const [concepto, setConcepto] = useState('');
  const [fecha, setFecha] = useState('');
  const [estadoCobro, setEstadoCobro] = useState<EstadoCobro>('COBRADO');
  const [cuentaDestinoId, setCuentaDestinoId] = useState('');
  const [vincularPlaza, setVincularPlaza] = useState(false);
  const [plazaId, setPlazaId] = useState('');
  const [fechaId, setFechaId] = useState('');
  const [paseId, setPaseId] = useState('');
  const [fechasDePlaza, setFechasDePlaza] = useState<Fecha[]>([]);
  const [pasesDeFecha, setPasesDeFecha] = useState<Pase[]>([]);

  const [importe, setImporte] = useState('');
  const [tipoFiscal, setTipoFiscal] = useState<TipoFiscal>('B');
  const [ivaBase, setIvaBase] = useState('');
  const [ivaTotal, setIvaTotal] = useState('');
  const [ivaPercent, setIvaPercent] = useState('21');

  const [guardando, setGuardando] = useState(false);

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
    if (!accessToken) return;
    try {
      const [contratosData, cuentasData, plazasData] = await Promise.all([
        listarContratosIngreso(accessToken, { estadoCobro: filtroEstado || undefined }),
        listarCuentas(accessToken),
        listarPlazas(accessToken),
      ]);
      setContratos(contratosData);
      setCuentasDeDinero(cuentasData.filter((c) => c.activa));
      setPlazas(plazasData);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, filtroEstado]);

  useEffect(() => {
    if (cuentaDestinoId || cuentasDeDinero.length === 0) return;
    setCuentaDestinoId(cuentasDeDinero[0].id);
  }, [cuentasDeDinero, cuentaDestinoId]);

  useEffect(() => {
    async function cargarFechas() {
      if (!accessToken || !plazaId) {
        setFechasDePlaza([]);
        return;
      }
      setFechasDePlaza(await listarFechas(accessToken, plazaId));
    }
    cargarFechas().catch(handleApiError);
    setFechaId('');
    setPaseId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, plazaId]);

  useEffect(() => {
    async function cargarPases() {
      if (!accessToken || !fechaId) {
        setPasesDeFecha([]);
        return;
      }
      setPasesDeFecha(await listarPases(accessToken, fechaId));
    }
    cargarPases().catch(handleApiError);
    setPaseId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, fechaId]);

  function abrirCrear() {
    setCliente('');
    setConcepto('');
    setFecha('');
    setEstadoCobro('COBRADO');
    setVincularPlaza(false);
    setPlazaId('');
    setFechaId('');
    setPaseId('');
    setImporte('');
    setTipoFiscal('B');
    setIvaBase('');
    setIvaTotal('');
    setIvaPercent('21');
    setShowForm(true);
  }

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setGuardando(true);
    try {
      await crearContratoIngreso(accessToken, {
        cliente,
        concepto,
        fecha,
        estadoCobro,
        cuentaDestinoId: estadoCobro === 'COBRADO' ? cuentaDestinoId || undefined : undefined,
        plazaId: vincularPlaza ? plazaId || undefined : undefined,
        fechaId: vincularPlaza ? fechaId || undefined : undefined,
        paseId: vincularPlaza ? paseId || undefined : undefined,
        ...(tipoFiscal === 'A'
          ? { tipoFiscal: 'A' as TipoFiscal, baseImponible: Number(ivaBase), ivaPercent: Number(ivaPercent) }
          : { importe: Number(importe), tipoFiscal: 'B' as TipoFiscal }),
      });
      setShowForm(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  const manejadoresIva = {
    onChangeBase: (v: string) => {
      setIvaBase(v);
      setIvaTotal(v && ivaPercent ? String(calcularDesdeBase(Number(v), Number(ivaPercent)).total) : ivaTotal);
    },
    onChangeTotal: (v: string) => {
      setIvaTotal(v);
      setIvaBase(v && ivaPercent ? String(calcularBaseDesdeTotal(Number(v), Number(ivaPercent)).base) : ivaBase);
    },
    onChangePercent: (v: string) => {
      setIvaPercent(v);
      if (ivaBase) {
        setIvaTotal(v ? String(calcularDesdeBase(Number(ivaBase), Number(v)).total) : '');
      } else if (ivaTotal) {
        setIvaBase(v ? String(calcularBaseDesdeTotal(Number(ivaTotal), Number(v)).base) : '');
      }
    },
  };

  const contratosPorFecha: [string, ContratoIngreso[]][] = [];
  for (const contrato of contratos ?? []) {
    const grupo = contratosPorFecha.find(([fecha]) => fecha === contrato.fecha);
    if (grupo) {
      grupo[1].push(contrato);
    } else {
      contratosPorFecha.push([contrato.fecha, [contrato]]);
    }
  }

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Ventas', to: '/ventas' }, { label: 'Contratos' }]} />
          <div className="crud-header-row">
            <h1>Contratos</h1>
            <button type="button" className="crud-btn-primary" onClick={abrirCrear}>
              Registrar contrato
            </button>
          </div>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-form-row">
          <label className="crud-field">
            <span>Filtrar por estado de cobro</span>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoCobro | '')}>
              <option value="">Todos</option>
              {ESTADOS_COBRO.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar contrato">
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Cliente</span>
                <input value={cliente} onChange={(e) => setCliente(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Concepto</span>
                <input value={concepto} onChange={(e) => setConcepto(e.target.value)} required />
              </label>
            </div>

            <div className="crud-form-row">
              <label className="crud-field">
                <span>IVA</span>
                <select value={tipoFiscal} onChange={(e) => setTipoFiscal(e.target.value as TipoFiscal)}>
                  <option value="B">B — sin factura, importe completo</option>
                  <option value="A">A — con factura, reparte IVA repercutido</option>
                </select>
              </label>
            </div>
            {tipoFiscal === 'A' ? (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Base imponible (€)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ivaBase}
                    onChange={(e) => manejadoresIva.onChangeBase(e.target.value)}
                  />
                </label>
                <label className="crud-field">
                  <span>IVA (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ivaPercent}
                    onChange={(e) => manejadoresIva.onChangePercent(e.target.value)}
                  />
                </label>
                <label className="crud-field">
                  <span>Total con IVA (€)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ivaTotal}
                    onChange={(e) => manejadoresIva.onChangeTotal(e.target.value)}
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
                    value={importe}
                    onChange={(e) => setImporte(e.target.value)}
                    required
                  />
                </label>
              </div>
            )}

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha</span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
              </label>
            </div>

            <div className="crud-form-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={vincularPlaza} onChange={(e) => setVincularPlaza(e.target.checked)} />
                <span>Vincular a una plaza (opcional)</span>
              </label>
              {vincularPlaza && (
                <div className="crud-form-row">
                  <label className="crud-field">
                    <span>Plaza</span>
                    <select value={plazaId} onChange={(e) => setPlazaId(e.target.value)}>
                      <option value="">Selecciona una plaza…</option>
                      {plazas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  {plazaId && (
                    <label className="crud-field">
                      <span>Fecha de la plaza (opcional)</span>
                      <select value={fechaId} onChange={(e) => setFechaId(e.target.value)}>
                        <option value="">Toda la plaza</option>
                        {fechasDePlaza.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.fecha}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {fechaId && (
                    <label className="crud-field">
                      <span>Pase (opcional)</span>
                      <select value={paseId} onChange={(e) => setPaseId(e.target.value)}>
                        <option value="">Toda la fecha</option>
                        {pasesDeFecha.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.hora}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Estado de cobro</span>
                <select value={estadoCobro} onChange={(e) => setEstadoCobro(e.target.value as EstadoCobro)}>
                  {ESTADOS_COBRO.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              {estadoCobro === 'COBRADO' && (
                <label className="crud-field">
                  <span>Cuenta destino</span>
                  <select value={cuentaDestinoId} onChange={(e) => setCuentaDestinoId(e.target.value)}>
                    {cuentasDeDinero.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        {contratos === null && <p className="crud-empty">Cargando…</p>}
        {contratos?.length === 0 && <p className="crud-empty">No hay contratos registrados.</p>}

        {contratosPorFecha.map(([fechaGrupo, contratosDeFecha]) => (
          <div key={fechaGrupo} className="crud-date-group">
            <div className="crud-header-row">
              <h2>{fechaGrupo}</h2>
            </div>
            <div className="crud-list">
              {contratosDeFecha.map((contrato) => (
                <div key={contrato.id} className="crud-card">
                  <div className="crud-card-row">
                    <div className="crud-card-info">
                      <Link to={`/ventas/contratos/${contrato.id}`} className="crud-card-title crud-card-title-link">
                        {contrato.cliente}
                      </Link>
                      <div className="crud-card-meta">
                        <span className="badge">{contrato.concepto}</span>
                        <span
                          className={
                            contrato.estadoCobro === 'PENDIENTE_COBRO' ? 'badge badge-danger' : 'badge badge-success'
                          }
                        >
                          {contrato.estadoCobro === 'PENDIENTE_COBRO' ? 'Pendiente de cobro' : 'Cobrado'}
                        </span>
                        {contrato.tipoFiscal && <span className="badge badge-muted">IVA {contrato.tipoFiscal}</span>}
                      </div>
                    </div>
                    <div className="crud-card-actions">
                      <strong>{contrato.importe} €</strong>
                    </div>
                    <span className="crud-card-chevron" aria-hidden="true">
                      ›
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
