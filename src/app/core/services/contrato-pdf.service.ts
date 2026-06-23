import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

type RGB = [number, number, number];

export interface PdfOfertaTarifa {
  energia_p1?: number | null; energia_p2?: number | null; energia_p3?: number | null;
  energia_p4?: number | null; energia_p5?: number | null; energia_p6?: number | null;
  potencia_p1?: number | null; potencia_p2?: number | null; potencia_p3?: number | null;
  potencia_p4?: number | null; potencia_p5?: number | null; potencia_p6?: number | null;
}

export interface PdfOferta {
  nombre_producto?: string;
  tipo_oferta?: 'FIJO' | 'INDEXADO' | 'PASS_POOL';
  tarifas?: Record<string, PdfOfertaTarifa>;
}

export interface PdfContratoData {
  id_propuesta?: string;
  id_oferta?: string;
  numero_oferta?: string;
  fecha_contrato?: string;
  ciudad?: string;
  nombre_cliente?: string;
  cif?: string;
  cnae?: string;
  telefono?: string;
  correo?: string;
  representante_legal?: string;
  direccion_fiscal?: string;
  municipio_fiscal?: string;
  provincia_fiscal?: string;
  cp_fiscal?: string;
  cups?: string[];
  tarifa?: string;
  direccion_suministro?: string;
  direccion?: string;
  municipio?: string;
  provincia?: string;
  cp?: string;
  codigo_postal?: string;
  consumo_p1?: number | null; consumo_p2?: number | null; consumo_p3?: number | null;
  consumo_p4?: number | null; consumo_p5?: number | null; consumo_p6?: number | null;
  potencia_p1?: number | null; potencia_p2?: number | null; potencia_p3?: number | null;
  potencia_p4?: number | null; potencia_p5?: number | null; potencia_p6?: number | null;
  ofertas?: PdfOferta[];
  numero_cuenta_bancaria?: string;
}

interface TextBloque {
  tipo: 'titulo' | 'texto' | 'tabla_proteccion';
  texto?: string;
  negrita?: boolean;
  forzarSalto?: boolean;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const COL_HEADER_DARK: RGB = [96, 57, 34];
const COL_HEADER_BG: RGB   = [186, 112, 67];
const COL_ROW_LIGHT: RGB   = [245, 240, 232];
const COL_TITLE: RGB       = [78, 58, 45];
const BORDER_COLOR: RGB    = [97, 72, 56];
const WHITE: RGB           = [255, 255, 255];
const BLACK: RGB           = [20, 20, 20];
const GRAY: RGB            = [138, 132, 126];

const LOGO_URL   = 'https://media.base44.com/images/public/6994a0e8951ea9bf8c56b343/4e8b20fd8_apolologo2.png';
const EMPRESA_PIE = 'Apolo Business S.L. Paseo Alameda 38, torre 2, puerta 2, 46023 Valencia CIF B-56263304 ' +
                    'Registro Mercantil de Valencia en el Tomo 11436, Libro 8714, Folio 1, Seccion 8 Hoja V-213053, I/A 1';

// ─── Utilidades de color ───────────────────────────────────────────────────────

function fl(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function dr(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function tc(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function cargarImagenBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror   = reject;
    reader.readAsDataURL(blob);
  });
}

function truncarTexto(doc: jsPDF, text: string, maxWidth: number): string {
  const safe = text ?? '';
  if (doc.getTextWidth(safe) <= maxWidth) return safe;
  let s = safe;
  while (doc.getTextWidth(s + '...') > maxWidth && s.length > 0) s = s.slice(0, -1);
  return s + '...';
}

function printJustifiedLine(doc: jsPDF, line: string, x: number, y: number, colW: number): void {
  const words = line.trim().split(/\s+/);
  if (words.length <= 1) { doc.text(line.trim(), x, y); return; }
  const wordsWidth = words.reduce((acc, w) => acc + doc.getTextWidth(w), 0);
  if (wordsWidth < colW * 0.80) { doc.text(line.trim(), x, y); return; }
  const spaceWidth = (colW - wordsWidth) / (words.length - 1);
  let cx = x;
  words.forEach(w => { doc.text(w, cx, y); cx += doc.getTextWidth(w) + spaceWidth; });
}

function str(v: unknown): string { return v != null ? String(v) : ''; }

// ─── Dibujo de cabecera ────────────────────────────────────────────────────────

function dibujarCabecera(doc: jsPDF, logoData: string | null, margin: number, colW: number): void {
  const topY = 5; const barX = 115; const darkW = 78; const accentW = 12; const barH = 14;
  fl(doc, [255, 255, 255]); doc.rect(0, 0, 210, 297, 'F');
  fl(doc, COL_HEADER_DARK); doc.rect(barX, topY, darkW, barH, 'F');
  fl(doc, COL_HEADER_BG);   doc.rect(barX + darkW, topY, accentW, barH, 'F');
  tc(doc, WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.7);
  doc.text('CONTRATO DE', barX + darkW / 2, topY + 5.1, { align: 'center' });
  doc.text('SUMINISTRO ELECTRICO', barX + darkW / 2, topY + 10.8, { align: 'center' });
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 6, 38, 10); }
    catch { tc(doc, COL_TITLE); doc.setFontSize(14); doc.text('Apolo Energies', margin, 14); }
  }
}

