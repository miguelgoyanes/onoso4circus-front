import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearGasto,
  listarGastos,
  pagarGasto,
  type CategoriaGastoGeneral,
  type CategoriaGastoPlaza,
  type ConceptoGastoDerivado,
  type EstadoPagoGasto,
  type Gasto,
  type TipoGasto,
} from '../api/gastos';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import { listarPlazas, type Plaza } from '../api/plazas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

const TIPOS: TipoGasto[] = ['PERSONAL', 'PLAZA', 'GENERAL'];
const ESTADOS_PAGO: EstadoPagoGasto[] = ['PAGADO', 'PENDIENTE_PAGO'];
const CATEGORIAS_PLAZA: CategoriaGastoPlaza[] = [
  'MONTAJE',
  'ALQUILER_MATERIAL',
  'PERMISO_LICENCIA',
  'OTRO',
];
const CATEGORIAS_GENERAL: CategoriaGastoGeneral[] = [
  'GESTORIA',
  'SEGURO_GENERAL',
  'MARKETING',
  'SUSCRIPCION',
  'OTRO',
];
const CONCEPTOS_DERIVADO: ConceptoGastoDerivado[] = ['DIETA', 'SEGURO', 'OTRO'];

interface DerivadoForm {
  concepto: ConceptoGastoDerivado;
  importe: string;
}

