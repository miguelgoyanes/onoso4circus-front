import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { crearActivo, listarActivos, listarCategoriasActivo, type Activo, type CategoriaActivo, type TipoFiscal } from '../api/activos';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import { calcularBaseDesdeTotal, calcularDesdeBase } from '../utils/iva';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

export function ActivosPage() {
  const { accessToken, logout } = useAuth();
  const [activos, setActivos] = useState<Activo[] | null>(null);
  const [categorias, setCategorias] = useState<CategoriaActivo[]>([]);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaPublica[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [categoriaId, setCategoriaId] = useState('');
  const [nombre, setNombre] = useState('');
  const [fechaCompra, setFechaCompra] = useState('');
  const [cuentaPagoId, setCuentaPagoId] = useState('');
  const [tipoFiscal, setTipoFiscal] = useState<TipoFiscal>('B');
  const [ivaBase, setIvaBase] = useState('');
  const [ivaTotal, setIvaTotal] = useState('');
  const [ivaPercent, setIvaPercent] = useState('21');
  const [importe, setImporte] = useState('');
  const [vidaUtilAnios, setVidaUtilAnios] = useState('');
  const [valorResidual, setValorResidual] = useState('0');
  const [guardando, setGuardando] = useState(false);

  const categoria = categorias.find((c) => c.id === categoriaId);

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
      const [activosData, categoriasData, cuentasData] = await Promise.all([
        listarActivos(accessToken, { categoriaId: filtroCategoriaId || undefined }),
        listarCategoriasActivo(accessToken),
        listarCuentas(accessToken),
      ]);
      setActivos(activosData);
      setCategorias(categoriasData);
      setCuentasDeDinero(cuentasData.filter((c) => c.activa));
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, filtroCategoriaId]);

  useEffect(() => {
    if (cuentaPagoId || cuentasDeDinero.length === 0) return;
    setCuentaPagoId(cuentasDeDinero[0].id);
  }, [cuentasDeDinero, cuentaPagoId]);

  function onChangeIvaBase(v: string) {
    setIvaBase(v);
    setIvaTotal(v && ivaPercent ? String(calcularDesdeBase(Number(v), Number(ivaPercent)).total) : ivaTotal);
  }
  function onChangeIvaTotal(v: string) {
    setIvaTotal(v);
    setIvaBase(v && ivaPercent ? String(calcularBaseDesdeTotal(Number(v), Number(ivaPercent)).base) : ivaBase);
  }
  function onChangeIvaPercent(v: string) {
    setIvaPercent(v);
    if (ivaBase) setIvaTotal(v ? String(calcularDesdeBase(Number(ivaBase), Number(v)).total) : '');
    else if (ivaTotal) setIvaBase(v ? String(calcularBaseDesdeTotal(Number(ivaTotal), Number(v)).base) : '');
  }

  function limpiarFormulario() {
    setCategoriaId('');
    setNombre('');
    setFechaCompra('');
    setTipoFiscal('B');
    setIvaBase('');
    setIvaTotal('');
    setIvaPercent('21');
    setImporte('');
    setVidaUtilAnios('');
    setValorResidual('0');
  }

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !categoria) return;
    setError(null);
    setGuardando(true);
    try {
      await crearActivo(accessToken, {
        categoriaId,
        nombre,
        fechaCompra,
        cuentaPagoId,
        vidaUtilAnios: Number(vidaUtilAnios),
        valorResidual: Number(valorResidual || 0),
        ...(categoria.aplicaIva && tipoFiscal === 'A'
          ? { tipoFiscal: 'A' as TipoFiscal, baseImponible: Number(ivaBase), ivaPercent: Number(ivaPercent) }
          : { importe: Number(importe), tipoFiscal: categoria.aplicaIva ? tipoFiscal : undefined }),
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

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Activos' }]} />
          <div className="crud-header-row">
            <h1>Activos</h1>
            <div className="crud-card-actions">
              <Link to="/activos/categorias" className="crud-link-btn">
                ⚙ Categorías
              </Link>
              <button type="button" className="crud-btn-primary" onClick={() => setShowForm(true)}>
                Registrar activo
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
        </div>

        <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar activo">
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
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
            </div>

            {categoria && (
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
                  <div className="crud-form-row">
                    <label className="crud-field">
                      <span>Base imponible (€)</span>
                      <input type="number" min="0" step="0.01" value={ivaBase} onChange={(e) => onChangeIvaBase(e.target.value)} />
                    </label>
                    <label className="crud-field">
                      <span>IVA (%)</span>
                      <input type="number" min="0" step="0.01" value={ivaPercent} onChange={(e) => onChangeIvaPercent(e.target.value)} />
                    </label>
                    <label className="crud-field">
                      <span>Total con IVA (€)</span>
                      <input type="number" min="0" step="0.01" value={ivaTotal} onChange={(e) => onChangeIvaTotal(e.target.value)} />
                    </label>
                  </div>
                ) : (
                  <div className="crud-form-row">
                    <label className="crud-field">
                      <span>Importe (€)</span>
                      <input type="number" min="0.01" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} required />
                    </label>
                  </div>
                )}
              </>
            )}

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha de compra</span>
                <input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Cuenta de pago</span>
                <select value={cuentaPagoId} onChange={(e) => setCuentaPagoId(e.target.value)} required>
                  <option value="">Selecciona…</option>
                  {cuentasDeDinero.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="crud-form-row">
              <label className="crud-field">
                <span>Vida útil (años)</span>
                <input type="number" min="1" step="1" value={vidaUtilAnios} onChange={(e) => setVidaUtilAnios(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Valor residual (€)</span>
                <input type="number" min="0" step="0.01" value={valorResidual} onChange={(e) => setValorResidual(e.target.value)} />
              </label>
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

        <div className="crud-list">
          {activos === null && <p className="crud-empty">Cargando…</p>}
          {activos?.length === 0 && <p className="crud-empty">No hay activos todavía.</p>}
          {activos?.map((activo) => (
            <Link key={activo.id} to={`/activos/${activo.id}`} className="crud-card crud-card-title-link" style={{ display: 'block' }}>
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{activo.nombre}</div>
                  <div className="crud-card-meta">
                    <span className="badge">{activo.categoriaNombre}</span>
                    {activo.tipoFiscal && <span className="badge badge-muted">IVA {activo.tipoFiscal}</span>}
                    {!activo.activo && <span className="badge badge-muted">DADO DE BAJA</span>}
                  </div>
                </div>
                <div className="crud-card-actions">
                  <strong>{activo.valorNetoContable} €</strong>
                </div>
                <span className="crud-card-chevron" aria-hidden="true">
                  ›
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