function tituloSeccion(doc: jsPDF, texto: string, y: number, margin: number, _colW: number): number {
  doc.setFontSize(texto.length > 40 ? 11 : 12);
  doc.setFont('helvetica', 'bold'); tc(doc, COL_TITLE);
  doc.text(texto, margin, y + 4.5);
  return y + 7;
}

function dibujarIdsPrimeraPagina(doc: jsPDF, y: number, margin: number, colW: number, contrato: PdfContratoData): number {
  const x1 = margin + colW * 0.46; const x2 = margin + colW * 0.77;
  doc.setFont('helvetica', 'normal'); tc(doc, COL_TITLE); doc.setFontSize(7.5);
  doc.text('ID Propuesta', x1, y - 0.5); doc.text('ID Oferta', x2, y - 0.5);
  doc.setFont('courier', 'normal'); tc(doc, GRAY); doc.setFontSize(7);
  doc.text(str(contrato.id_propuesta), x1, y + 3.5);
  doc.text(str(contrato.id_oferta ?? contrato.numero_oferta), x2, y + 3.5);
  return y + 5;
}

function sectionBar(doc: jsPDF, texto: string, y: number, margin: number, colW: number): number {
  fl(doc, COL_HEADER_BG); doc.rect(margin, y, colW, 4.5, 'F');
  doc.setFontSize(6.4); doc.setFont('helvetica', 'bold'); tc(doc, WHITE);
  doc.text(texto, margin + 1.5, y + 3.2);
  return y + 4.5;
}

function dibujarCheckbox(doc: jsPDF, x: number, y: number, checked: boolean, char = 'X'): void {
  const size = 3;
  dr(doc, BORDER_COLOR); doc.setLineWidth(0.25);
  if (checked) {
    fl(doc, [40, 40, 40]); doc.rect(x, y, size, size, 'FD');
    tc(doc, WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    const w = doc.getTextWidth(char);
    doc.text(char, x + (size - w) / 2, y + 2.4);
  } else {
    fl(doc, WHITE); doc.rect(x, y, size, size, 'FD');
  }
  tc(doc, BLACK);
}

// ─── Filas de datos ────────────────────────────────────────────────────────────

function filaDoble(doc: jsPDF, l1: string, v1: string, l2: string, v2: string, y: number, margin: number, colW: number): number {
  const h = 4.5;
  const lw1 = colW * 0.3; const vw1 = colW * 0.35; const lw2 = colW * 0.15; const vw2 = colW * 0.2;
  dr(doc, BORDER_COLOR); doc.setLineWidth(0.25);
  fl(doc, COL_HEADER_BG); doc.rect(margin, y, lw1, h, 'FD');
  tc(doc, BLACK); doc.setFontSize(6.3); doc.setFont('helvetica', 'bold'); doc.text(l1, margin + 1, y + 3.2);
  fl(doc, COL_ROW_LIGHT); doc.rect(margin + lw1, y, vw1, h, 'FD');
  doc.text(truncarTexto(doc, v1, vw1 - 2), margin + lw1 + 1, y + 3.2);
  fl(doc, COL_HEADER_BG); doc.rect(margin + lw1 + vw1, y, lw2, h, 'FD');
  doc.text(l2, margin + lw1 + vw1 + 1, y + 3.2);
  fl(doc, COL_ROW_LIGHT); doc.rect(margin + lw1 + vw1 + lw2, y, vw2, h, 'FD');
  doc.text(truncarTexto(doc, v2, vw2 - 2), margin + lw1 + vw1 + lw2 + 1, y + 3.2);
  return y + h + 0.2;
}

function filaSingle(doc: jsPDF, label: string, val: string, y: number, margin: number, colW: number): number {
  const h = 4.5; const lw = colW * 0.28;
  dr(doc, BORDER_COLOR); doc.setLineWidth(0.25);
  fl(doc, COL_HEADER_BG); doc.rect(margin, y, lw, h, 'FD');
  tc(doc, BLACK); doc.setFontSize(6.3); doc.setFont('helvetica', 'bold'); doc.text(label, margin + 1, y + 3.2);
  fl(doc, COL_ROW_LIGHT); doc.rect(margin + lw, y, colW - lw, h, 'FD');
  doc.text(truncarTexto(doc, val, colW - lw - 2), margin + lw + 1, y + 3.2);
  return y + h + 0.2;
}

function filaTres(doc: jsPDF, l1: string, v1: string, l2: string, v2: string, l3: string, v3: string, y: number, margin: number, colW: number): number {
  const h = 4.5; const pw = colW / 3;
  [[l1, v1, 0], [l2, v2, pw], [l3, v3, pw * 2]].forEach(([lbl, val, off]) => {
    const lw = pw * 0.38; const vw = pw * 0.62;
    dr(doc, BORDER_COLOR); doc.setLineWidth(0.25);
    fl(doc, COL_HEADER_BG); doc.rect(margin + (off as number), y, lw, h, 'FD');
    tc(doc, BLACK); doc.setFontSize(6.3); doc.setFont('helvetica', 'bold');
    doc.text(lbl as string, margin + (off as number) + 1, y + 3.2);
    fl(doc, COL_ROW_LIGHT); doc.rect(margin + (off as number) + lw, y, vw, h, 'FD');
    doc.text(truncarTexto(doc, val as string, vw - 2), margin + (off as number) + lw + 1, y + 3.2);
  });
  return y + h + 0.2;
}

// ─── Tabla consumos / potencias ────────────────────────────────────────────────

function tablaConsumosPotencias(doc: jsPDF, y: number, margin: number, colW: number, contrato: PdfContratoData): number {
  const pW = colW / 13;
  dr(doc, BORDER_COLOR); doc.setLineWidth(0.25);
  fl(doc, COL_HEADER_BG); doc.rect(margin, y, colW, 4.8, 'FD');
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
  doc.text('Consumo Energia Activa kWh/ ano', margin + colW * 0.20, y + 3.4);
  doc.text('Potencia Contratada kW', margin + colW * 0.68, y + 3.4);
  y += 4.8;

  fl(doc, COL_ROW_LIGHT); doc.rect(margin, y, colW, 4.5, 'FD');
  doc.setFontSize(6.2); doc.text('TARIFA', margin + 1.5, y + 3.1);
  ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].forEach((p, i) => {
    doc.text(p, margin + pW * (1 + i) + pW / 2, y + 3.1, { align: 'center' });
    doc.text(p, margin + pW * (7 + i) + pW / 2, y + 3.1, { align: 'center' });
  });
  y += 4.5;

  fl(doc, WHITE); doc.rect(margin, y, colW, 5.5, 'FD');
  for (let i = 0; i <= 13; i++) doc.line(margin + pW * i, y, margin + pW * i, y + 5.5);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text(str(contrato.tarifa), margin + pW / 2, y + 3.8, { align: 'center' });

  const consumos = [contrato.consumo_p1, contrato.consumo_p2, contrato.consumo_p3, contrato.consumo_p4, contrato.consumo_p5, contrato.consumo_p6];
  const potencias = [contrato.potencia_p1, contrato.potencia_p2, contrato.potencia_p3, contrato.potencia_p4, contrato.potencia_p5, contrato.potencia_p6];
  consumos.forEach((v, i) => { if (v != null && v !== undefined) doc.text(str(v), margin + pW * (1 + i) + pW / 2, y + 3.8, { align: 'center' }); });
  potencias.forEach((v, i) => { if (v != null && v !== undefined) doc.text(str(v), margin + pW * (7 + i) + pW / 2, y + 3.8, { align: 'center' }); });
  return y + 6.5;
}

