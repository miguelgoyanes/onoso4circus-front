import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { decodeJwt, type JwtPayload } from '../api/auth';

const TOKEN_KEY = 'onoso4circus-token';

interface AuthContextValue {
  accessToken: string | null;
  user: JwtPayload | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );

  const user = useMemo<JwtPayload | null>(() => {
    if (!accessToken) return null;
    try {
      return decodeJwt(accessToken);
    } catch {
      return null;
    }
  }, [accessToken]);

  function login(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    setAccessToken(token);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
  }

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
