import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import {
  crearFamiliaElaborado,
  desvincularInsumo,
  listarFamiliasElaborado,
  listarInsumosDeFamilia,
  vincularInsumo,
  type FamiliaElaborado,
  type Producto,
  type VinculacionInsumo,
} from '../api/stock';

// Gestión de familias de elaborados (ej. "Palomitas") y qué insumos (maíz, aceite, sal) tiene
// vinculados cada una — los ELABORADO (pequeña/grande) se crean luego en el formulario normal
// de producto eligiendo la familia y su factor de equivalencia.
export function FamiliasElaboradoPanel({
  productos,
  onFamiliasChange,
}: {
  productos: Producto[];
  // El desplegable de familia en "Crear producto" (StockPage) vive en otro componente con su
  // propio estado — sin esto, crear una familia aquí no la haría aparecer allí hasta recargar.
  onFamiliasChange?: () => void;
}) {
  const { accessToken, logout } = useAuth();
  const insumos = productos.filter((p) => p.tipo === 'INSUMO');

  const [familias, setFamilias] = useState<FamiliaElaborado[] | null>(null);
  const [insumosPorFamilia, setInsumosPorFamilia] = useState<Record<string, VinculacionInsumo[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [nombreNuevaFamilia, setNombreNuevaFamilia] = useState('');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Record<string, string>>({});

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
      const lista = await listarFamiliasElaborado(accessToken);
      setFamilias(lista);
      const entradas = await Promise.all(
        lista.map(async (f) => [f.id, await listarInsumosDeFamilia(accessToken, f.id)] as const),
      );
      setInsumosPorFamilia(Object.fromEntries(entradas));
    } catch (err) {
      handleApiError(err);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleCrearFamilia(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !nombreNuevaFamilia.trim()) return;
    setError(null);
    try {
      await crearFamiliaElaborado(accessToken, nombreNuevaFamilia.trim());
      setNombreNuevaFamilia('');
      await cargar();
      onFamiliasChange?.();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleVincular(familiaId: string) {
    const insumoId = insumoSeleccionado[familiaId];
    if (!accessToken || !insumoId) return;
    setError(null);
    try {
      await vincularInsumo(accessToken, familiaId, insumoId);
      setInsumoSeleccionado((prev) => ({ ...prev, [familiaId]: '' }));
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleDesvincular(vinculacionId: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await desvincularInsumo(accessToken, vinculacionId);
      await cargar();
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div>
      {error && <p className="crud-error">{error}</p>}

      <form className="crud-form-row" onSubmit={handleCrearFamilia} style={{ marginBottom: 'var(--space-3)' }}>
        <label className="crud-field">
          <span>Nueva familia (ej. Palomitas)</span>
          <input value={nombreNuevaFamilia} onChange={(e) => setNombreNuevaFamilia(e.target.value)} />
        </label>
        <button type="submit" className="crud-btn-primary" style={{ alignSelf: 'flex-end' }}>
          Crear familia
        </button>
      </form>

      {familias === null && <p className="crud-empty">Cargando…</p>}
      {familias?.length === 0 && <p className="crud-empty">Todavía no hay familias de elaborados.</p>}

      <div className="crud-list">
        {familias?.map((familia) => {
          const vinculados = insumosPorFamilia[familia.id] ?? [];
          const vinculadosIds = new Set(vinculados.map((v) => v.insumoId));
          const disponibles = insumos.filter((i) => !vinculadosIds.has(i.id));
          return (
            <div key={familia.id} className="crud-card">
              <div className="crud-card-info">
                <div className="crud-card-title">{familia.nombre}</div>
                <div className="crud-card-meta">
                  {vinculados.length === 0 && <span className="badge badge-muted">Sin insumos vinculados</span>}
                  {vinculados.map((v) => (
                    <span key={v.id} className="badge">
                      {v.insumoNombre}{' '}
                      <button
                        type="button"
                        onClick={() => handleDesvincular(v.id)}
                        aria-label={`Quitar ${v.insumoNombre}`}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: '0.25rem' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {disponibles.length > 0 && (
                  <div className="crud-form-row" style={{ marginTop: 'var(--space-2)' }}>
                    <select
                      value={insumoSeleccionado[familia.id] ?? ''}
                      onChange={(e) => setInsumoSeleccionado((prev) => ({ ...prev, [familia.id]: e.target.value }))}
                    >
                      <option value="">Vincular insumo…</option>
                      {disponibles.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="crud-link-btn" onClick={() => handleVincular(familia.id)}>
                      Vincular
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