// ─── Tabla de precios ──────────────────────────────────────────────────────────

function tablaPrecios(doc: jsPDF, y: number, margin: number, colW: number, header1: string, header2: string, energiaVals: string[], potenciaVals: string[]): number {
  const mid = colW / 2; const pW = mid / 6; const h = 4.5;
  dr(doc, BORDER_COLOR); doc.setLineWidth(0.25);
  fl(doc, COL_HEADER_BG); doc.rect(margin, y, mid, h, 'FD'); doc.rect(margin + mid, y, mid, h, 'FD');
  tc(doc, BLACK); doc.setFontSize(5.8); doc.setFont('helvetica', 'bold');
  doc.text(header1, margin + 1, y + 3); doc.text(header2, margin + mid + 1, y + 3); y += h;
  fl(doc, COL_ROW_LIGHT); doc.rect(margin, y, colW, h, 'FD');
  ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].forEach((p, i) => {
    doc.text(p, margin + pW * i + pW / 2, y + 3, { align: 'center' });
    doc.text(p, margin + mid + pW * i + pW / 2, y + 3, { align: 'center' });
  });
  y += h;
  fl(doc, WHITE); doc.rect(margin, y, colW, h + 0.5, 'FD');
  for (let i = 0; i <= 6; i++) {
    doc.line(margin + pW * i, y, margin + pW * i, y + h + 0.5);
    doc.line(margin + mid + pW * i, y, margin + mid + pW * i, y + h + 0.5);
  }
  doc.setFontSize(6.3); doc.setFont('helvetica', 'normal');
  for (let i = 0; i < 6; i++) {
    if (energiaVals[i]) doc.text(energiaVals[i], margin + pW * i + pW / 2, y + 3.4, { align: 'center' });
    if (potenciaVals[i]) doc.text(potenciaVals[i], margin + mid + pW * i + pW / 2, y + 3.4, { align: 'center' });
  }
  return y + h + 2.5;
}

// ─── Bloque oferta económica ───────────────────────────────────────────────────

