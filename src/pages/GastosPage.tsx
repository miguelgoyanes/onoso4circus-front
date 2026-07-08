import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearGasto,
  listarCategoriasGasto,
  listarGastos,
  pagarGasto,
  type CategoriaGasto,
  type ConceptoPersonal,
  type ConceptoPersonalInput,
  type EstadoPagoGasto,
  type Gasto,
  type TipoFiscal,
} from '../api/gastos';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import { listarFechas, listarPases, listarPlazas, type Fecha, type Pase, type Plaza } from '../api/plazas';
import { listarEmpleados, type Empleado } from '../api/personal';
import { calcularBaseDesdeTotal, calcularDesdeBase } from '../utils/iva';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

const ESTADOS_PAGO: EstadoPagoGasto[] = ['PAGADO', 'PENDIENTE_PAGO'];
const CONCEPTOS_DERIVADOS: ConceptoPersonal[] = ['DIETA', 'SEGURO', 'OTRO'];

interface DerivadoForm {
  concepto: ConceptoPersonal;
  importe: string;
}

interface ManejadoresIva {
  onChangeBase: (v: string) => void;
  onChangeTotal: (v: string) => void;
  onChangePercent: (v: string) => void;
}

function crearManejadoresIva(
  base: string,
  setBase: (v: string) => void,
  total: string,
  setTotal: (v: string) => void,
  percent: string,
  setPercent: (v: string) => void,
): ManejadoresIva {
  return {
    onChangeBase: (v: string) => {
      setBase(v);
      setTotal(v && percent ? String(calcularDesdeBase(Number(v), Number(percent)).total) : total);
    },
    onChangeTotal: (v: string) => {
      setTotal(v);
      setBase(v && percent ? String(calcularBaseDesdeTotal(Number(v), Number(percent)).base) : base);
    },
    onChangePercent: (v: string) => {
      setPercent(v);
      if (base) {
        setTotal(v ? String(calcularDesdeBase(Number(base), Number(v)).total) : '');
      } else if (total) {
        setBase(v ? String(calcularBaseDesdeTotal(Number(total), Number(v)).base) : '');
      }
    },
  };
}

function CamposIva({
  base,
  total,
  percent,
  manejadores,
}: {
  base: string;
  total: string;
  percent: string;
  manejadores: ManejadoresIva;
}) {
  return (
    <div className="crud-form-row">
      <label className="crud-field">
        <span>Base imponible (€)</span>
        <input type="number" min="0" step="0.01" value={base} onChange={(e) => manejadores.onChangeBase(e.target.value)} />
      </label>
      <label className="crud-field">
        <span>IVA (%)</span>
        <input type="number" min="0" step="0.01" value={percent} onChange={(e) => manejadores.onChangePercent(e.target.value)} />
      </label>
      <label className="crud-field">
        <span>Total con IVA (€)</span>
        <input type="number" min="0" step="0.01" value={total} onChange={(e) => manejadores.onChangeTotal(e.target.value)} />
      </label>
    </div>
  );
}

