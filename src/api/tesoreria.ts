import { apiFetch } from './client';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface CuentaPublica {
  id: string;
  nombre: string;
  code: string;
  type: AccountType;
  esCuentaDeDinero: boolean;
  saldo?: string;
}

export interface CrearCuentaInput {
  nombre: string;
  code: string;
  type: AccountType;
  esCuentaDeDinero: boolean;
}

export function listarCuentas(token: string): Promise<CuentaPublica[]> {
  return apiFetch<CuentaPublica[]>('/tesoreria/cuentas', token);
}

export function crearCuenta(token: string, data: CrearCuentaInput): Promise<CuentaPublica> {
  return apiFetch<CuentaPublica>('/tesoreria/cuentas', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function obtenerPatrimonio(token: string): Promise<{ patrimonio: string }> {
  return apiFetch<{ patrimonio: string }>('/tesoreria/patrimonio', token);
}