function bloqueOfertaEconomica(doc: jsPDF, y: number, margin: number, colW: number, contrato: PdfContratoData & { tipo_oferta?: string; nombre_producto?: string }): number {
  const tipoOferta = contrato.tipo_oferta ?? 'FIJO';
  const nombreProducto = contrato.nombre_producto ?? '';
  if (nombreProducto) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
    doc.text('Producto: ', margin + 2, y + 4); doc.setFont('helvetica', 'normal');
    doc.text(nombreProducto, margin + 22, y + 4); y += 5.5;
  }
  const opciones = [
    { label: 'Precio Fijo (ATRs y Servicios de ajustes incluidos)', key: 'FIJO' },
    { label: 'Precio Indexado', key: 'INDEXADO' },
    { label: 'Precio Fijo (ATRs y Servicios de ajustes no incluidos) Pass Pool: A (parte fija) + B (parte variable)', key: 'PASS_POOL' },
  ];
  const eVals = [contrato.potencia_p1, contrato.potencia_p2, contrato.potencia_p3, contrato.potencia_p4, contrato.potencia_p5, contrato.potencia_p6].map(v => v != null ? str(v) : '');
  const pVals = [contrato.potencia_p1, contrato.potencia_p2, contrato.potencia_p3, contrato.potencia_p4, contrato.potencia_p5, contrato.potencia_p6].map(v => v != null ? str(v) : '');

  opciones.forEach(op => {
    const checked = tipoOferta === op.key;
    dibujarCheckbox(doc, margin + 2, y, checked);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
    doc.text(op.label, margin + 7, y + 2.5); y += 4.5;
    if (op.key === 'FIJO') {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
      doc.text('En el caso de indicar la casilla FIJO, se aplicaran los precios indicados en la siguiente tabla.', margin + 3, y + 1); y += 3.5;
      y = tablaPrecios(doc, y, margin, colW, 'PRECIO Termino Energia Activa c/kWh (SIN IEE ni IVA)', 'PRECIO Termino Potencia c/kW dia (Sin IEE ni IVA)', eVals, pVals);
    } else if (op.key === 'INDEXADO') {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
      const lines = doc.splitTextToSize('(PMD + Ci + FEE + DSV + FNEE)*(1+tasa municipal)*(1+Cperdidas)*(1+Cfinanciero)', colW - 4);
      doc.text(lines, margin + 3, y + 1); y += (lines as string[]).length * 3 + 1;
      y = tablaPrecios(doc, y, margin, colW, 'FEE c/Kwh', 'PRECIO Termino Potencia c/kW dia (Sin IEE ni IVA)', eVals, pVals);
    } else if (op.key === 'PASS_POOL') {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
      const lines = doc.splitTextToSize('A (Parte fija): incluye costes regulados, peajes ATR, FNEE y coste de gestion.', colW - 4);
      doc.text(lines, margin + 3, y + 1); y += (lines as string[]).length * 3 + 1;
      y = tablaPrecios(doc, y, margin, colW, 'PRECIO A (parte fija) c/Kwh (SIN IEE ni IVA)', 'PRECIO Termino Potencia c/kW dia (Sin IEE ni IVA)', eVals, pVals);
    }
  });
  return y;
}

function bloqueOfertaEconomicaMultiNew(doc: jsPDF, y: number, margin: number, colW: number, contrato: PdfContratoData): number {
  const ofertas = contrato.ofertas?.length ? contrato.ofertas : null;
  if (!ofertas) return bloqueOfertaEconomica(doc, y, margin, colW, contrato);

  const tipoLabels: Record<string, string> = { FIJO: 'Precio Fijo', INDEXADO: 'Precio Indexado', PASS_POOL: 'Pass Pool' };

  ofertas.forEach((oferta, idx) => {
    if (idx > 0) { dr(doc, BORDER_COLOR); doc.setLineWidth(0.3); doc.line(margin, y, margin + colW, y); y += 3; }
    const tipoLabel = tipoLabels[oferta.tipo_oferta ?? ''] ?? oferta.tipo_oferta ?? '';
    const titulo = `${oferta.nombre_producto ?? 'Oferta'} - ${tipoLabel}`;
    y = sectionBar(doc, titulo, y, margin, colW); y += 1;

    const tarifas = oferta.tarifas ?? {};
    const tarifaKeys = Object.keys(tarifas);

    if (!tarifaKeys.length) {
      y = bloqueOfertaEconomica(doc, y, margin, colW, { ...contrato, tipo_oferta: oferta.tipo_oferta, nombre_producto: oferta.nombre_producto });
    } else {
      tarifaKeys.forEach(key => {
        const td = tarifas[key];
        fl(doc, COL_HEADER_DARK); doc.rect(margin, y, colW, 4, 'F');
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); tc(doc, WHITE);
        doc.text('Tarifa ' + key, margin + 1.5, y + 2.8); y += 4;

        const eVals = (['p1','p2','p3','p4','p5','p6'] as const).map(p => { const v = td[`energia_${p}`]; return v != null ? str(v) : ''; });
        const pVals = (['p1','p2','p3','p4','p5','p6'] as const).map(p => { const v = td[`potencia_${p}`]; return v != null ? str(v) : ''; });

        const h1 = oferta.tipo_oferta === 'INDEXADO' ? 'FEE c/kWh'
          : oferta.tipo_oferta === 'PASS_POOL' ? 'PRECIO A (parte fija) c/kWh (SIN IEE ni IVA)'
          : 'PRECIO Termino Energia Activa c/kWh (SIN IEE ni IVA)';
        y = tablaPrecios(doc, y, margin, colW, h1, 'PRECIO Termino Potencia c/kW dia (Sin IEE ni IVA)', eVals, pVals);
        y += 2;
      });
    }
  });
  return y;
}

// ─── Firma y pie ───────────────────────────────────────────────────────────────

