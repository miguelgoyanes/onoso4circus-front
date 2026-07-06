const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface LoginResponse {
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
  iat: number;
  exp: number;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body: { message?: string } | null = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo iniciar sesión');
  }

  return response.json();
}

export function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(normalized));
}
