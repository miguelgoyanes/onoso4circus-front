import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { crearPlazaWeb, listarPlazasWeb, subirCartelPlazaWeb, type PlazaWeb, type TipoVenta } from '../api/plazas-web';
import { listarPlazas, type Plaza } from '../api/plazas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Modal } from '../components/Modal';
import { ImagenPicker, urlImagen } from '../components/ImagenPicker';
import '../styles/crud-page.css';

const TIPOS_VENTA: TipoVenta[] = ['ONLINE', 'PRESENCIAL', 'AMBOS'];

export function PlazasWebPage() {
  const { accessToken, logout } = useAuth();
  const [plazasWeb, setPlazasWeb] = useState<PlazaWeb[] | null>(null);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showCrear, setShowCrear] = useState(false);
  const [ciudad, setCiudad] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [entradasUrl, setEntradasUrl] = useState('');
  const [venta, setVenta] = useState<TipoVenta>('AMBOS');
  const [horasAntes, setHorasAntes] = useState('');
  const [vincularPlaza, setVincularPlaza] = useState(false);
  const [plazaId, setPlazaId] = useState('');
  const [crearCartelFile, setCrearCartelFile] = useState<File | null>(null);
  const [crearCartelPreview, setCrearCartelPreview] = useState<string | null>(null);
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
      const [plazasWebData, plazasData] = await Promise.all([
        listarPlazasWeb(accessToken),
        listarPlazas(accessToken),
      ]);
      setPlazasWeb(plazasWebData);
      setPlazas(plazasData);
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function abrirCrear() {
    setCiudad('');
    setUbicacion('');
    setMapsUrl('');
    setDescripcion('');
    setEntradasUrl('');
    setVenta('AMBOS');
    setHorasAntes('');
    setVincularPlaza(false);
    setPlazaId('');
    setCrearCartelFile(null);
    setCrearCartelPreview(null);
    setShowCrear(true);
  }

  async function handleCrear(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setGuardando(true);
    try {
      const plazaWeb = await crearPlazaWeb(accessToken, {
        ciudad,
        ubicacion,
        mapsUrl,
        descripcion: descripcion || undefined,
        entradasUrl,
        venta,
        horasAntes: horasAntes ? Number(horasAntes) : undefined,
        plazaId: vincularPlaza ? plazaId || undefined : undefined,
      });
      if (crearCartelFile) {
        await subirCartelPlazaWeb(accessToken, plazaWeb.id, crearCartelFile);
      }
      setShowCrear(false);
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
          <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Web pública' }]} />
          <h1>Web pública</h1>
          <p>Plazas y funciones que se muestran en circusnova.es</p>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="crud-toolbar">
          <button type="button" className="crud-btn-primary" onClick={abrirCrear}>
            Crear plaza web
          </button>
        </div>

        <Modal open={showCrear} onClose={() => setShowCrear(false)} title="Crear plaza web">
          <form className="crud-form" onSubmit={handleCrear}>
            <ImagenPicker
              previewUrl={crearCartelPreview}
              onSelect={(file) => {
                setCrearCartelFile(file);
                setCrearCartelPreview(URL.createObjectURL(file));
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
              <button type="button" className="crud-form-cancel" onClick={() => setShowCrear(false)}>
                Cancelar
              </button>
              <button type="submit" className="crud-btn-primary" disabled={guardando}>
                {guardando ? 'Creando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        <div className="crud-list">
          {plazasWeb === null && <p className="crud-empty">Cargando…</p>}
          {plazasWeb?.length === 0 && <p className="crud-empty">No hay plazas web todavía.</p>}
          {plazasWeb?.map((p) => (
            <Link key={p.id} to={`/plazas-web/${p.id}`} className="crud-card crud-card-title-link" style={{ display: 'block' }}>
              <div className="crud-card-row">
                {urlImagen(p.cartelUrl) ? (
                  <img src={urlImagen(p.cartelUrl)!} alt="" className="crud-card-thumb" />
                ) : (
                  <div className="crud-card-thumb-placeholder" />
                )}
                <div className="crud-card-info">
                  <div className="crud-card-title">{p.ciudad}</div>
                  <div className="crud-card-meta">
                    <span>{p.ubicacion}</span>
                    <span className="badge badge-muted">{p.venta}</span>
                  </div>
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