function bloquesFirmaFijoAbajo(doc: jsPDF, margin: number, colW: number, contrato: PdfContratoData): void {
  let y = 265;
  const fechaStr = contrato.fecha_contrato
    ? new Date(contrato.fecha_contrato).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : '_____ de __________ de _____';
  const [dia = '__', mes = '__________', anio = '____'] = fechaStr.split(' de ');
  const ciudad = contrato.ciudad ?? contrato.municipio ?? '__________';

  tc(doc, COL_TITLE); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('En', margin, y); doc.setFont('helvetica', 'bold'); doc.text(ciudad, margin + 7, y);
  doc.setFont('helvetica', 'normal'); doc.text('a', margin + 72, y);
  doc.setFont('helvetica', 'bold'); doc.text(dia, margin + 84, y, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.text('de', margin + 92, y);
  doc.setFont('helvetica', 'bold'); doc.text(mes, margin + 114, y, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.text('de', margin + 136, y);
  doc.setFont('helvetica', 'bold'); doc.text(anio, margin + 154, y, { align: 'center' });

  tc(doc, GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
  y += 3.5;
  doc.text('EMPRESA', margin, y); doc.text('CLIENTE', margin + colW / 2 + 8, y);
  y += 8.5;
  dr(doc, BORDER_COLOR); doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 65, y); doc.line(margin + colW - 65, y, margin + colW, y);
  doc.setFontSize(6.5); tc(doc, GRAY); doc.setFont('helvetica', 'normal');
  doc.text('Fdo. P.P.', margin, y + 3); doc.text('Fdo. P.P.', margin + colW - 65, y + 3);
  doc.setFontSize(7.5); tc(doc, BLACK); doc.setFont('helvetica', 'bold');
  doc.text('Wenceslao Gonzalez Vicens', margin + 12, y + 3);
  doc.text(truncarTexto(doc, contrato.nombre_cliente ?? '', 52), margin + colW - 2, y + 3, { align: 'right' });
}

function piePagina(doc: jsPDF, numPag: number, margin: number, colW: number, H: number): void {
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); tc(doc, COL_TITLE);
  doc.text(EMPRESA_PIE, 105, H - 9, { align: 'center', maxWidth: colW });
  doc.setFontSize(6.5);
  doc.text(str(numPag), margin, H - 4.5);
  doc.text('Contrato de suministro V260126', 105, H - 4.5, { align: 'center' });
}

// ─── Tabla protección de datos ─────────────────────────────────────────────────

function tablaProteccionDatos(doc: jsPDF, y: number, margin: number, colW: number): number {
  const filas: [string, string, string?][] = [
    ['Responsable del Tratamiento', 'APOLO BUSINESS S.L. Paseo Alameda 38, torre 2, puerta 2, Valencia - 46023- 900 80 12 15\nDelegado de proteccion de datos: dpo@renovaenergy.es'],
    ['Finalidad', 'Envio de comunicaciones comerciales. Gestion de clientes.', 'Se conservaran los datos mientras dure la relacion comercial. No se adoptan decisiones automatizadas. No se elaboran perfiles.'],
    ['Legitimacion', 'Contrato de servicio. Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Anadido.', ''],
    ['Destinatarios', 'Prevision de cesiones internacionales: [ ] SI / [X] NO', 'Se le comunicara en el caso de que fuera necesaria la cesion de sus datos a cualquier pais fuera del territorio nacional.'],
    ['Derechos', 'Podra ejercitar en todo momento los derechos de acceso, rectificacion, cancelacion, oposicion, olvido y portabilidad.', 'Paseo Alameda 38, torre 2, puerta 2, Valencia - 46023, o en la web www.apoloenergies.es. Puede retirar el consentimiento en cualquier momento, y reclamar ante la A.E.P.D. en la web www.aepd.es'],
    ['Procedencia', 'El propio interesado o su representante legal.', 'Contratos, formularios, en persona. DNI/CIF, nombre y apellidos, direccion, telefono, IBAN, email, CUPS, firma.'],
    ['Delegado', 'Francisco Javier Palazon Ramirez', 'Delegado de proteccion de datos - 661449409 - javier.palazon@michilotconsultores.com'],
  ];

  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
  doc.text('Con motivo del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo y de la L.O. de Proteccion de Datos y Garantia de los Derechos Digitales, le comunicamos que sus datos seran tratados por:', margin, y);
  y += 5.5;

  filas.forEach((fila, idx) => {
    const h = 7.5; const bg: RGB = idx % 2 === 0 ? COL_ROW_LIGHT : WHITE;
    fl(doc, bg); doc.rect(margin, y, colW, h, 'FD');
    dr(doc, BORDER_COLOR); doc.setLineWidth(0.25);
    fl(doc, COL_HEADER_BG); doc.rect(margin, y, colW * 0.2, h, 'FD');
    tc(doc, WHITE); doc.setFontSize(6); doc.setFont('helvetica', 'bold');
    doc.text(fila[0], margin + 1, y + 4.5);
    tc(doc, BLACK); doc.setFont('helvetica', 'normal');
    if (fila.length === 2) {
      const lines = doc.splitTextToSize(fila[1], colW * 0.78);
      doc.text(lines as string[], margin + colW * 0.21, y + 3.8);
    } else {
      const col2W = colW * 0.38;
      doc.text(doc.splitTextToSize(fila[1], col2W) as string[], margin + colW * 0.21, y + 3.8);
      doc.text(doc.splitTextToSize(fila[2] ?? '', col2W) as string[], margin + colW * 0.6, y + 3.8);
    }
    y += h;
  });
  return y + 4;
}

// ─── SEPA ──────────────────────────────────────────────────────────────────────

function renderSepa(doc: jsPDF, y: number, margin: number, colW: number, contrato: PdfContratoData): void {
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
  doc.text('Orden Domiciliacion Adeudo SEPA CORE', margin, y + 7); y += 12;

  doc.setFontSize(6.8); doc.setFont('helvetica', 'normal');
  const textoSepa = 'Mediante la firma de este formulario de Orden de Domiciliacion, el CLIENTE autoriza al PRESTADOR DE SERVICIOS a enviar ordenes a su entidad financiera para adeudar su cuenta y a su entidad financiera para adeudar los importes correspondientes en su cuenta de acuerdo con las ordenes del PRESTADOR DE SERVICIOS.\n\nComo parte de sus derechos, el deudor esta legitimado al reembolso por su entidad en los terminos y condiciones del contrato suscrito con la misma. La solicitud de reembolso debera efectuarse dentro de las ocho semanas que siguen a la fecha de adeudo en cuenta.';
  const lines1 = doc.splitTextToSize(textoSepa, colW);
  (lines1 as string[]).forEach((line, i) => {
    if (i === (lines1 as string[]).length - 1 || line === '') doc.text(line, margin, y);
    else printJustifiedLine(doc, line, margin, y, colW);
    y += 3.0;
  });
  y += 1.5;

  const dir   = contrato.direccion_fiscal ?? contrato.direccion ?? '';
  const pob   = contrato.municipio_fiscal ?? contrato.municipio ?? '';
  const prov  = contrato.provincia_fiscal ?? contrato.provincia ?? '';
  const cp    = contrato.cp_fiscal ?? contrato.cp ?? contrato.codigo_postal ?? '';

  y = sectionBar(doc, 'DATOS DEL CLIENTE', y, margin, colW);
  y = filaDoble(doc, 'Nombre y apellidos o Razon social', contrato.nombre_cliente ?? '', 'NIF/CIF', contrato.cif ?? '', y, margin, colW);
  y = filaDoble(doc, 'Direccion', dir, 'CP', cp, y, margin, colW);
  y = filaTres(doc, 'Poblacion', pob, 'Provincia', prov, 'Pais', 'Espana', y, margin, colW);
  y = filaDoble(doc, 'IBAN Cuenta Cliente', contrato.numero_cuenta_bancaria ?? '', 'BIC (Swift-Code)', '', y, margin, colW);

  y += 2;
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); tc(doc, BLACK);
  doc.text('Tipo de Pago', margin + 1, y + 2.5);
  dibujarCheckbox(doc, margin + 22, y, true); doc.text('Periodico', margin + 27, y + 2.5);
  dibujarCheckbox(doc, margin + 55, y, false); doc.text('Unico', margin + 60, y + 2.5);
  y += 5;

  y = sectionBar(doc, 'DATOS DEL PRESTADOR DE SERVICIOS', y, margin, colW);
  y = filaSingle(doc, 'Referencia de Mandato', '*Se le comunicara en la primera factura emitida.', y, margin, colW);
  y = filaSingle(doc, 'Identificador', '', y, margin, colW);
  y = filaDoble(doc, 'Nombre/ Razon Social', 'APOLO BUSINESS, S.L.', 'NIF/CIF', 'B56263304', y, margin, colW);
  y = filaDoble(doc, 'Direccion', 'Paseo Alameda 38, torre 2, puerta 2', 'CP', '46023', y, margin, colW);
  filaTres(doc, 'Poblacion', 'Valencia', 'Provincia', 'Valencia/Valencia', 'Pais', 'Espana', y, margin, colW);
}

