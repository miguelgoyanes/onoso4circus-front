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
import { GastosPage } from './pages/GastosPage';
import { PersonalPage } from './pages/PersonalPage';
import { EmpleadoDetailPage } from './pages/EmpleadoDetailPage';

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
        <Route path="/gastos" element={<GastosPage />} />
        <Route path="/personal" element={<PersonalPage />} />
        <Route path="/personal/:empleadoId" element={<EmpleadoDetailPage />} />
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
