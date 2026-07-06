// Espejo de ROLES_EFECTIVOS del backend: el OWNER puede hacer todo lo que
// puede hacer un ADMIN, sin tener que repetir la comprobación en cada sitio.
const ROLES_EFECTIVOS: Record<string, string[]> = {
  OWNER: ['OWNER', 'ADMIN', 'OPERADOR'],
  ADMIN: ['ADMIN'],
  OPERADOR: ['OPERADOR'],
};

export function tieneRol(rolDelUsuario: string, rolRequerido: string): boolean {
  return (ROLES_EFECTIVOS[rolDelUsuario] ?? []).includes(rolRequerido);
}
