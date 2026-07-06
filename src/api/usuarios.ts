import { apiFetch } from './client';

export type Rol = 'ADMIN' | 'OPERADOR';

export interface UsuarioPublico {
  id: string;
  nombre: string;
  username: string;
  rol: Rol | 'OWNER';
  activo: boolean;
}

export interface CrearUsuarioInput {
  nombre: string;
  username: string;
  password: string;
  rol: Rol;
}

export function listarUsuarios(token: string): Promise<UsuarioPublico[]> {
  return apiFetch<UsuarioPublico[]>('/usuarios', token);
}

export function crearUsuario(token: string, data: CrearUsuarioInput): Promise<UsuarioPublico> {
  return apiFetch<UsuarioPublico>('/usuarios', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function desactivarUsuario(token: string, id: string): Promise<UsuarioPublico> {
  return apiFetch<UsuarioPublico>(`/usuarios/${id}/desactivar`, token, { method: 'PATCH' });
}

export function activarUsuario(token: string, id: string): Promise<UsuarioPublico> {
  return apiFetch<UsuarioPublico>(`/usuarios/${id}/activar`, token, { method: 'PATCH' });
}

export function cambiarRolUsuario(token: string, id: string, rol: Rol): Promise<UsuarioPublico> {
  return apiFetch<UsuarioPublico>(`/usuarios/${id}/rol`, token, {
    method: 'PATCH',
    body: JSON.stringify({ rol }),
  });
}

export function resetearPasswordUsuario(
  token: string,
  id: string,
  password: string,
): Promise<UsuarioPublico> {
  return apiFetch<UsuarioPublico>(`/usuarios/${id}/resetear-password`, token, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });
}
