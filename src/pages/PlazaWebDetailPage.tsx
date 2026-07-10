import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  actualizarFuncionWeb,
  actualizarPlazaWeb,
  crearFuncionWeb,
  eliminarFuncionWeb,
  eliminarPlazaWeb,
  listarFuncionesWeb,
  obtenerPlazaWeb,
  subirCartelPlazaWeb,
  type FuncionWeb,
  type PlazaWeb,
  type TipoVenta,
} from '../api/plazas-web';
import { listarPlazas, type Plaza } from '../api/plazas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import { ImagenPicker, urlImagen } from '../components/ImagenPicker';
import '../styles/crud-page.css';

const TIPOS_VENTA: TipoVenta[] = ['ONLINE', 'PRESENCIAL', 'AMBOS'];

function horariosATexto(horarios: string[]): string {
  return horarios.join(', ');
}

function textoAHorarios(texto: string): string[] {
  return texto
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
}

export function PlazaWebDetailPage() {
  const { plazaWebId } = useParams<{ plazaWebId: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();

  const [plazaWeb, setPlazaWeb] = useState<PlazaWeb | null>(null);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [funciones, setFunciones] = useState<FuncionWeb[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [ciudad, setCiudad] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [entradasUrl, setEntradasUrl] = useState('');
  const [venta, setVenta] = useState<TipoVenta>('AMBOS');
  const [horasAntes, setHorasAntes] = useState('');
  const [vincularPlaza, setVincularPlaza] = useState(false);
  const [plazaId, setPlazaId] = useState('');
  const [cartelFile, setCartelFile] = useState<File | null>(null);
  const [cartelPreview, setCartelPreview] = useState<string | null>(null);

  const [showFuncion, setShowFuncion] = useState(false);
  const [fecha, setFecha] = useState('');
  const [horarios, setHorarios] = useState('');
  const [conOferta, setConOferta] = useState(false);
  const [descuento, setDescuento] = useState('');
  const [descuentoDescripcion, setDescuentoDescripcion] = useState('');

  const [editandoFuncionId, setEditandoFuncionId] = useState<string | null>(null);
  const [efFecha, setEfFecha] = useState('');
  const [efHorarios, setEfHorarios] = useState('');
  const [efConOferta, setEfConOferta] = useState(false);
  const [efDescuento, setEfDescuento] = useState('');
  const [efDescuentoDescripcion, setEfDescuentoDescripcion] = useState('');

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
    if (!accessToken || !plazaWebId) return;
    try {
      const [p, plazasData, funcionesData] = await Promise.all([
        obtenerPlazaWeb(accessToken, plazaWebId),
        listarPlazas(accessToken),
        listarFuncionesWeb(accessToken, plazaWebId),
      ]);
      setPlazaWeb(p);
      setPlazas(plazasData);
      setFunciones(funcionesData);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, plazaWebId]);

  function abrirEditar() {
    if (!plazaWeb) return;
    setCiudad(plazaWeb.ciudad);
    setUbicacion(plazaWeb.ubicacion);
    setMapsUrl(plazaWeb.mapsUrl);
    setDescripcion(plazaWeb.descripcion ?? '');
    setEntradasUrl(plazaWeb.entradasUrl);
    setVenta(plazaWeb.venta);
    setHorasAntes(plazaWeb.horasAntes !== null ? String(plazaWeb.horasAntes) : '');
    setVincularPlaza(plazaWeb.plazaId !== null);
    setPlazaId(plazaWeb.plazaId ?? '');
    setCartelFile(null);
    setCartelPreview(urlImagen(plazaWeb.cartelUrl));
    setEditando(true);
  }

  async function handleActualizar(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !plazaWebId) return;
    setError(null);
    try {
      await actualizarPlazaWeb(accessToken, plazaWebId, {
        ciudad,
        ubicacion,
        mapsUrl,
        descripcion: descripcion || undefined,
        entradasUrl,
        venta,
        horasAntes: horasAntes ? Number(horasAntes) : undefined,
        plazaId: vincularPlaza ? plazaId || undefined : undefined,
      });
      if (cartelFile) {
        await subirCartelPlazaWeb(accessToken, plazaWebId, cartelFile);
      }
      setEditando(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminar() {
    if (!accessToken || !plazaWebId) return;
    setError(null);
    try {
      await eliminarPlazaWeb(accessToken, plazaWebId);
      navigate('/plazas-web');
    } catch (err) {
      handleApiError(err);
    }
  }

  function abrirCrearFuncion() {
    setFecha('');
    setHorarios('');
    setConOferta(false);
    setDescuento('');
    setDescuentoDescripcion('');
    setShowFuncion(true);
  }

  async function handleCrearFuncion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !plazaWebId) return;
    setError(null);
    try {
      await crearFuncionWeb(accessToken, plazaWebId, {
        fecha,
        horarios: textoAHorarios(horarios),
        oferta: conOferta ? { descuento: Number(descuento), descripcion: descuentoDescripcion || undefined } : undefined,
      });
      setShowFuncion(false);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  function abrirEditarFuncion(f: FuncionWeb) {
    setEditandoFuncionId(f.id);
    setEfFecha(f.fecha);
    setEfHorarios(horariosATexto(f.horarios));
    setEfConOferta(f.descuento !== null);
    setEfDescuento(f.descuento !== null ? String(f.descuento) : '');
    setEfDescuentoDescripcion(f.descuentoDescripcion ?? '');
  }

  async function handleActualizarFuncion(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !editandoFuncionId) return;
    setError(null);
    try {
      await actualizarFuncionWeb(accessToken, editandoFuncionId, {
        fecha: efFecha,
        horarios: textoAHorarios(efHorarios),
        oferta: efConOferta
          ? { descuento: Number(efDescuento), descripcion: efDescuentoDescripcion || undefined }
          : undefined,
      });
      setEditandoFuncionId(null);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleEliminarFuncion(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await eliminarFuncionWeb(accessToken, id);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  const plazaVinculada = plazaWeb?.plazaId ? plazas.find((p) => p.id === plazaWeb.plazaId) : undefined;

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Web pública', to: '/plazas-web' },
              { label: plazaWeb?.ciudad ?? '…' },
            ]}
          />
          <h1>{plazaWeb?.ciudad ?? 'Plaza web'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        {plazaWeb && (
          <div className="detail-card">
            <div className="detail-hero">
              {urlImagen(plazaWeb.cartelUrl) && (
                <img
                  src={urlImagen(plazaWeb.cartelUrl)!}
                  alt=""
                  style={{ width: '100%', maxWidth: 280, borderRadius: 'var(--radius)', margin: '0 auto var(--space-3)' }}
                />
              )}
              <div className="detail-hero-meta">
                <span className="badge badge-muted">{plazaWeb.venta}</span>
                {plazaWeb.horasAntes !== null && (
                  <span className="badge badge-muted">{plazaWeb.horasAntes}h antes en taquilla</span>
                )}
                {plazaVinculada && <span className="badge">Vinculada a {plazaVinculada.nombre}</span>}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-rows">
                <div className="detail-row">
                  <span className="detail-label">Ubicación</span>
                  <span className="detail-value">{plazaWeb.ubicacion}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Maps</span>
                  <a href={plazaWeb.mapsUrl} target="_blank" rel="noreferrer">
                    Ver enlace
                  </a>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Entradas</span>
                  <a href={plazaWeb.entradasUrl} target="_blank" rel="noreferrer">
                    Ver enlace
                  </a>
                </div>
                {plazaWeb.descripcion && (
                  <div className="detail-row">
                    <span className="detail-label">Descripción</span>
                    <span className="detail-value">{plazaWeb.descripcion}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-footer">
              <button type="button" className="crud-link-btn" onClick={abrirEditar}>
                Editar
              </button>
              <button type="button" className="crud-delete-btn" onClick={handleEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        )}

        <Modal open={editando} onClose={() => setEditando(false)} title="Editar plaza web">
          <form className="crud-form" onSubmit={handleActualizar}>
            <ImagenPicker
              previewUrl={cartelPreview}
              onSelect={(file) => {
                setCartelFile(file);
                setCartelPreview(URL.createObjectURL(file));
              }}
            />
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Ciudad</span>
                <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Ubicación</span>
                <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} required />
              </label>
            </div>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Enlace de Google Maps</span>
                <input type="url" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Enlace de venta de entradas</span>
                <input type="url" value={entradasUrl} onChange={(e) => setEntradasUrl(e.target.value)} required />
              </label>
            </div>
            <label className="crud-field">
              <span>Descripción (opcional)</span>
              <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </label>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Venta</span>
                <select value={venta} onChange={(e) => setVenta(e.target.value as TipoVenta)}>
                  {TIPOS_VENTA.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              {venta !== 'ONLINE' && (
                <label className="crud-field">
                  <span>Horas antes (venta en taquilla)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={horasAntes}
                    onChange={(e) => setHorasAntes(e.target.value)}
                  />
                </label>
              )}
            </div>

            <div className="crud-form-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={vincularPlaza} onChange={(e) => setVincularPlaza(e.target.checked)} />
                <span>Vincular a una plaza (opcional)</span>
              </label>
              {vincularPlaza && (
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
              )}
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

        <div className="crud-header-row">
          <h2>Funciones</h2>
          <button type="button" className="crud-btn-primary" onClick={abrirCrearFuncion}>
            Crear función
          </button>
        </div>

        <Modal open={showFuncion} onClose={() => setShowFuncion(false)} title="Crear función">
          <form className="crud-form" onSubmit={handleCrearFuncion}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha</span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Horarios (separados por comas)</span>
                <input value={horarios} onChange={(e) => setHorarios(e.target.value)} placeholder="21:00" required />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={conOferta} onChange={(e) => setConOferta(e.target.checked)} />
              <span>Con oferta (opcional)</span>
            </label>
            {conOferta && (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Descuento (%)</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                    required
                  />
                </label>
                <label className="crud-field">
                  <span>Descripción (opcional)</span>
                  <input value={descuentoDescripcion} onChange={(e) => setDescuentoDescripcion(e.target.value)} />
                </label>
              </div>
            )}
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setShowFuncion(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>

        <Modal open={editandoFuncionId !== null} onClose={() => setEditandoFuncionId(null)} title="Editar función">
          <form className="crud-form" onSubmit={handleActualizarFuncion}>
            <div className="crud-form-row">
              <label className="crud-field">
                <span>Fecha</span>
                <input type="date" value={efFecha} onChange={(e) => setEfFecha(e.target.value)} required />
              </label>
              <label className="crud-field">
                <span>Horarios (separados por comas)</span>
                <input value={efHorarios} onChange={(e) => setEfHorarios(e.target.value)} required />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={efConOferta} onChange={(e) => setEfConOferta(e.target.checked)} />
              <span>Con oferta (opcional)</span>
            </label>
            {efConOferta && (
              <div className="crud-form-row">
                <label className="crud-field">
                  <span>Descuento (%)</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={efDescuento}
                    onChange={(e) => setEfDescuento(e.target.value)}
                    required
                  />
                </label>
                <label className="crud-field">
                  <span>Descripción (opcional)</span>
                  <input value={efDescuentoDescripcion} onChange={(e) => setEfDescuentoDescripcion(e.target.value)} />
                </label>
              </div>
            )}
            <div className="crud-form-actions">
              <button type="button" className="crud-form-cancel" onClick={() => setEditandoFuncionId(null)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>

        <div className="crud-list">
          {funciones === null && <p className="crud-empty">Cargando…</p>}
          {funciones?.length === 0 && <p className="crud-empty">No hay funciones todavía.</p>}
          {funciones?.map((f) => (
            <div key={f.id} className="crud-card">
              <div className="crud-card-row">
                <div className="crud-card-info">
                  <div className="crud-card-title">{f.fecha}</div>
                  <div className="crud-card-meta">
                    <span>{f.horarios.join(', ')}</span>
                    {f.descuento !== null && <span className="badge badge-danger">-{f.descuento}%</span>}
                  </div>
                </div>
                <div className="crud-card-actions">
                  <button type="button" className="crud-link-btn" onClick={() => abrirEditarFuncion(f)}>
                    Editar
                  </button>
                  <button type="button" className="crud-delete-btn" onClick={() => handleEliminarFuncion(f.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
