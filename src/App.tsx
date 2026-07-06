import { useState } from 'react';
import { ThemeToggle } from './theme/ThemeToggle';
import { useTheme } from './theme/useTheme';
import { LoginPage } from './pages/LoginPage';
import { WelcomePage } from './pages/WelcomePage';

const TOKEN_KEY = 'onoso4circus-token';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );

  function handleLoginSuccess(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    setAccessToken(token);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
  }

  return (
    <>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      {accessToken ? (
        <WelcomePage accessToken={accessToken} onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
