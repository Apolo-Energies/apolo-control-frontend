#!/usr/bin/env node
// Falla (exit 1) si los ficheros publicados contienen CUPS, NIF/NIE/CIF o IBAN válidos.
// Uso: node scripts/comprobar-datos-personales.mjs [directorio=dist]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

/** Datos de empresa legítimos (no personales). Añadir aquí solo con justificación. */
const PERMITIDOS = new Map([
  ['B56263304', 'CIF Apolo Business, S.L. (pie de contratos)'],
  ['B75937250', 'CIF Telkes Energy, S.L. (pie de contratos)'],
  ['ES9600495332182210005857', 'IBAN de cobro de Apolo (mensajes de reclamación)'],
]);

/** Binarios que no se revisan; todo lo demás se trata como texto. */
const BINARIOS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot']);
const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

const dniValido = (num, letra) => LETRAS_DNI[Number(num) % 23] === letra;

const nieValido = (pre, num, letra) => dniValido(`${'XYZ'.indexOf(pre)}${num}`, letra);

function cifValido(digitos, control) {
  const suma = [...digitos].reduce((s, d, i) => {
    const n = Number(d);
    return s + (i % 2 === 0 ? Math.floor((n * 2) / 10) + ((n * 2) % 10) : n);
  }, 0);
  const c = (10 - (suma % 10)) % 10;
  return control === String(c) || control === 'JABCDEFGHI'[c];
}

function cupsValido(digitos, control) {
  const r = Number(BigInt(digitos) % 529n);
  return LETRAS_DNI[Math.floor(r / 23)] + LETRAS_DNI[r % 23] === control;
}

function ibanValido(iban) {
  const reordenado = iban.slice(4) + iban.slice(0, 4);
  const numerico = [...reordenado]
    .map((ch) => (/\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55))) // A=10 … Z=35
    .join('');
  return BigInt(numerico) % 97n === 1n;
}

// Sobre texto en mayúsculas. "(?:ES)?" cubre el NIF-IVA.
const DETECTORES = [
  {
    tipo: 'CUPS',
    re: /ES(\d{16})([A-Z]{2})(?:\d[A-Z])?/g,
    valido: (m) => cupsValido(m[1], m[2]),
    valor: (m) => m[0],
  },
  {
    tipo: 'IBAN',
    re: /ES\d{2}(?: ?\d{4}){5}/g,
    valido: (m) => ibanValido(m[0].replace(/ /g, '')),
    valor: (m) => m[0].replace(/ /g, ''),
  },
  {
    tipo: 'DNI',
    re: /(?<![0-9A-Z])(?:ES)?(\d{8})([A-Z])(?![0-9A-Z])/g,
    valido: (m) => dniValido(m[1], m[2]),
    valor: (m) => m[1] + m[2],
  },
  {
    tipo: 'NIE',
    re: /(?<![0-9A-Z])(?:ES)?([XYZ])(\d{7})([A-Z])(?![0-9A-Z])/g,
    valido: (m) => nieValido(m[1], m[2], m[3]),
    valor: (m) => m[1] + m[2] + m[3],
  },
  {
    tipo: 'CIF',
    re: /(?<![0-9A-Z])(?:ES)?([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])(?![0-9A-Z])/g,
    valido: (m) => cifValido(m[2], m[3]),
    valor: (m) => m[1] + m[2] + m[3],
  },
];

/**
 * Variantes que se revisan: texto en mayúsculas con \uXXXX decodificado (datos dentro de frases)
 * y la misma sin espacios ni guiones (formatos partidos como "ES91-2100-…" o "12345678-Z").
 */
function variantes(texto) {
  const base = texto
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .toUpperCase();
  return [base, base.replace(/[\s-]/g, '')];
}

function* ficheros(dir) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) yield* ficheros(ruta);
    else if (!BINARIOS.has(extname(entrada.name).toLowerCase())) yield ruta;
  }
}

/** Solo los 2 primeros y 2 últimos caracteres: el log de CI es público para el equipo. */
const enmascarar = (v) => v.slice(0, 2) + '*'.repeat(Math.max(0, v.length - 4)) + v.slice(-2);

const raiz = process.argv[2] ?? 'dist';
if (!existsSync(raiz)) {
  console.error(`✘ No existe "${raiz}". ¿Se ejecutó el build?`);
  process.exit(1);
}

const hallazgos = new Map(); // clave: fichero + valor real
let revisados = 0;

for (const ruta of ficheros(raiz)) {
  revisados++;
  for (const contenido of variantes(readFileSync(ruta, 'utf8'))) {
    for (const { tipo, re, valido, valor } of DETECTORES) {
      for (const m of contenido.matchAll(re)) {
        const v = valor(m);
        if (valido(m) && !PERMITIDOS.has(v)) {
          hallazgos.set(`${ruta}|${v}`, `${relative(raiz, ruta)}: ${tipo} ${enmascarar(v)}`);
        }
      }
    }
  }
}

if (revisados === 0) {
  console.error(`✘ "${raiz}" está vacío. ¿Se ejecutó el build?`);
  process.exit(1);
}
if (hallazgos.size > 0) {
  console.error(`✘ Datos personales en el paquete publicado (${hallazgos.size}):`);
  hallazgos.forEach((h) => console.error('  ' + h));
  console.error('Si es un dato de empresa legítimo, añádelo a PERMITIDOS con su justificación.');
  process.exit(1);
}
console.log(`✔ Sin CUPS, NIF/NIE/CIF ni IBAN en ${revisados} ficheros de "${raiz}".`);
