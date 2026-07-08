import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { obtenerEmpleado, type Empleado } from '../api/personal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import '../styles/crud-page.css';

export function EmpleadoDetailPage() {
  const { empleadoId } = useParams<{ empleadoId: string }>();
  const { accessToken, logout } = useAuth();
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (!accessToken || !empleadoId) return;
      try {
        setEmpleado(await obtenerEmpleado(accessToken, empleadoId));
      } catch (err) {
        handleApiError(err);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, empleadoId]);

  return (
    <div className="crud-page">
      <div className="crud-container">
        <div className="crud-header">
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Personal', to: '/personal' },
              { label: empleado?.nombre ?? '…' },
            ]}
          />
          <h1>{empleado?.nombre ?? 'Empleado'}</h1>
        </div>

        {error && <p className="crud-error">{error}</p>}

        {empleado && (
          <div className="crud-card">
            <p>
              {empleado.rol} · <span className="badge">{empleado.regimen}</span>{' '}
              {!empleado.activo && <span className="badge">INACTIVO</span>}
            </p>
            <p className="crud-card-subtitle">
              Importe de referencia al día:{' '}
              {empleado.importeReferenciaDia ? `${empleado.importeReferenciaDia} €` : 'sin definir'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