// ─── Renderizado de bloques de texto ──────────────────────────────────────────

function renderTextBlocksJustified(
  doc: jsPDF, bloques: TextBloque[], y: number, margin: number, colW: number,
  checkPageBreak?: (space: number) => void
): number {
  let yp = y;
  bloques.forEach(bloque => {
    if (bloque.tipo === 'titulo') {
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
      const lines = doc.splitTextToSize(bloque.texto ?? '', colW) as string[];
      checkPageBreak?.(lines.length * 3.2 + 1.2);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
      doc.text(lines, margin, yp); yp += lines.length * 3.2 + 1.2;
    } else if (bloque.tipo === 'texto') {
      const isBold = !!bloque.negrita;
      doc.setFontSize(6.8); doc.setFont('helvetica', isBold ? 'bold' : 'normal'); tc(doc, BLACK);
      const lines = doc.splitTextToSize(bloque.texto ?? '', colW) as string[];
      lines.forEach((line, i) => {
        checkPageBreak?.(3.0);
        doc.setFontSize(6.8); doc.setFont('helvetica', isBold ? 'bold' : 'normal'); tc(doc, BLACK);
        if (i === lines.length - 1) doc.text(line, margin, yp);
        else printJustifiedLine(doc, line, margin, yp, colW);
        yp += 3.0;
      });
      yp += 1.0;
    } else if (bloque.tipo === 'tabla_proteccion') {
      checkPageBreak?.(75);
      yp = tablaProteccionDatos(doc, yp, margin, colW);
    }
  });
  return yp;
}

// ─── Stubs de contenido estático ──────────────────────────────────────────────
// TODO: Rellenar con el texto legal completo.

function getCondicionesGenerales(): TextBloque[] {
  return [
    { tipo: 'titulo', texto: '1. OBJETO DEL CONTRATO' },
    { tipo: 'texto', texto: '[Condiciones generales por completar - insertar texto legal aqui]' },
    { tipo: 'tabla_proteccion' },
  ];
}

function getAnexoHuchaSolar(): TextBloque[] {
  return [
    { tipo: 'titulo', texto: 'ANEXO HUCHA SOLAR' },
    { tipo: 'texto', texto: '[Contenido del anexo Hucha Solar por completar]' },
  ];
}

function getAnexoGestion(): TextBloque[] {
  return [
    { tipo: 'titulo', texto: 'SOLUCIONES DE GESTION Y EFICIENCIA ENERGETICA' },
    { tipo: 'texto', texto: '[Contenido del anexo de gestion por completar]' },
  ];
}

