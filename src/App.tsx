import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeToggle } from './theme/ThemeToggle';
import { useTheme } from './theme/useTheme';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { WelcomePage } from './pages/WelcomePage';
import { UsuariosPage } from './pages/UsuariosPage';
import { PlazasPage } from './pages/PlazasPage';
import { PlazaDetailPage } from './pages/PlazaDetailPage';
import { FechaDetailPage } from './pages/FechaDetailPage';
import { TesoreriaPage } from './pages/TesoreriaPage';
import { CuentaDetailPage } from './pages/CuentaDetailPage';
import { GastosPage } from './pages/GastosPage';
import { GastoDetailPage } from './pages/GastoDetailPage';
import { CategoriasGastoPage } from './pages/CategoriasGastoPage';
import { PersonalPage } from './pages/PersonalPage';
import { EmpleadoDetailPage } from './pages/EmpleadoDetailPage';
import { StockPage } from './pages/StockPage';
import { StockDetailPage } from './pages/StockDetailPage';
import { VentasPage } from './pages/VentasPage';
import { ContratosPage } from './pages/ContratosPage';
import { ContratoDetailPage } from './pages/ContratoDetailPage';
import { TaquillaPage } from './pages/TaquillaPage';
import { TaquillaPlazaPage } from './pages/TaquillaPlazaPage';
import { TaquillaFechaPage } from './pages/TaquillaFechaPage';
import { TaquillaPasePage } from './pages/TaquillaPasePage';
import { TiposEntradaPage } from './pages/TiposEntradaPage';
import { BarPage } from './pages/BarPage';
import { BarPlazaPage } from './pages/BarPlazaPage';
import { BarFechaPage } from './pages/BarFechaPage';
import { BarPasePage } from './pages/BarPasePage';
import { BarRegistrarVentaPage } from './pages/BarRegistrarVentaPage';
import { ActivosPage } from './pages/ActivosPage';
import { CategoriasActivoPage } from './pages/CategoriasActivoPage';
import { ActivoDetailPage } from './pages/ActivoDetailPage';
import { AnalisisPage } from './pages/AnalisisPage';
import { AnalisisPlazasPage } from './pages/AnalisisPlazasPage';
import { AnalisisPlazaDetailPage } from './pages/AnalisisPlazaDetailPage';
import { AnalisisActivosPage } from './pages/AnalisisActivosPage';
import { AnalisisFlujoCajaPage } from './pages/AnalisisFlujoCajaPage';
import { ContabilidadPage } from './pages/ContabilidadPage';
import { LibroDiarioPage } from './pages/LibroDiarioPage';
import { LibroMayorPage } from './pages/LibroMayorPage';
import { LibroMayorDetailPage } from './pages/LibroMayorDetailPage';
import { PygPage } from './pages/PygPage';
import { BalancePage } from './pages/BalancePage';
import { PlazasWebPage } from './pages/PlazasWebPage';
import { PlazaWebDetailPage } from './pages/PlazaWebDetailPage';

function LoginRoute() {
  const { accessToken, login } = useAuth();
  if (accessToken) return <Navigate to="/" replace />;
  return <LoginPage onLoginSuccess={login} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<WelcomePage />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/plazas" element={<PlazasPage />} />
        <Route path="/plazas/:plazaId" element={<PlazaDetailPage />} />
        <Route path="/fechas/:fechaId" element={<FechaDetailPage />} />
        <Route path="/tesoreria" element={<TesoreriaPage />} />
        <Route path="/tesoreria/:cuentaId" element={<CuentaDetailPage />} />
        <Route path="/gastos" element={<GastosPage />} />
        <Route path="/gastos/categorias" element={<CategoriasGastoPage />} />
        <Route path="/gastos/:gastoId" element={<GastoDetailPage />} />
        <Route path="/personal" element={<PersonalPage />} />
        <Route path="/personal/:empleadoId" element={<EmpleadoDetailPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/stock/:productoId" element={<StockDetailPage />} />
        <Route path="/ventas/contratos" element={<ContratosPage />} />
        <Route path="/ventas/contratos/:contratoId" element={<ContratoDetailPage />} />
        <Route path="/activos" element={<ActivosPage />} />
        <Route path="/activos/categorias" element={<CategoriasActivoPage />} />
        <Route path="/activos/:activoId" element={<ActivoDetailPage />} />
        <Route path="/analisis" element={<AnalisisPage />} />
        <Route path="/analisis/plazas" element={<AnalisisPlazasPage />} />
        <Route path="/analisis/plazas/:plazaId" element={<AnalisisPlazaDetailPage />} />
        <Route path="/analisis/activos" element={<AnalisisActivosPage />} />
        <Route path="/analisis/flujo-caja" element={<AnalisisFlujoCajaPage />} />
        <Route path="/contabilidad" element={<ContabilidadPage />} />
        <Route path="/contabilidad/diario" element={<LibroDiarioPage />} />
        <Route path="/contabilidad/mayor" element={<LibroMayorPage />} />
        <Route path="/contabilidad/mayor/:cuentaId" element={<LibroMayorDetailPage />} />
        <Route path="/contabilidad/pyg" element={<PygPage />} />
        <Route path="/contabilidad/balance" element={<BalancePage />} />
        <Route path="/plazas-web" element={<PlazasWebPage />} />
        <Route path="/plazas-web/:plazaWebId" element={<PlazaWebDetailPage />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole={['ADMIN', 'OPERADOR']} />}>
        <Route path="/ventas" element={<VentasPage />} />
        <Route path="/ventas/taquilla" element={<TaquillaPage />} />
        <Route path="/ventas/taquilla/tipos" element={<TiposEntradaPage />} />
        <Route path="/ventas/taquilla/plazas/:plazaId" element={<TaquillaPlazaPage />} />
        <Route path="/ventas/taquilla/fechas/:fechaId" element={<TaquillaFechaPage />} />
        <Route path="/ventas/taquilla/pases/:paseId" element={<TaquillaPasePage />} />
        <Route path="/ventas/bar" element={<BarPage />} />
        <Route path="/ventas/bar/plazas/:plazaId" element={<BarPlazaPage />} />
        <Route path="/ventas/bar/fechas/:fechaId" element={<BarFechaPage />} />
        <Route path="/ventas/bar/pases/:paseId" element={<BarPasePage />} />
        <Route path="/ventas/bar/pases/:paseId/registrar" element={<BarRegistrarVentaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
