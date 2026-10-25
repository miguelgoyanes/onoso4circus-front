import type { ImportInvitadoBoda } from '../../api/boda';

// Importación de invitados de la boda desde un CSV (el que se guarda con Excel, Google Sheets o Numbers).
// La primera fila son los nombres de las columnas; el orden da igual y no distingue mayúsculas ni tildes:
//   grupo · nombre · apellidos · telefono · acompanantes · sin_nombre · tratamiento · notas
// Solo "grupo" y "nombre" son obligatorias. "acompanantes" son los nombres conocidos de las otras personas de la
// invitación, separados por | ("Marta|Lucía"); "sin_nombre" es cuántas más vienen sin saber su nombre (la
// pareja, los hijos…). "tratamiento" es cómo se nombra la invitación ("Yago y familia").

export const COLUMNAS_CSV = [
  'grupo',
  'nombre',
  'apellidos',
  'telefono',
  'acompanantes',
  'sin_nombre',
  'tratamiento',
  'notas',
] as const;
type Columna = (typeof COLUMNAS_CSV)[number];

// Otros nombres con los que puede venir cada columna.
const ALIAS: Record<string, Columna> = {
  telefono: 'telefono',
  movil: 'telefono',
  acompanantes: 'acompanantes',
  sin_nombre: 'sin_nombre',
  plazas_sin_nombre: 'sin_nombre',
  mas: 'sin_nombre',
  notas: 'notas',
  notas_internas: 'notas',
};

export interface ResultadoCsv {
  items: ImportInvitadoBoda[];
  errores: string[];
  personas: number;
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

// Excel en español guarda el CSV con ";" y el resto suele usar ",": se elige el que más aparece en la cabecera.
function separador(texto: string): string {
  const cabecera = texto.slice(0, texto.search(/\r?\n|$/));
  const contar = (c: string) => cabecera.split(c).length - 1;
  return [';', ',', '\t'].reduce((mejor, c) => (contar(c) > contar(mejor) ? c : mejor), ';');
}

// Filas del CSV respetando las comillas (un campo entre comillas puede llevar el separador o saltos de línea).
function filas(texto: string, sep: string): string[][] {
  const resultado: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        comillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      comillas = true;
    } else if (c === sep) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      resultado.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo || fila.length) {
    fila.push(campo);
    resultado.push(fila);
  }
  return resultado;
}

export function leerCsvInvitados(texto: string): ResultadoCsv {
  const limpio = texto.replace(/^﻿/, '');
  const [cabecera, ...resto] = filas(limpio, separador(limpio));
  const errores: string[] = [];
  const items: ImportInvitadoBoda[] = [];
  let personas = 0;
  if (!cabecera) return { items, errores: ['El archivo está vacío.'], personas };

  const indice = new Map<Columna, number>();
  cabecera.forEach((nombre, i) => {
    const n = normalizar(nombre);
    const columna = ALIAS[n] ?? (COLUMNAS_CSV as readonly string[]).find((c) => c === n);
    if (columna && !indice.has(columna as Columna)) indice.set(columna as Columna, i);
  });
  if (!indice.has('grupo') || !indice.has('nombre')) {
    return {
      items,
      errores: ['La primera fila tiene que llevar los nombres de las columnas, al menos "grupo" y "nombre".'],
      personas,
    };
  }

  resto.forEach((celdas, i) => {
    const valor = (c: Columna) => (indice.has(c) ? (celdas[indice.get(c)!] ?? '').trim() : '');
    if (celdas.every((c) => !c.trim())) return;
    const linea = i + 2;
    const grupo = valor('grupo');
    const nombre = valor('nombre');
    if (!grupo || !nombre) {
      errores.push(`Fila ${linea}: falta ${!grupo ? 'el grupo' : 'el nombre'}.`);
      return;
    }
    const sinNombreTexto = valor('sin_nombre').replace(/^\+/, '');
    const sinNombre = sinNombreTexto ? Number(sinNombreTexto) : 0;
    if (!Number.isInteger(sinNombre) || sinNombre < 0 || sinNombre > 20) {
      errores.push(`Fila ${linea}: "sin_nombre" tiene que ser un número (0, 1, 2…).`);
      return;
    }
    const conocidos = valor('acompanantes')
      .split('|')
      .map((n) => n.trim())
      .filter(Boolean);
    // "?" es como el back office marca una plaza sin nombre.
    const acompanantes = [...conocidos, ...Array<string>(sinNombre).fill('?')];
    const tratamiento = valor('tratamiento');
    const notas = valor('notas');
    items.push({
      grupo,
      nombre,
      apellidos: valor('apellidos'),
      telefono: valor('telefono') || null,
      ...(tratamiento ? { tratamiento } : {}),
      ...(notas ? { notasInternas: notas } : {}),
      ...(acompanantes.length > 0 ? { acompanantes } : {}),
    });
    personas += 1 + acompanantes.length;
  });
  return { items, errores, personas };
}

// El CSV puede venir en UTF-8 (Google Sheets, "CSV UTF-8" de Excel) o en Windows-1252 (el "CSV" de Excel de
// siempre): si no es UTF-8 válido se lee como Windows-1252 para que las tildes salgan bien.
export async function leerArchivoCsv(archivo: File): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

// Plantilla para rellenar: cabecera y un par de ejemplos, con ";" y BOM para que Excel la abra bien.
export function plantillaCsv(): string {
  const ejemplos = [
    ['Amigos de Fátima', 'Noelia', '', '600112233', '', '1', '', 'Viene con su pareja'],
    ['Familia de Brandan', 'Yago', '', '', '', '3', 'Yago y familia', 'Pareja e hijos'],
  ];
  return '﻿' + [COLUMNAS_CSV, ...ejemplos].map((f) => f.join(';')).join('\r\n') + '\r\n';
}