export function GastosPage() {
  const { accessToken, logout } = useAuth();
  const [gastos, setGastos] = useState<Gasto[] | null>(null);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaPublica[]>([]);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPagoGasto | ''>('');

  const [showForm, setShowForm] = useState(false);
  const [categoriaId, setCategoriaId] = useState('');
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estadoPago, setEstadoPago] = useState<EstadoPagoGasto>('PAGADO');
  const [cuentaPagoId, setCuentaPagoId] = useState('');
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

  const [empleadoId, setEmpleadoId] = useState('');
  const [salarioImporte, setSalarioImporte] = useState('');
  const [salarioTipoFiscal, setSalarioTipoFiscal] = useState<TipoFiscal>('B');
  const [salarioBase, setSalarioBase] = useState('');
  const [salarioTotal, setSalarioTotal] = useState('');
  const [salarioPercent, setSalarioPercent] = useState('21');
  const [seguridadSocial, setSeguridadSocial] = useState('');
  const [derivados, setDerivados] = useState<DerivadoForm[]>([]);

  const [guardando, setGuardando] = useState(false);

  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [pagarCuentaId, setPagarCuentaId] = useState('');

  const categoria = categorias.find((c) => c.id === categoriaId);
  const empleado = empleados.find((e) => e.id === empleadoId);

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
      const [gastosData, categoriasData, cuentasData, plazasData, empleadosData] = await Promise.all([
        listarGastos(accessToken, {
          categoriaId: filtroCategoriaId || undefined,
          estadoPago: filtroEstado || undefined,
        }),
        listarCategoriasGasto(accessToken),
        listarCuentas(accessToken),
        listarPlazas(accessToken),
        listarEmpleados(accessToken),
      ]);
      setGastos(gastosData);
      setCategorias(categoriasData);
      setCuentasDeDinero(cuentasData.filter((c) => c.esCuentaDeDinero));
      setPlazas(plazasData);
      setEmpleados(empleadosData);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, filtroCategoriaId, filtroEstado]);

  useEffect(() => {
    if (cuentaPagoId || cuentasDeDinero.length === 0) return;
    const porDefecto = cuentasDeDinero.find((c) => c.code === '570001') ?? cuentasDeDinero[0];
    setCuentaPagoId(porDefecto.id);
  }, [cuentasDeDinero, cuentaPagoId]);

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

  useEffect(() => {
    if (empleado?.importeReferenciaDia) {
      setSalarioImporte(empleado.importeReferenciaDia);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId]);

  function limpiarFormulario() {
    setCategoriaId('');
    setFecha('');
    setDescripcion('');
    setEstadoPago('PAGADO');
    setVincularPlaza(false);
    setPlazaId('');
    setFechaId('');
    setPaseId('');
    setImporte('');
    setTipoFiscal('B');
    setIvaBase('');
    setIvaTotal('');
    setEmpleadoId('');
    setSalarioImporte('');
    setSalarioTipoFiscal('B');
    setSalarioBase('');
    setSalarioTotal('');
    setSeguridadSocial('');
    setDerivados([]);
  }

  function agregarDerivado() {
    setDerivados((prev) => [...prev, { concepto: 'DIETA', importe: '' }]);
  }

  function actualizarDerivado(index: number, cambios: Partial<DerivadoForm>) {
    setDerivados((prev) => prev.map((d, i) => (i === index ? { ...d, ...cambios } : d)));
  }

  function eliminarDerivado(index: number) {
    setDerivados((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !categoria) return;
    setError(null);
    setGuardando(true);
    try {
      const conceptos: ConceptoPersonalInput[] | undefined = categoria.esPagoPersonal
        ? [
            empleado?.regimen === 'AUTONOMO' && salarioTipoFiscal === 'A'
              ? {
                  concepto: 'SALARIO',
                  tipoFiscal: 'A',
                  baseImponible: Number(salarioBase),
                  ivaPercent: Number(salarioPercent),
                }
              : { concepto: 'SALARIO', importe: Number(salarioImporte) },
            ...(empleado?.regimen === 'CUENTA_AJENA' && seguridadSocial
              ? [{ concepto: 'SEGURIDAD_SOCIAL' as ConceptoPersonal, importe: Number(seguridadSocial) }]
              : []),
            ...derivados
              .filter((d) => d.importe !== '')
              .map((d) => ({ concepto: d.concepto, importe: Number(d.importe) })),
          ]
        : undefined;

      await crearGasto(accessToken, {
        categoriaId,
        fecha,
        descripcion,
        estadoPago,
        cuentaPagoId: estadoPago === 'PAGADO' ? cuentaPagoId || undefined : undefined,
        plazaId: vincularPlaza ? plazaId || undefined : undefined,
        fechaId: vincularPlaza ? fechaId || undefined : undefined,
        paseId: vincularPlaza ? paseId || undefined : undefined,
        empleadoId: categoria.esPagoPersonal ? empleadoId : undefined,
        ...(!categoria.esPagoPersonal
          ? categoria.aplicaIva && tipoFiscal === 'A'
            ? { tipoFiscal: 'A' as TipoFiscal, baseImponible: Number(ivaBase), ivaPercent: Number(ivaPercent) }
            : { importe: Number(importe), tipoFiscal: categoria.aplicaIva ? tipoFiscal : undefined }
          : {}),
        conceptos,
      });
      limpiarFormulario();
      setShowForm(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function handlePagar(id: string) {
    if (!accessToken || !pagarCuentaId) return;
    setError(null);
    try {
      await pagarGasto(accessToken, id, pagarCuentaId);
      setPagandoId(null);
      setPagarCuentaId('');
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  const manejadoresIva = crearManejadoresIva(ivaBase, setIvaBase, ivaTotal, setIvaTotal, ivaPercent, setIvaPercent);
  const manejadoresSalarioIva = crearManejadoresIva(
    salarioBase,
    setSalarioBase,
    salarioTotal,
    setSalarioTotal,
    salarioPercent,
    setSalarioPercent,
  );

  const gastosPorFecha: [string, Gasto[]][] = [];
  for (const gasto of gastos ?? []) {
    const grupo = gastosPorFecha.find(([fecha]) => fecha === gasto.fecha);
    if (grupo) {
      grupo[1].push(gasto);
    } else {
      gastosPorFecha.push([gasto.fecha, [gasto]]);
    }
  }

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Gastos' }]} />
          <div className="crud-header-row">
            <h1>Gastos</h1>
            <div className="crud-card-actions">
              <Link to="/gastos/categorias" className="crud-link-btn">
                ⚙ Categorías
              </Link>
              <button type="button" className="crud-btn-primary" onClick={() => setShowForm((v) => !v)}>
                {showForm ? 'Cancelar' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-form-row">
          <label className="crud-field">
            <span>Filtrar por categoría</span>
            <select value={filtroCategoriaId} onChange={(e) => setFiltroCategoriaId(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="crud-field">
            <span>Filtrar por estado de pago</span>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoPagoGasto | '')}>
              <option value="">Todos</option>
              {ESTADOS_PAGO.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showForm && (
          <form className="crud-form" onSubmit={handleCrear}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Categoría</span>
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
                  <option value="">Selecciona una categoría…</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>Descripción</span>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
              </label>
            </div>

            {categoria?.esPagoPersonal && (
              <>
                <div className="crud-form-row">
                  <label className="crud-field">
                    <span>Empleado</span>
                    <select value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} required>
                      <option value="">Selecciona un empleado…</option>
                      {empleados.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre} ({e.regimen})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {empleado && (
                  <>
                    {empleado.regimen === 'AUTONOMO' ? (
                      <>
                        <div className="crud-form-row">
                          <label className="crud-field">
                            <span>IVA en el salario</span>
                            <select
                              value={salarioTipoFiscal}
                              onChange={(e) => setSalarioTipoFiscal(e.target.value as TipoFiscal)}
                            >
                              <option value="B">B — sin factura, importe completo</option>
                              <option value="A">A — con factura, reparte IVA soportado</option>
                            </select>
                          </label>
                        </div>
                        {salarioTipoFiscal === 'A' ? (
                          <CamposIva base={salarioBase} total={salarioTotal} percent={salarioPercent} manejadores={manejadoresSalarioIva} />
                        ) : (
                          <div className="crud-form-row">
                            <label className="crud-field">
                              <span>Importe del salario (€)</span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={salarioImporte}
                                onChange={(e) => setSalarioImporte(e.target.value)}
                                required
                              />
                            </label>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="crud-form-row">
                        <label className="crud-field">
                          <span>Importe del salario (€)</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={salarioImporte}
                            onChange={(e) => setSalarioImporte(e.target.value)}
                            required
                          />
                        </label>
                        <label className="crud-field">
                          <span>Seguridad Social (€, opcional)</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={seguridadSocial}
                            onChange={(e) => setSeguridadSocial(e.target.value)}
                          />
                        </label>
                      </div>
                    )}
                  </>
                )}

                <div className="crud-form-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                  <span>Otros conceptos (dietas, seguros...)</span>
                  {derivados.map((d, i) => (
                    <div key={i} className="crud-form-row">
                      <select
                        value={d.concepto}
                        onChange={(e) => actualizarDerivado(i, { concepto: e.target.value as ConceptoPersonal })}
                      >
                        {CONCEPTOS_DERIVADOS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Importe (€)"
                        value={d.importe}
                        onChange={(e) => actualizarDerivado(i, { importe: e.target.value })}
                      />
                      <button type="button" className="crud-delete-btn" onClick={() => eliminarDerivado(i)}>
                        Quitar
                      </button>
                    </div>
                  ))}
                  <button type="button" className="crud-link-btn" onClick={agregarDerivado}>
                    + Añadir concepto
                  </button>
                </div>
              </>
            )}

            {categoria && !categoria.esPagoPersonal && (
              <>
                {categoria.aplicaIva && (
                  <div className="crud-form-row">
                    <label className="crud-field">
                      <span>IVA</span>
                      <select value={tipoFiscal} onChange={(e) => setTipoFiscal(e.target.value as TipoFiscal)}>
                        <option value="B">B — sin factura, importe completo</option>
                        <option value="A">A — con factura, reparte IVA soportado</option>
                      </select>
                    </label>
                  </div>
                )}
                {categoria.aplicaIva && tipoFiscal === 'A' ? (
                  <CamposIva base={ivaBase} total={ivaTotal} percent={ivaPercent} manejadores={manejadoresIva} />
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
              </>
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
                <span>Estado de pago</span>
                <select value={estadoPago} onChange={(e) => setEstadoPago(e.target.value as EstadoPagoGasto)}>
                  {ESTADOS_PAGO.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              {estadoPago === 'PAGADO' && (
                <label className="crud-field">
                  <span>Cuenta de pago</span>
                  <select value={cuentaPagoId} onChange={(e) => setCuentaPagoId(e.target.value)}>
                    {cuentasDeDinero.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="crud-form-actions">
              <button type="submit" className="crud-btn-primary" disabled={guardando || !categoria}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        {gastos === null && <p className="crud-empty">Cargando…</p>}
        {gastos?.length === 0 && <p className="crud-empty">No hay gastos registrados.</p>}

        {gastosPorFecha.map(([fechaGrupo, gastosDeFecha]) => (
          <div key={fechaGrupo} className="crud-date-group">
            <div className="crud-header-row">
              <h2>{fechaGrupo}</h2>
            </div>
            <div className="crud-list">
              {gastosDeFecha.map((gasto) => (
                <div key={gasto.id} className="crud-card">
                  <div className="crud-card-row">
                    <div className="crud-card-info">
                      <Link to={`/gastos/${gasto.id}`} className="crud-card-title crud-card-title-link">
                        {gasto.descripcion}
                      </Link>
                      <div className="crud-card-meta">
                        <span className="badge">{gasto.categoriaNombre}</span>
                        <span className={gasto.estadoPago === 'PENDIENTE_PAGO' ? 'badge badge-danger' : 'badge badge-success'}>
                          {gasto.estadoPago === 'PENDIENTE_PAGO' ? 'Pendiente de pago' : 'Pagado'}
                        </span>
                        {gasto.tipoFiscal && <span className="badge badge-muted">IVA {gasto.tipoFiscal}</span>}
                      </div>
                    </div>
                    <div className="crud-card-actions">
                      <strong>{gasto.importe} €</strong>
                      {gasto.estadoPago === 'PENDIENTE_PAGO' &&
                        (pagandoId === gasto.id ? (
                          <>
                            <select value={pagarCuentaId} onChange={(e) => setPagarCuentaId(e.target.value)}>
                              <option value="">Cuenta de pago…</option>
                              {cuentasDeDinero.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre} ({c.code})
                                </option>
                              ))}
                            </select>
                            <button type="button" className="crud-btn-primary" onClick={() => handlePagar(gasto.id)}>
                              Confirmar
                            </button>
                            <button type="button" className="crud-link-btn" onClick={() => setPagandoId(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button type="button" className="crud-link-btn" onClick={() => setPagandoId(gasto.id)}>
                            Pagar
                          </button>
                        ))}
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
