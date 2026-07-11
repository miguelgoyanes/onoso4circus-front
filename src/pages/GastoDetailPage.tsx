import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  actualizarGasto,
  eliminarGasto,
  listarCategoriasGasto,
  obtenerGasto,
  pagarGasto,
  type CategoriaGasto,
  type ConceptoPersonal,
  type ConceptoPersonalInput,
  type EstadoPagoGasto,
  type Gasto,
  type TipoFiscal,
} from '../api/gastos';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import {
  obtenerPlaza,
  obtenerFecha,
  listarFechas,
  listarPases,
  listarPlazas,
  type Plaza,
  type Fecha,
  type Pase,
} from '../api/plazas';
import { obtenerEmpleado, listarEmpleados, type Empleado } from '../api/personal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import { CamposIva, crearManejadoresIva } from '../components/CamposIva';
import '../styles/crud-page.css';

const ESTADOS_PAGO: EstadoPagoGasto[] = ['PAGADO', 'PENDIENTE_PAGO'];
const CONCEPTOS_DERIVADOS: ConceptoPersonal[] = ['DIETA', 'SEGURO', 'OTRO'];

interface DerivadoForm {
  concepto: ConceptoPersonal;
  importe: string;
}

export function GastoDetailPage() {
  const { gastoId } = useParams<{ gastoId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [cuentas, setCuentas] = useState<CuentaPublica[]>([]);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [pase, setPase] = useState<Pase | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pagando, setPagando] = useState(false);
  const [pagarCuentaId, setPagarCuentaId] = useState('');

  const [editando, setEditando] = useState(false);
  const [eCategoriaId, setECategoriaId] = useState('');
  const [eFecha, setEFecha] = useState('');
  const [eDescripcion, setEDescripcion] = useState('');
  const [eEstadoPago, setEEstadoPago] = useState<EstadoPagoGasto>('PAGADO');
  const [eCuentaPagoId, setECuentaPagoId] = useState('');
  const [eVincularPlaza, setEVincularPlaza] = useState(false);
  const [ePlazaId, setEPlazaId] = useState('');
  const [eFechaId, setEFechaId] = useState('');
  const [ePaseId, setEPaseId] = useState('');
  const [eFechasDePlaza, setEFechasDePlaza] = useState<Fecha[]>([]);
  const [ePasesDeFecha, setEPasesDeFecha] = useState<Pase[]>([]);

  const [eImporte, setEImporte] = useState('');
  const [eTipoFiscal, setETipoFiscal] = useState<TipoFiscal>('B');
  const [eIvaBase, setEIvaBase] = useState('');
  const [eIvaTotal, setEIvaTotal] = useState('');
  const [eIvaPercent, setEIvaPercent] = useState('21');

  const [eEmpleadoId, setEEmpleadoId] = useState('');
  const [eSalarioImporte, setESalarioImporte] = useState('');
  const [eSalarioTipoFiscal, setESalarioTipoFiscal] = useState<TipoFiscal>('B');
  const [eSalarioBase, setESalarioBase] = useState('');
  const [eSalarioTotal, setESalarioTotal] = useState('');
  const [eSalarioPercent, setESalarioPercent] = useState('21');
  const [eSeguridadSocial, setESeguridadSocial] = useState('');
  const [eDerivados, setEDerivados] = useState<DerivadoForm[]>([]);

  const [guardando, setGuardando] = useState(false);

  const eCategoria = categorias.find((c) => c.id === eCategoriaId);
  const eEmpleado = empleados.find((e) => e.id === eEmpleadoId);

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
      const [g, cuentasData, categoriasData, plazasData, empleadosData] = await Promise.all([
        obtenerGasto(accessToken, gastoId),
        listarCuentas(accessToken),
        listarCategoriasGasto(accessToken),
        listarPlazas(accessToken),
        listarEmpleados(accessToken),
      ]);
      setGasto(g);
      setCuentas(cuentasData);
      setCategorias(categoriasData);
      setPlazas(plazasData);
      setEmpleados(empleadosData);
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
    const cuentasDeDinero = cuentas.filter((c) => c.activa);
    if (pagarCuentaId || cuentasDeDinero.length === 0) return;
    setPagarCuentaId(cuentasDeDinero[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas]);

  useEffect(() => {
    const cuentasDeDinero = cuentas.filter((c) => c.activa);
    if (eCuentaPagoId || cuentasDeDinero.length === 0) return;
    setECuentaPagoId(cuentasDeDinero[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas]);

  // Solo trae las fechas de la plaza seleccionada — el reseteo de fechaId/paseId al cambiar de
  // plaza vive en el onChange del desplegable (acción del usuario), no aquí, para no borrar el
  // prefill de abrirEditar() (que fija plazaId+fechaId+paseId a la vez).
  useEffect(() => {
    async function cargarFechas() {
      if (!accessToken || !ePlazaId) {
        setEFechasDePlaza([]);
        return;
      }
      setEFechasDePlaza(await listarFechas(accessToken, ePlazaId));
    }
    cargarFechas().catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, ePlazaId]);

  useEffect(() => {
    async function cargarPases() {
      if (!accessToken || !eFechaId) {
        setEPasesDeFecha([]);
        return;
      }
      setEPasesDeFecha(await listarPases(accessToken, eFechaId));
    }
    cargarPases().catch(handleApiError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, eFechaId]);

  function agregarDerivado() {
    setEDerivados((prev) => [...prev, { concepto: 'DIETA', importe: '' }]);
  }

  function actualizarDerivado(index: number, cambios: Partial<DerivadoForm>) {
    setEDerivados((prev) => prev.map((d, i) => (i === index ? { ...d, ...cambios } : d)));
  }

  function eliminarDerivado(index: number) {
    setEDerivados((prev) => prev.filter((_, i) => i !== index));
  }

  function abrirEditar() {
    if (!gasto) return;
    const categoria = categorias.find((c) => c.id === gasto.categoriaId);

    setECategoriaId(gasto.categoriaId);
    setEFecha(gasto.fecha);
    setEDescripcion(gasto.descripcion);
    setEEstadoPago(gasto.estadoPago);
    setECuentaPagoId(gasto.cuentaPagoId ?? '');
    setEVincularPlaza(!!gasto.plazaId);
    setEPlazaId(gasto.plazaId ?? '');
    setEFechaId(gasto.fechaId ?? '');
    setEPaseId(gasto.paseId ?? '');

    if (categoria?.esPagoPersonal) {
      const salario = gasto.conceptos.find((c) => c.concepto === 'SALARIO');
      const seguridadSocial = gasto.conceptos.find((c) => c.concepto === 'SEGURIDAD_SOCIAL');
      const derivados = gasto.conceptos.filter((c) => CONCEPTOS_DERIVADOS.includes(c.concepto));

      setEEmpleadoId(gasto.empleadoId ?? '');
      setESalarioTipoFiscal(gasto.tipoFiscal ?? 'B');
      if (gasto.tipoFiscal === 'A') {
        setESalarioBase(gasto.baseImponible ?? '');
        setESalarioTotal(salario?.importe ?? '');
        setESalarioPercent(gasto.ivaPercent ?? '21');
        setESalarioImporte('');
      } else {
        setESalarioImporte(salario?.importe ?? '');
        setESalarioBase('');
        setESalarioTotal('');
        setESalarioPercent('21');
      }
      setESeguridadSocial(seguridadSocial?.importe ?? '');
      setEDerivados(derivados.map((d) => ({ concepto: d.concepto, importe: d.importe })));

      setEImporte('');
      setETipoFiscal('B');
      setEIvaBase('');
      setEIvaTotal('');
      setEIvaPercent('21');
    } else {
      setEEmpleadoId('');
      setESalarioImporte('');
      setESalarioBase('');
      setESalarioTotal('');
      setESeguridadSocial('');
      setEDerivados([]);

      setETipoFiscal(gasto.tipoFiscal ?? 'B');
      if (gasto.tipoFiscal === 'A') {
        setEIvaBase(gasto.baseImponible ?? '');
        setEIvaTotal(gasto.importe);
        setEIvaPercent(gasto.ivaPercent ?? '21');
        setEImporte('');
      } else {
        setEImporte(gasto.importe);
        setEIvaBase('');
        setEIvaTotal('');
        setEIvaPercent('21');
      }
    }

    setEditando(true);
  }

  async function handleGuardarEdicion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !gastoId || !eCategoria) return;
    setError(null);
    setGuardando(true);
    try {
      const conceptos: ConceptoPersonalInput[] | undefined = eCategoria.esPagoPersonal
        ? [
            eEmpleado?.regimen === 'AUTONOMO' && eSalarioTipoFiscal === 'A'
              ? {
                  concepto: 'SALARIO',
                  tipoFiscal: 'A',
                  baseImponible: Number(eSalarioBase),
                  ivaPercent: Number(eSalarioPercent),
                }
              : { concepto: 'SALARIO', importe: Number(eSalarioImporte) },
            ...(eEmpleado?.regimen === 'CUENTA_AJENA' && eSeguridadSocial
              ? [{ concepto: 'SEGURIDAD_SOCIAL' as ConceptoPersonal, importe: Number(eSeguridadSocial) }]
              : []),
            ...eDerivados
              .filter((d) => d.importe !== '')
              .map((d) => ({ concepto: d.concepto, importe: Number(d.importe) })),
          ]
        : undefined;

      await actualizarGasto(accessToken, gastoId, {
        categoriaId: eCategoriaId,
        fecha: eFecha,
        descripcion: eDescripcion,
        estadoPago: eEstadoPago,
        cuentaPagoId: eEstadoPago === 'PAGADO' ? eCuentaPagoId || undefined : undefined,
        plazaId: eVincularPlaza ? ePlazaId || undefined : undefined,
        fechaId: eVincularPlaza ? eFechaId || undefined : undefined,
        paseId: eVincularPlaza ? ePaseId || undefined : undefined,
        empleadoId: eCategoria.esPagoPersonal ? eEmpleadoId : undefined,
        ...(!eCategoria.esPagoPersonal
          ? eCategoria.aplicaIva && eTipoFiscal === 'A'
            ? { tipoFiscal: 'A' as TipoFiscal, baseImponible: Number(eIvaBase), ivaPercent: Number(eIvaPercent) }
            : { importe: Number(eImporte), tipoFiscal: eCategoria.aplicaIva ? eTipoFiscal : undefined }
          : {}),
        conceptos,
      });
      setEditando(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

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
  const cuentasDeDinero = cuentas.filter((c) => c.activa);

  const manejadoresIva = crearManejadoresIva(eIvaBase, setEIvaBase, eIvaTotal, setEIvaTotal, eIvaPercent, setEIvaPercent);
  const manejadoresSalarioIva = crearManejadoresIva(
    eSalarioBase,
    setESalarioBase,
    eSalarioTotal,
    setESalarioTotal,
    eSalarioPercent,
    setESalarioPercent,
  );

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
                    <span className="detail-value">{cuentaPago.nombre}</span>
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
                        .filter((c) => c.activa)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
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
              <button type="button" className="crud-link-btn" onClick={abrirEditar}>
                Editar
              </button>
              <button type="button" className="crud-delete-btn" onClick={handleEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        )}

        <Modal open={editando} onClose={() => setEditando(false)} title="Editar gasto">
          <form className="crud-form" onSubmit={handleGuardarEdicion}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Categoría</span>
                <select value={eCategoriaId} onChange={(e) => setECategoriaId(e.target.value)} required>
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
                <input value={eDescripcion} onChange={(e) => setEDescripcion(e.target.value)} required />
              </label>
            </div>

            {eCategoria?.esPagoPersonal && (
              <>
                <div className="crud-form-row">
                  <label className="crud-field">
                    <span>Empleado</span>
                    <select
                      value={eEmpleadoId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setEEmpleadoId(id);
                        const emp = empleados.find((x) => x.id === id);
                        if (emp?.importeReferenciaDia) setESalarioImporte(emp.importeReferenciaDia);
                      }}
                      required
                    >
                      <option value="">Selecciona un empleado…</option>
                      {empleados.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre} ({e.regimen})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {eEmpleado && (
                  <>
                    {eEmpleado.regimen === 'AUTONOMO' ? (
                      <>
                        <div className="crud-form-row">
                          <label className="crud-field">
                            <span>IVA en el salario</span>
                            <select
                              value={eSalarioTipoFiscal}
                              onChange={(e) => setESalarioTipoFiscal(e.target.value as TipoFiscal)}
                            >
                              <option value="B">B — sin factura, importe completo</option>
                              <option value="A">A — con factura, reparte IVA soportado</option>
                            </select>
                          </label>
                        </div>
                        {eSalarioTipoFiscal === 'A' ? (
                          <CamposIva
                            base={eSalarioBase}
                            total={eSalarioTotal}
                            percent={eSalarioPercent}
                            manejadores={manejadoresSalarioIva}
                          />
                        ) : (
                          <div className="crud-form-row">
                            <label className="crud-field">
                              <span>Importe del salario (€)</span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={eSalarioImporte}
                                onChange={(e) => setESalarioImporte(e.target.value)}
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
                            value={eSalarioImporte}
                            onChange={(e) => setESalarioImporte(e.target.value)}
                            required
                          />
                        </label>
                        <label className="crud-field">
                          <span>Seguridad Social (€, opcional)</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={eSeguridadSocial}
                            onChange={(e) => setESeguridadSocial(e.target.value)}
                          />
                        </label>
                      </div>
                    )}
                  </>
                )}

                <div className="crud-form-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                  <span>Otros conceptos (dietas, seguros...)</span>
                  {eDerivados.map((d, i) => (
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

            {eCategoria && !eCategoria.esPagoPersonal && (
              <>
                {eCategoria.aplicaIva && (
                  <div className="crud-form-row">
                    <label className="crud-field">
                      <span>IVA</span>
                      <select value={eTipoFiscal} onChange={(e) => setETipoFiscal(e.target.value as TipoFiscal)}>
                        <option value="B">B — sin factura, importe completo</option>
                        <option value="A">A — con factura, reparte IVA soportado</option>
                      </select>
                    </label>
                  </div>
                )}
                {eCategoria.aplicaIva && eTipoFiscal === 'A' ? (
                  <CamposIva base={eIvaBase} total={eIvaTotal} percent={eIvaPercent} manejadores={manejadoresIva} />
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
              </>
            )}

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha</span>
                <input type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} required />
              </label>
            </div>

            <div className="crud-form-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={eVincularPlaza} onChange={(e) => setEVincularPlaza(e.target.checked)} />
                <span>Vincular a una plaza (opcional)</span>
              </label>
              {eVincularPlaza && (
                <div className="crud-form-row">
                  <label className="crud-field">
                    <span>Plaza</span>
                    <select
                      value={ePlazaId}
                      onChange={(e) => {
                        setEPlazaId(e.target.value);
                        setEFechaId('');
                        setEPaseId('');
                      }}
                    >
                      <option value="">Selecciona una plaza…</option>
                      {plazas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  {ePlazaId && (
                    <label className="crud-field">
                      <span>Fecha de la plaza (opcional)</span>
                      <select
                        value={eFechaId}
                        onChange={(e) => {
                          setEFechaId(e.target.value);
                          setEPaseId('');
                        }}
                      >
                        <option value="">Toda la plaza</option>
                        {eFechasDePlaza.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.fecha}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {eFechaId && (
                    <label className="crud-field">
                      <span>Pase (opcional)</span>
                      <select value={ePaseId} onChange={(e) => setEPaseId(e.target.value)}>
                        <option value="">Toda la fecha</option>
                        {ePasesDeFecha.map((p) => (
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
                <select
                  value={eEstadoPago}
                  onChange={(e) => {
                    const value = e.target.value as EstadoPagoGasto;
                    setEEstadoPago(value);
                    if (value === 'PAGADO' && !eCuentaPagoId && cuentasDeDinero.length > 0) {
                      setECuentaPagoId(cuentasDeDinero[0].id);
                    }
                  }}
                >
                  {ESTADOS_PAGO.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              {eEstadoPago === 'PAGADO' && (
                <label className="crud-field">
                  <span>Cuenta de pago</span>
                  <select value={eCuentaPagoId} onChange={(e) => setECuentaPagoId(e.target.value)}>
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
              <button type="button" className="crud-form-cancel" onClick={() => setEditando(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardando || !eCategoria}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