export function GastosPage() {
  const { accessToken, logout } = useAuth();
  const [gastos, setGastos] = useState<Gasto[] | null>(null);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaPublica[]>([]);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState<TipoGasto | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPagoGasto | ''>('');

  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState<TipoGasto>('GENERAL');
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estadoPago, setEstadoPago] = useState<EstadoPagoGasto>('PAGADO');
  const [cuentaPagoId, setCuentaPagoId] = useState('');
  const [plazaId, setPlazaId] = useState('');

  const [empleadoId, setEmpleadoId] = useState('');
  const [importeSalario, setImporteSalario] = useState('');
  const [costeSs, setCosteSs] = useState('');
  const [derivados, setDerivados] = useState<DerivadoForm[]>([]);

  const [categoriaPlaza, setCategoriaPlaza] = useState<CategoriaGastoPlaza>('MONTAJE');
  const [categoriaGeneral, setCategoriaGeneral] = useState<CategoriaGastoGeneral>('GESTORIA');
  const [importe, setImporte] = useState('');

  const [guardando, setGuardando] = useState(false);

  const [pagandoId, setPagandoId] = useState<string | null>(null);
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
    if (!accessToken) return;
    try {
      const [gastosData, cuentasData, plazasData] = await Promise.all([
        listarGastos(accessToken, {
          tipo: filtroTipo || undefined,
          estadoPago: filtroEstado || undefined,
        }),
        listarCuentas(accessToken),
        listarPlazas(accessToken),
      ]);
      setGastos(gastosData);
      setCuentasDeDinero(cuentasData.filter((c) => c.esCuentaDeDinero));
      setPlazas(plazasData);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, filtroTipo, filtroEstado]);

  useEffect(() => {
    if (cuentaPagoId || cuentasDeDinero.length === 0) return;
    const porDefecto = cuentasDeDinero.find((c) => c.code === '570001') ?? cuentasDeDinero[0];
    setCuentaPagoId(porDefecto.id);
  }, [cuentasDeDinero, cuentaPagoId]);

  function limpiarFormulario() {
    setFecha('');
    setDescripcion('');
    setEstadoPago('PAGADO');
    setPlazaId('');
    setEmpleadoId('');
    setImporteSalario('');
    setCosteSs('');
    setDerivados([]);
    setImporte('');
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
    if (!accessToken) return;
    setError(null);
    setGuardando(true);
    try {
      await crearGasto(accessToken, {
        tipo,
        fecha,
        descripcion,
        estadoPago,
        cuentaPagoId: estadoPago === 'PAGADO' ? cuentaPagoId || undefined : undefined,
        plazaId: plazaId || undefined,
        ...(tipo === 'PERSONAL'
          ? {
              empleadoId,
              importeSalario: Number(importeSalario),
              costeSs: costeSs ? Number(costeSs) : undefined,
              gastosDerivados: derivados
                .filter((d) => d.importe !== '')
                .map((d) => ({ concepto: d.concepto, importe: Number(d.importe) })),
            }
          : {}),
        ...(tipo === 'PLAZA' ? { categoriaPlaza, importe: Number(importe) } : {}),
        ...(tipo === 'GENERAL' ? { categoriaGeneral, importe: Number(importe) } : {}),
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

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Gastos' }]} />
          <div className="crud-header-row">
            <h1>Gastos</h1>
            <button
              type="button"
              className="crud-btn-primary"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancelar' : 'Registrar gasto'}
            </button>
          </div>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-form-row">
          <label className="crud-field">
            <span>Filtrar por tipo</span>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoGasto | '')}>
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="crud-field">
            <span>Filtrar por estado de pago</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoPagoGasto | '')}
            >
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
                <span>Tipo</span>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoGasto)}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crud-field">
                <span>Descripción</span>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha</span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Plaza (opcional)</span>
                <select value={plazaId} onChange={(e) => setPlazaId(e.target.value)}>
                  <option value="">Sin plaza</option>
                  {plazas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Estado de pago</span>
                <select
                  value={estadoPago}
                  onChange={(e) => setEstadoPago(e.target.value as EstadoPagoGasto)}
                >
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

            {tipo === 'PERSONAL' && (
              <>
                <div className="crud-form-row">
                  <label className="crud-field">
                    <span>Empleado</span>
                    <input
                      value={empleadoId}
                      onChange={(e) => setEmpleadoId(e.target.value)}
                      placeholder="ej. Brandon"
                      required
                    />
                  </label>
                  <label className="crud-field">
                    <span>Importe salario (€)</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={importeSalario}
                      onChange={(e) => setImporteSalario(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="crud-form-row">
                  <label className="crud-field">
                    <span>Coste SS (opcional)</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={costeSs}
                      onChange={(e) => setCosteSs(e.target.value)}
                    />
                  </label>
                </div>
                <div className="crud-form-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                  <span>Gastos derivados (dietas, seguros...)</span>
                  {derivados.map((d, i) => (
                    <div key={i} className="crud-form-row">
                      <select
                        value={d.concepto}
                        onChange={(e) =>
                          actualizarDerivado(i, { concepto: e.target.value as ConceptoGastoDerivado })
                        }
                      >
                        {CONCEPTOS_DERIVADO.map((c) => (
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
                      <button
                        type="button"
                        className="crud-delete-btn"
                        onClick={() => eliminarDerivado(i)}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                  <button type="button" className="crud-link-btn" onClick={agregarDerivado}>
                    + Añadir gasto derivado
                  </button>
                </div>
              </>
            )}

            {tipo === 'PLAZA' && (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Categoría</span>
                  <select
                    value={categoriaPlaza}
                    onChange={(e) => setCategoriaPlaza(e.target.value as CategoriaGastoPlaza)}
                  >
                    {CATEGORIAS_PLAZA.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
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

            {tipo === 'GENERAL' && (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Categoría</span>
                  <select
                    value={categoriaGeneral}
                    onChange={(e) => setCategoriaGeneral(e.target.value as CategoriaGastoGeneral)}
                  >
                    {CATEGORIAS_GENERAL.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
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

            <div className="crud-form-actions">
              <button type="submit" className="crud-btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        <div className="crud-list">
          {gastos === null && <p className="crud-empty">Cargando…</p>}
          {gastos?.length === 0 && <p className="crud-empty">No hay gastos registrados.</p>}
          {gastos?.map((gasto) => (
            <div key={gasto.id} className="crud-card">
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{gasto.descripcion}</div>
                  <div className="crud-card-meta">
                    <span>{gasto.fecha}</span>
                    <span className="badge">{gasto.tipo}</span>
                    <span className={gasto.estadoPago === 'PENDIENTE_PAGO' ? 'badge badge-muted' : 'badge'}>
                      {gasto.estadoPago}
                    </span>
                    {gasto.categoriaPlaza && <span className="badge">{gasto.categoriaPlaza}</span>}
                    {gasto.categoriaGeneral && <span className="badge">{gasto.categoriaGeneral}</span>}
                    {gasto.empleadoId && <span className="badge">{gasto.empleadoId}</span>}
                  </div>
                </div>
                <div className="crud-card-actions">
                  <strong>{gasto.importeTotal} €</strong>
                  {gasto.estadoPago === 'PENDIENTE_PAGO' &&
                    (pagandoId === gasto.id ? (
                      <>
                        <select
                          value={pagarCuentaId}
                          onChange={(e) => setPagarCuentaId(e.target.value)}
                        >
                          <option value="">Cuenta de pago…</option>
                          {cuentasDeDinero.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} ({c.code})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="crud-btn-primary"
                          onClick={() => handlePagar(gasto.id)}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          className="crud-link-btn"
                          onClick={() => setPagandoId(null)}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="crud-link-btn"
                        onClick={() => setPagandoId(gasto.id)}
                      >
                        Pagar
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