function renderAnexoAutoconsumoForm(doc: jsPDF, y: number, _margin: number, _colW: number, _contrato: PdfContratoData): void {
  tc(doc, GRAY); doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text('[Formulario Anexo Autoconsumo por completar]', _margin, y + 10);
}

function renderAnexoSolicitudesForm(doc: jsPDF, y: number, _margin: number, _colW: number, _contrato: PdfContratoData, _checkFn?: (s: number) => void): void {
  tc(doc, GRAY); doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text('[Formulario Anexo Solicitudes por completar]', _margin, y + 10);
}

// ─── Fusión con pdf-lib ────────────────────────────────────────────────────────

async function fusionarPdfExterno(documentoFinal: PDFDocument, url: string): Promise<void> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return;
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 5));
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) return;
    const pdfAnexo = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const paginas = await documentoFinal.copyPages(pdfAnexo, pdfAnexo.getPageIndices());
    paginas.forEach(p => documentoFinal.addPage(p));
  } catch (e) {
    console.warn('No se pudo fusionar PDF externo:', e);
  }
}

// ─── Servicio Angular ─────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ContratoPdfService {

  async generarPdf(contrato: PdfContratoData): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const H = 297; const margin = 12; const colW = W - margin * 2;

    let logoData: string | null = null;
    try { logoData = await cargarImagenBase64(LOGO_URL); }
    catch (e) { console.warn('No se pudo cargar el logo', e); }

    const cupsTexto = contrato.cups?.length ? contrato.cups.join(', ') : '';

    // ── Página 1 ──────────────────────────────────────────────────────────────
    dibujarCabecera(doc, logoData, margin, colW);
    let y = 21;

    y = tituloSeccion(doc, 'Condiciones Particulares', y, margin, colW);
    y = dibujarIdsPrimeraPagina(doc, y, margin, colW, contrato);

    y = sectionBar(doc, 'DATOS DEL TITULAR DEL PUNTO DE SUMINISTRO EN CIA DISTRIBUIDORA', y, margin, colW);
    y = filaDoble(doc, 'Nombre y apellidos o Razon social', contrato.nombre_cliente ?? '', 'NIF/CIF', contrato.cif ?? '', y, margin, colW);
    y = filaDoble(doc, 'Codigo CNAE - Descripcion Actividad', contrato.cnae ?? '', 'Telefono', contrato.telefono ?? '', y, margin, colW);

    y += 1;
    y = sectionBar(doc, 'DATOS DEL CLIENTE Y FACTURACION', y, margin, colW);
    y = filaDoble(doc, 'Nombre y apellidos o Razon social', contrato.nombre_cliente ?? '', 'NIF/CIF', contrato.cif ?? '', y, margin, colW);
    y = filaDoble(doc, 'Representante legal', contrato.representante_legal ?? contrato.nombre_cliente ?? '', 'NIF', contrato.cif ?? '', y, margin, colW);
    y = filaDoble(doc, 'Correo electronico', contrato.correo ?? '', 'Telefono', contrato.telefono ?? '', y, margin, colW);
    y = filaSingle(doc, 'Direccion fiscal notificaciones', contrato.direccion_fiscal ?? contrato.direccion ?? '', y, margin, colW);
    y = filaTres(doc, 'Poblacion', contrato.municipio_fiscal ?? contrato.municipio ?? '', 'Provincia', contrato.provincia_fiscal ?? contrato.provincia ?? '', 'CP', contrato.cp_fiscal ?? contrato.cp ?? contrato.codigo_postal ?? '', y, margin, colW);

    y += 1.5;
    dibujarCheckbox(doc, margin + 2, y, false);
    doc.setFontSize(7.5); tc(doc, BLACK); doc.setFont('helvetica', 'normal');
    doc.text('Envio en formato papel (1,80 + IVA/factura)', margin + 7, y + 2.5);
    dibujarCheckbox(doc, margin + 100, y, true, '✓');
    doc.text('Envio en formato electronico', margin + 105, y + 2.5);
    y += 4.5;

    y = sectionBar(doc, 'DATOS DEL PUNTO DE SUMINISTRO', y, margin, colW);
    y = filaDoble(doc, 'CUPS', cupsTexto, 'Direccion punto de suministro', contrato.direccion_suministro ?? contrato.direccion ?? '', y, margin, colW);
    y = filaTres(doc, 'Provincia', contrato.provincia ?? '', 'Poblacion', contrato.municipio ?? '', 'CP', contrato.cp ?? contrato.codigo_postal ?? '', y, margin, colW);

    y += 1.5;
    dibujarCheckbox(doc, margin + 2, y, false);
    doc.setFontSize(7); tc(doc, BLACK);
    doc.text('Senale la siguiente casilla unicamente si se trata de un PARTICULAR. En caso de tratarse de una EMPRESA/AUTONOMO no marque esta casilla.', margin + 7, y + 2.5);
    y += 4.5;

    y = tablaConsumosPotencias(doc, y, margin, colW, contrato);
    y += 1.5;

    y = tituloSeccion(doc, 'OFERTA ECONOMICA DEL PRODUCTO', y, margin, colW);
    y = bloqueOfertaEconomicaMultiNew(doc, y, margin, colW, contrato);

    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
    doc.text('Servicios energeticos y de financiacion (ver anexo servicio energeticos): _______ /mes', margin + 2, y + 3.5);
    y += 5.5;
    doc.text('Observaciones especificas de las condiciones particulares pactadas:', margin + 2, y + 2);
    y += 5;

    y = sectionBar(doc, 'COMUNICACION EMPRESA', y, margin, colW);
    filaTres(doc, 'Telefono', '900 80 12 15', 'Correo Electronico', 'info@apoloenergies.es', 'Web', 'https://apoloenergies.es/', y, margin, colW);

    bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
    piePagina(doc, 1, margin, colW, H);

    // ── Páginas condiciones generales ─────────────────────────────────────────
    let currentPag = 2;
    const bloquesCG = getCondicionesGenerales();

    doc.addPage(); dibujarCabecera(doc, logoData, margin, colW);
    let yp = 21;
    yp = tituloSeccion(doc, 'Condiciones Generales', yp, margin, colW);

    const checkPageBreak = (requiredSpace: number): void => {
      if (yp + requiredSpace > 263) {
        bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
        piePagina(doc, currentPag, margin, colW, H);
        doc.addPage(); currentPag++;
        dibujarCabecera(doc, logoData, margin, colW); yp = 21;
      }
    };

    bloquesCG.forEach(bloque => {
      if (bloque.forzarSalto && yp > 35) {
        bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
        piePagina(doc, currentPag, margin, colW, H);
        doc.addPage(); currentPag++;
        dibujarCabecera(doc, logoData, margin, colW); yp = 21;
      }
      if (bloque.tipo === 'titulo') {
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); tc(doc, BLACK);
        const lines = doc.splitTextToSize(bloque.texto ?? '', colW) as string[];
        checkPageBreak(lines.length * 3.2 + 1.2);
        doc.text(lines, margin, yp); yp += lines.length * 3.2 + 1.2;
      } else if (bloque.tipo === 'texto') {
        const isBold = !!bloque.negrita;
        doc.setFontSize(6.8); doc.setFont('helvetica', isBold ? 'bold' : 'normal'); tc(doc, BLACK);
        const lines = doc.splitTextToSize(bloque.texto ?? '', colW) as string[];
        lines.forEach((line, i) => {
          checkPageBreak(3.0);
          doc.setFontSize(6.8); doc.setFont('helvetica', isBold ? 'bold' : 'normal'); tc(doc, BLACK);
          if (i === lines.length - 1) doc.text(line, margin, yp);
          else printJustifiedLine(doc, line, margin, yp, colW);
          yp += 3.0;
        });
        yp += 1.0;
      } else if (bloque.tipo === 'tabla_proteccion') {
        checkPageBreak(75);
        yp = tablaProteccionDatos(doc, yp, margin, colW);
      }
    });

    bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
    piePagina(doc, currentPag, margin, colW, H); currentPag++;

    // ── Anexos ────────────────────────────────────────────────────────────────
    doc.addPage(); dibujarCabecera(doc, logoData, margin, colW);
    let yAnexo = 21;
    yAnexo = tituloSeccion(doc, 'Anexo Autoconsumo', yAnexo, margin, colW);
    renderAnexoAutoconsumoForm(doc, yAnexo, margin, colW, contrato);
    bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
    piePagina(doc, currentPag, margin, colW, H); currentPag++;

    doc.addPage(); dibujarCabecera(doc, logoData, margin, colW);
    let yHucha = 21;
    yHucha = tituloSeccion(doc, 'Anexo Autoconsumo con Compensacion Excedentes - HUCHA SOLAR', yHucha, margin, colW);
    renderTextBlocksJustified(doc, getAnexoHuchaSolar(), yHucha, margin, colW);
    bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
    piePagina(doc, currentPag, margin, colW, H); currentPag++;

    doc.addPage(); dibujarCabecera(doc, logoData, margin, colW);
    let ySol = 21;
    ySol = tituloSeccion(doc, 'Anexo de Solicitudes', ySol, margin, colW);
    renderAnexoSolicitudesForm(doc, ySol, margin, colW, contrato);
    bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
    piePagina(doc, currentPag, margin, colW, H); currentPag++;

    doc.addPage(); dibujarCabecera(doc, logoData, margin, colW);
    let yGestion = 21;
    yGestion = tituloSeccion(doc, 'Anexo Soluciones de Gestion y Eficiencia Energetica', yGestion, margin, colW);
    renderTextBlocksJustified(doc, getAnexoGestion(), yGestion, margin, colW);
    bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
    piePagina(doc, currentPag, margin, colW, H); currentPag++;

    doc.addPage(); dibujarCabecera(doc, logoData, margin, colW);
    renderSepa(doc, 21, margin, colW, contrato);
    bloquesFirmaFijoAbajo(doc, margin, colW, contrato);
    piePagina(doc, currentPag, margin, colW, H);

    // ── Descarga / fusión ─────────────────────────────────────────────────────
    const nombre = (contrato.nombre_cliente ?? 'contrato').replace(/\s+/g, '_');
    try {
      const pdfBytes = doc.output('arraybuffer');
      const docFinal = await PDFDocument.load(pdfBytes);
      // No se incluye fusión de adjuntos externos (los anexos están en el backend)
      const finalBytes = await docFinal.save();
      const blob = new Blob([finalBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Contrato_${nombre}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error en generacion final:', e);
      doc.save(`Contrato_${nombre}.pdf`);
    }
  }
}
