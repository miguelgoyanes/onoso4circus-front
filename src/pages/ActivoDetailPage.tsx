import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  actualizarActivo,
  darDeBajaActivo,
  eliminarActivo,
  listarCategoriasActivo,
  obtenerActivo,
  reactivarActivo,
  type Activo,
  type CategoriaActivo,
  type TipoFiscal,
} from '../api/activos';
import { listarCuentas, type CuentaPublica } from '../api/tesoreria';
import { calcularBaseDesdeTotal, calcularDesdeBase } from '../utils/iva';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import '../styles/crud-page.css';

export function ActivoDetailPage() {
  const { activoId } = useParams<{ activoId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();
  const [activo, setActivo] = useState<Activo | null>(null);
  const [categorias, setCategorias] = useState<CategoriaActivo[]>([]);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaPublica[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showEditar, setShowEditar] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editVidaUtilAnios, setEditVidaUtilAnios] = useState('');
  const [editValorResidual, setEditValorResidual] = useState('');
  const [editCategoriaId, setEditCategoriaId] = useState('');
  const [editFechaCompra, setEditFechaCompra] = useState('');
  const [editCuentaPagoId, setEditCuentaPagoId] = useState('');
  const [editTipoFiscal, setEditTipoFiscal] = useState<TipoFiscal>('B');
  const [editIvaBase, setEditIvaBase] = useState('');
  const [editIvaTotal, setEditIvaTotal] = useState('');
  const [editIvaPercent, setEditIvaPercent] = useState('21');
  const [editImporte, setEditImporte] = useState('');
  const [guardando, setGuardando] = useState(false);

  const editCategoria = categorias.find((c) => c.id === editCategoriaId);
  const amortizado = activo != null && Number(activo.amortizacionAcumulada) > 0;

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
    if (!accessToken || !activoId) return;
    try {
      const [a, categoriasData, cuentasData] = await Promise.all([
        obtenerActivo(accessToken, activoId),
        listarCategoriasActivo(accessToken),
        listarCuentas(accessToken),
      ]);
      setActivo(a);
      setCategorias(categoriasData);
      setCuentasDeDinero(cuentasData.filter((c) => c.activa));
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activoId]);

  function onChangeIvaBase(v: string) {
    setEditIvaBase(v);
    setEditIvaTotal(v && editIvaPercent ? String(calcularDesdeBase(Number(v), Number(editIvaPercent)).total) : editIvaTotal);
  }
  function onChangeIvaTotal(v: string) {
    setEditIvaTotal(v);
    setEditIvaBase(v && editIvaPercent ? String(calcularBaseDesdeTotal(Number(v), Number(editIvaPercent)).base) : editIvaBase);
  }
  function onChangeIvaPercent(v: string) {
    setEditIvaPercent(v);
    if (editIvaBase) setEditIvaTotal(v ? String(calcularDesdeBase(Number(editIvaBase), Number(v)).total) : '');
    else if (editIvaTotal) setEditIvaBase(v ? String(calcularBaseDesdeTotal(Number(editIvaTotal), Number(v)).base) : '');
  }

  function abrirEditar() {
    if (!activo) return;
    setEditNombre(activo.nombre);
    setEditVidaUtilAnios(String(activo.vidaUtilAnios));
    setEditValorResidual(activo.valorResidual);
    setEditCategoriaId(activo.categoriaId);
    setEditFechaCompra(activo.fechaCompra);
    setEditCuentaPagoId(activo.cuentaPagoId);
    setEditTipoFiscal(activo.tipoFiscal ?? 'B');
    setEditIvaBase(activo.baseImponible ?? '');
    setEditIvaTotal(activo.coste);
    setEditIvaPercent(activo.ivaPercent ?? '21');
    setEditImporte(activo.coste);
    setShowEditar(true);
  }

  async function handleEditar(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !activoId) return;
    setError(null);
    setGuardando(true);
    try {
      await actualizarActivo(accessToken, activoId, {
        nombre: editNombre,
        vidaUtilAnios: Number(editVidaUtilAnios),
        valorResidual: Number(editValorResidual || 0),
        economia: amortizado
          ? undefined
          : {
              categoriaId: editCategoriaId,
              fechaCompra: editFechaCompra,
              cuentaPagoId: editCuentaPagoId,
              ...(editCategoria?.aplicaIva && editTipoFiscal === 'A'
                ? { tipoFiscal: 'A' as TipoFiscal, baseImponible: Number(editIvaBase), ivaPercent: Number(editIvaPercent) }
                : { importe: Number(editImporte), tipoFiscal: editCategoria?.aplicaIva ? editTipoFiscal : undefined }),
            },
      });
      setShowEditar(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggleActivo() {
    if (!accessToken || !activoId || !activo) return;
    setError(null);
    try {
      if (activo.activo) await darDeBajaActivo(accessToken, activoId);
      else await reactivarActivo(accessToken, activoId);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar() {
    if (!accessToken || !activoId) return;
    setError(null);
    try {
      await eliminarActivo(accessToken, activoId);
      navigate('/activos');
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Activos', to: '/activos' },
              { label: activo?.nombre ?? '…' },
            ]}
          />
          <h1>{activo?.nombre ?? 'Activo'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <Modal open={showEditar} onClose={() => setShowEditar(false)} title="Editar activo">
          <form className="crud-form" onSubmit={handleEditar}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Nombre</span>
                <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
              </label>
            </div>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Vida útil (años)</span>
                <input type="number" min="1" step="1" value={editVidaUtilAnios} onChange={(e) => setEditVidaUtilAnios(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Valor residual (€)</span>
                <input type="number" min="0" step="0.01" value={editValorResidual} onChange={(e) => setEditValorResidual(e.target.value)} />
              </label>
            </div>

            {amortizado ? (
              <p className="crud-empty">
                Este activo ya tiene amortización registrada — la categoría, fecha de compra, coste e IVA ya no se pueden cambiar.
              </p>
            ) : (
              <>
                <div className="crud-form-row">
                  <label className="crud-field">
                    <span>Categoría</span>
                    <select value={editCategoriaId} onChange={(e) => setEditCategoriaId(e.target.value)} required>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="crud-field">
                    <span>Fecha de compra</span>
                    <input type="date" value={editFechaCompra} onChange={(e) => setEditFechaCompra(e.target.value)} required />
                  </label>
                </div>

                {editCategoria?.aplicaIva && (
                  <div className="crud-form-row">
                    <label className="crud-field">
                      <span>IVA</span>
                      <select value={editTipoFiscal} onChange={(e) => setEditTipoFiscal(e.target.value as TipoFiscal)}>
                        <option value="B">B — sin factura, importe completo</option>
                        <option value="A">A — con factura, reparte IVA soportado</option>
                      </select>
                    </label>
                  </div>
                )}
                {editCategoria?.aplicaIva && editTipoFiscal === 'A' ? (
                  <div className="crud-form-row">
                    <label className="crud-field">
                      <span>Base imponible (€)</span>
                      <input type="number" min="0" step="0.01" value={editIvaBase} onChange={(e) => onChangeIvaBase(e.target.value)} />
                    </label>
                    <label className="crud-field">
                      <span>IVA (%)</span>
                      <input type="number" min="0" step="0.01" value={editIvaPercent} onChange={(e) => onChangeIvaPercent(e.target.value)} />
                    </label>
                    <label className="crud-field">
                      <span>Total con IVA (€)</span>
                      <input type="number" min="0" step="0.01" value={editIvaTotal} onChange={(e) => onChangeIvaTotal(e.target.value)} />
                    </label>
                  </div>
                ) : (
                  <div className="crud-form-row">
                    <label className="crud-field">
                      <span>Importe (€)</span>
                      <input type="number" min="0.01" step="0.01" value={editImporte} onChange={(e) => setEditImporte(e.target.value)} required />
                    </label>
                  </div>
                )}

                <div className="crud-form-row">
                  <label className="crud-field">
                    <span>Cuenta de pago</span>
                    <select value={editCuentaPagoId} onChange={(e) => setEditCuentaPagoId(e.target.value)} required>
                      {cuentasDeDinero.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}

            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowEditar(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        {activo && (
          <div className="detail-card">
            <div className="detail-hero">
              <div className="detail-hero-amount">{activo.valorNetoContable} €</div>
              <div className="detail-hero-meta">
                <span className="badge">{activo.categoriaNombre}</span>
                {activo.tipoFiscal && <span className="badge badge-muted">IVA {activo.tipoFiscal}</span>}
                <span className={activo.activo ? 'badge badge-success' : 'badge badge-danger'}>
                  {activo.activo ? 'Activo' : 'Dado de baja'}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <p className="detail-section-title">General</p>
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-label">Fecha de compra</span>
                  <span className="detail-value">{activo.fechaCompra}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Coste</span>
                  <span className="detail-value">{activo.coste} €</span>
                </div>
              </div>
            </div>

            {activo.tipoFiscal === 'A' && (
              <div className="detail-section">
                <p className="detail-section-title">Desglose de IVA</p>
                <div className="detail-rows">
                  <div className="detail-row">
                    <span className="detail-label">Base imponible</span>
                    <span className="detail-value">{activo.baseImponible} €</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">IVA ({activo.ivaPercent}%)</span>
                    <span className="detail-value">{activo.importeIva} €</span>
                  </div>
                  <div className="detail-row detail-row-total">
                    <span className="detail-label">Total</span>
                    <span className="detail-value">{activo.coste} €</span>
                  </div>
                </div>
              </div>
            )}

            <div className="detail-section">
              <p className="detail-section-title">Amortización</p>
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-label">Vida útil</span>
                  <span className="detail-value">{activo.vidaUtilAnios} años</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Valor residual</span>
                  <span className="detail-value">{activo.valorResidual} €</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Amortización acumulada</span>
                  <span className="detail-value">{activo.amortizacionAcumulada} €</span>
                </div>
                <div className="detail-row detail-row-total">
                  <span className="detail-label">Valor neto contable</span>
                  <span className="detail-value">{activo.valorNetoContable} €</span>
                </div>
                {activo.ultimaAmortizacionRegistradaEn && (
                  <div className="detail-row">
                    <span className="detail-label">Última puesta al día</span>
                    <span className="detail-value">{activo.ultimaAmortizacionRegistradaEn}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-footer">
              <button type="button" className="crud-link-btn" onClick={abrirEditar}>
                Editar
              </button>
              <button type="button" className="crud-link-btn" onClick={handleToggleActivo}>
                {activo.activo ? 'Dar de baja' : 'Reactivar'}
              </button>
              {!amortizado && (
                <button type="button" className="crud-delete-btn" onClick={handleEliminar}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
