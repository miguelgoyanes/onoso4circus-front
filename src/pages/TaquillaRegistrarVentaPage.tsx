import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { crearLoteVentasEntradas, listarTiposEntrada, type TipoEntrada } from '../api/taquilla';
import { listarCuentasCobro, type CuentaCobro } from '../api/tesoreria';
import { obtenerFecha, obtenerPase, obtenerPlaza, type Fecha, type Pase, type Plaza } from '../api/plazas';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { COLOR_POR_DEFECTO, colorTextoLegible } from '../utils/color';
import '../styles/crud-page.css';

export function TaquillaRegistrarVentaPage() {
  const { paseId } = useParams<{ paseId: string }>();
  const { accessToken, logout } = useAuth();
  const [pase, setPase] = useState<Pase | null>(null);
  const [fecha, setFecha] = useState<Fecha | null>(null);
  const [plaza, setPlaza] = useState<Plaza | null>(null);
  const [tiposEntrada, setTiposEntrada] = useState<TipoEntrada[]>([]);
  const [cuentasDeDinero, setCuentasDeDinero] = useState<CuentaCobro[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [paso, setPaso] = useState<'tipos' | 'cuenta'>('tipos');
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [cuentaCobroId, setCuentaCobroId] = useState('');
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

  useEffect(() => {
    async function cargar() {
      if (!accessToken || !paseId) return;
      try {
        const [p, tipos, cuentas] = await Promise.all([
          obtenerPase(accessToken, paseId),
          listarTiposEntrada(accessToken),
          listarCuentasCobro(accessToken),
        ]);
        setPase(p);
        setTiposEntrada(tipos);
        setCuentasDeDinero(cuentas.filter((c) => c.usableEnTaquilla));
        const f = await obtenerFecha(accessToken, p.fechaId);
        setFecha(f);
        setPlaza(await obtenerPlaza(accessToken, f.plazaId));
      } catch (err) {
        handleApiError(err);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, paseId]);

  // La cuenta de cobro viene preseleccionada (la primera de la lista) — quien vende solo
  // tiene que cambiarla si de verdad hace falta, no elegirla cada vez.
  useEffect(() => {
    if (cuentaCobroId || cuentasDeDinero.length === 0) return;
    setCuentaCobroId(cuentasDeDinero[0].id);
  }, [cuentasDeDinero, cuentaCobroId]);

  // Solo presenciales: los tipos "online" son para venta anticipada, no para vender aquí
  // en el momento — mostrarlos solo estorbaría a quien está cobrando rápido en taquilla.
  const tiposVendibles = tiposEntrada
    .filter((t) => t.activo && t.modalidad === 'PRESENCIAL')
    .sort((a, b) => a.orden - b.orden);

  function tocarTipo(id: string) {
    setCarrito((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function quitarUnidad(id: string) {
    setCarrito((prev) => {
      const next = { ...prev };
      if (next[id] <= 1) delete next[id];
      else next[id] -= 1;
      return next;
    });
  }

  const lineasCarrito = Object.entries(carrito)
    .map(([tipoEntradaId, cantidad]) => ({
      tipoEntrada: tiposEntrada.find((t) => t.id === tipoEntradaId),
      tipoEntradaId,
      cantidad,
    }))
    .filter((l): l is { tipoEntrada: TipoEntrada; tipoEntradaId: string; cantidad: number } => !!l.tipoEntrada);

  const total = lineasCarrito.reduce((sum, l) => sum + l.cantidad * Number(l.tipoEntrada.precio), 0);

  function irACuenta() {
    if (lineasCarrito.length === 0) return;
    setPaso('cuenta');
  }

  async function handleConfirmar() {
    if (!accessToken || !paseId || !cuentaCobroId || lineasCarrito.length === 0) return;
    setError(null);
    setGuardando(true);
    try {
      await crearLoteVentasEntradas(
        accessToken,
        paseId,
        lineasCarrito.map((l) => ({
          tipoEntradaId: l.tipoEntradaId,
          cantidad: l.cantidad,
          cuentaCobroId,
          origen: 'FISICA',
        })),
      );
      setCarrito({});
      setPaso('tipos');
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
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Ventas', to: '/ventas' },
              { label: 'Taquilla', to: '/ventas/taquilla' },
              { label: plaza?.nombre ?? '…', to: plaza ? `/ventas/taquilla/plazas/${plaza.id}` : undefined },
              { label: fecha?.fecha ?? '…', to: fecha ? `/ventas/taquilla/fechas/${fecha.id}` : undefined },
              {
                label: pase ? `${pase.hora} ${pase.nombre ?? ''}`.trim() : '…',
                to: paseId ? `/ventas/taquilla/pases/${paseId}` : undefined,
              },
              { label: 'Registrar venta' },
            ]}
          />
          <h1>Registrar venta</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        <div className="bar-total-bar">
          <span>Total</span>
          <span>{total.toFixed(2)} €</span>
        </div>

        {paso === 'tipos' ? (
          <>
            {tiposVendibles.length === 0 && (
              <p className="crud-empty">No hay tipos de entrada presenciales activos. Créalos primero en Tipos de entrada.</p>
            )}
            <div className="bar-producto-grid">
              {tiposVendibles.map((tipo) => {
                const cantidadEnCarrito = carrito[tipo.id] ?? 0;
                const color = tipo.color ?? COLOR_POR_DEFECTO;
                return (
                  <button
                    key={tipo.id}
                    type="button"
                    className="tipo-entrada-tile"
                    style={{ background: color, color: colorTextoLegible(color) }}
                    onClick={() => tocarTipo(tipo.id)}
                  >
                    {cantidadEnCarrito > 0 && <span className="bar-producto-tile-badge">{cantidadEnCarrito}</span>}
                    <span className="tipo-entrada-tile-nombre">{tipo.nombre}</span>
                    <span className="tipo-entrada-tile-precio">{tipo.precio} €</span>
                  </button>
                );
              })}
            </div>

            <div className="crud-form-actions">
              <button type="button" className="crud-btn-primary" onClick={irACuenta} disabled={lineasCarrito.length === 0}>
                Siguiente
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="crud-header-row">
              <h2>Carrito</h2>
            </div>
            <div className="crud-form">
              {lineasCarrito.map((l) => (
                <div key={l.tipoEntradaId} className="bar-carrito-linea">
                  <span>
                    {l.tipoEntrada.nombre} × {l.cantidad}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <strong>{(l.cantidad * Number(l.tipoEntrada.precio)).toFixed(2)} €</strong>
                    <button type="button" className="crud-delete-btn" onClick={() => quitarUnidad(l.tipoEntradaId)}>
                      −
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="crud-header-row">
              <h2>Cuenta de cobro</h2>
            </div>
            <div className="bar-cuenta-grid">
              {cuentasDeDinero.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`bar-cuenta-btn${cuentaCobroId === c.id ? ' bar-cuenta-btn-selected' : ''}`}
                  onClick={() => setCuentaCobroId(c.id)}
                >
                  {c.nombre}
                </button>
              ))}
            </div>

            <div className="crud-form-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="crud-form-cancel" onClick={() => setPaso('tipos')}>
                Volver
              </button>
              <button type="button" className="crud-btn-primary" onClick={handleConfirmar} disabled={!cuentaCobroId || guardando}>
                {guardando ? 'Registrando…' : 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
