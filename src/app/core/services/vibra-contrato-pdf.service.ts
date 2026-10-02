import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import type { PdfContratoData as BasePdfData, PdfOfertaTarifa } from './contrato-pdf.service';

// Extiende el tipo Apolo con opcionales específicos Vibra
export interface PdfContratoData extends BasePdfData {
  tipo_documento?: string;
  numero?: string;
  piso_puerta?: string;
  duracion?: string;
}

type RGB = [number, number, number];

// Paleta Vibra
const VIBRA_GREEN: RGB      = [34, 197, 94];
const TITLE_BLUE: RGB       = [15, 76, 129];
const HAIRLINE_BLUE: RGB    = [79, 122, 168];
const LABEL_GRAY: RGB       = [107, 114, 128];
const TEXT_DARK: RGB        = [31, 41, 55];
const BOX_BORDER: RGB       = [200, 210, 220];
const WHITE: RGB            = [255, 255, 255];

const EMPRESA_PIE = 'VIBRA ENERGIA , S.L. C.I.F. B-22537740 PASEO ALAMEDA 38 46023 VALENCIA, VALENCIA. ' +
                    'Teléfono: 604176645 , e-mail: CLIENTES@VIBRAENERGIES.ES';

// ── Utils color ─────────────────────────────────────────────────
function fl(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function dr(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function tc(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

// ── Logo Vibra (onda verde + texto) ─────────────────────────────
function drawVibraLogo(doc: jsPDF, x: number, y: number): void {
  dr(doc, VIBRA_GREEN);
  doc.setLineWidth(0.6);
  const w = 22, h = 4;
  doc.line(x, y + h/2, x + 4, y + h/2);
  doc.line(x + 4, y + h/2, x + 6, y);
  doc.line(x + 6, y, x + 8, y + h);
  doc.line(x + 8, y + h, x + 10, y + h/2);
  doc.line(x + 10, y + h/2, x + 12, y + h/2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  tc(doc, TEXT_DARK);
  doc.text('Vibra', x + w - 8, y + h/2 + 1);
  dr(doc, VIBRA_GREEN);
  doc.line(x + w - 1, y + h/2, x + w + 2, y + h/2);
  doc.setLineWidth(0.2);
}

function pageTop(doc: jsPDF, title: string, subtitle: string | null, margin: number, colW: number): number {
  tc(doc, TITLE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, margin, 18);
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, margin, 23);
  }
  drawVibraLogo(doc, margin + colW - 24, 15);
  dr(doc, HAIRLINE_BLUE);
  doc.setLineWidth(0.5);
  doc.line(margin, 28, margin + colW, 28);
  return 34;
}

function sectionTitle(doc: jsPDF, texto: string, y: number, margin: number): number {
  tc(doc, TITLE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(texto, margin, y);
  return y + 5;
}

function hairline(doc: jsPDF, y: number, margin: number, colW: number): void {
  dr(doc, HAIRLINE_BLUE);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + colW, y);
}

function fieldRow(doc: jsPDF, cols: Array<{ label: string; value: string }>, y: number, margin: number, colW: number): number {
  const cellW = colW / cols.length;
  cols.forEach((c, i) => {
    const x = margin + cellW * i;
    tc(doc, LABEL_GRAY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(c.label, x, y);
    const labelW = doc.getTextWidth(c.label);
    tc(doc, TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(c.value ?? '', x + labelW + 3, y);
  });
  return y + 6;
}

function fullRow(doc: jsPDF, label: string, value: string, y: number, margin: number): number {
  tc(doc, LABEL_GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(label, margin, y);
  const labelW = doc.getTextWidth(label);
  tc(doc, TEXT_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(value ?? '', margin + labelW + 3, y);
  return y + 6;
}

function signatureBoxes(doc: jsPDF, y: number, margin: number, colW: number): number {
  tc(doc, TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Y en prueba de conformidad, las partes firman el presente contrato:', margin, y);
  y += 6;
  tc(doc, LABEL_GRAY);
  doc.setFontSize(8);
  doc.text('Cliente (firma y sello):', margin, y);
  doc.text('VIBRA ENERGIA', margin + colW / 2 + 4, y);
  y += 2;
  dr(doc, BOX_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, colW / 2 - 4, 22);
  doc.rect(margin + colW / 2 + 4, y, colW / 2 - 4, 22);
  return y + 24;
}

function pageFooter(doc: jsPDF, margin: number, colW: number, H: number): void {
  dr(doc, HAIRLINE_BLUE);
  doc.setLineWidth(0.3);
  doc.line(margin, H - 15, margin + colW, H - 15);
  tc(doc, LABEL_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(EMPRESA_PIE, margin, H - 10);
}

function checkbox(doc: jsPDF, x: number, y: number, checked: boolean): void {
  dr(doc, TEXT_DARK);
  doc.setLineWidth(0.3);
  doc.rect(x, y, 3, 3);
  if (checked) {
    fl(doc, TEXT_DARK);
    doc.rect(x, y, 3, 3, 'F');
  }
}

// ── Helper: obtener tarifa de la oferta ─────────────────────────
function getTarifa(contrato: PdfContratoData): PdfOfertaTarifa | null {
  const oferta = contrato.ofertas?.[0];
  if (!oferta?.tarifas) return null;
  const key = contrato.tarifa || Object.keys(oferta.tarifas)[0];
  return oferta.tarifas[key] ?? null;
}

function num(v: number | null | undefined): string {
  if (v == null) return '';
  return Number(v).toFixed(4);
}

// ── Página 1: Condiciones particulares ──────────────────────────
function pagina1(doc: jsPDF, c: PdfContratoData, margin: number, colW: number, H: number): void {
  let y = pageTop(doc, 'CONTRATO DE SERVICIOS ENERGÉTICOS', 'Condiciones particulares', margin, colW);

  y = sectionTitle(doc, 'Datos del cliente', y, margin);
  y = fieldRow(doc, [
    { label: 'Nombre/Razón Social:', value: c.nombre_cliente ?? '' },
    { label: 'Documento Nº:', value: c.cif ?? '' },
  ], y, margin, colW);
  y = fieldRow(doc, [
    { label: 'Tipo de documento:', value: c.tipo_documento ?? 'DNI' },
    { label: 'Tel. móvil:', value: c.telefono ?? '' },
  ], y, margin, colW);
  y = fullRow(doc, 'E-mail:', c.correo ?? '', y, margin);
  y = fullRow(doc, 'Dirección social:', c.direccion_fiscal ?? '', y, margin);

  tc(doc, LABEL_GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('El correo de notificaciones indicado será al que se envíen los contratos, facturas o cualquier notificación referente a su contrato por parte de VIBRA ENERGIA', margin, y);
  y += 6;

  y = fullRow(doc, 'Dirección del suministro:', '', y, margin);
  const dirParts = (c.direccion_suministro ?? '').split(',').map(s => s.trim());
  y = fieldRow(doc, [
    { label: 'Dirección:', value: dirParts[0] ?? '' },
    { label: 'Numero:', value: c.numero ?? dirParts[1] ?? '' },
  ], y, margin, colW);
  y = fieldRow(doc, [
    { label: 'Población:', value: c.municipio ?? '' },
    { label: 'Piso/Puerta:', value: c.piso_puerta ?? dirParts.slice(2).join(', ') },
  ], y, margin, colW);
  y = fieldRow(doc, [
    { label: 'Provincia:', value: c.provincia ?? '' },
    { label: 'Código postal:', value: c.cp ?? c.codigo_postal ?? '' },
  ], y, margin, colW);

  hairline(doc, y, margin, colW); y += 4;

  y = sectionTitle(doc, 'Datos técnicos del suministro:', y, margin);
  y = fieldRow(doc, [
    { label: 'CUPS electricidad:', value: c.cups?.join(', ') ?? '' },
    { label: 'Tarifa de acceso:', value: c.tarifa ?? '' },
  ], y, margin, colW);
  y = fullRow(doc, 'Consumo anual estimado:', c.consumo_p1 != null ? `${c.consumo_p1} kWh` : '', y, margin);

  y = fullRow(doc, 'Potencia contratada:', '', y, margin);
  const potencias = [c.potencia_p1, c.potencia_p2, c.potencia_p3, c.potencia_p4, c.potencia_p5, c.potencia_p6];
  const cellW = colW / 2;
  const fmtKw = (v: number | null | undefined): string => v != null ? `${v} kW` : '—';
  for (let i = 0; i < 3; i++) {
    tc(doc, LABEL_GRAY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`p${i + 1}`, margin + 4, y);
    tc(doc, TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(fmtKw(potencias[i]), margin + 12, y);
    tc(doc, LABEL_GRAY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`p${i + 4}`, margin + cellW + 4, y);
    tc(doc, TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(fmtKw(potencias[i + 3]), margin + cellW + 12, y);
    y += 5;
  }

  hairline(doc, y, margin, colW); y += 4;

  y = sectionTitle(doc, 'Producto y duración del contrato', y, margin);
  const producto = c.ofertas?.[0]?.nombre_producto ?? '';
  y = fullRow(doc, 'Producto contratado:', producto, y, margin);
  y = fullRow(doc, 'Fecha de inicio:', c.fecha_contrato ?? '', y, margin);
  y = fullRow(doc, 'Duración del contrato:', c.duracion ?? '12 meses', y, margin);
  y = fullRow(doc, 'Modalidad de contrato:', 'Ahorro garantizado', y, margin);
  y += 2;
  tc(doc, TEXT_DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Resumen de actuaciones de GE y EE', margin, y); y += 4;
  doc.text('Producto: Gestión Energética', margin, y); y += 4;
  doc.text('Forma de pago del producto: Incluido en precio del kWh', margin, y); y += 4;
  doc.text('Todos los importes están excluidos de IVA.', margin, y); y += 4;
  doc.text('El detalle de las soluciones propuestas se muestra en Anexo de Condiciones Económicas e Instalaciones vinculado al presente Contrato.', margin, y);
  y += 8;

  signatureBoxes(doc, y, margin, colW);
  pageFooter(doc, margin, colW, H);
}

// ── Página 2: SEPA ──────────────────────────────────────────────
function pagina2Sepa(doc: jsPDF, c: PdfContratoData, margin: number, colW: number, H: number): void {
  let y = pageTop(doc, 'ORDEN DE DOMICILIACIÓN DE ADEUDO DIRECTO SEPA', 'SEPA DIRECT DEBIT MANDATE', margin, colW);

  tc(doc, TEXT_DARK);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('1. A CUMPLIMENTAR POR VIBRA ENERGIA , S.L. / TO BE COMPLETED BY VIBRA ENERGIA , S.L.', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const acreedor = [
    "Nombre del acreedor / Creditor's name : VIBRA ENERGIA , S.L.",
    'Dirección / Address : PASEO ALAMEDA 38 -46023 VALENCIA,VALENCIA',
    'Código postal - Población - Provincia / Postal Code - City - Town : 46023 - VALENCIA - VALENCIA',
    'País / Country : ESPAÑA',
    'Suministro contratado / Supply contracted : Electricidad',
    'Dirección del punto de suministro / Supply point address : ' + (c.direccion_suministro ?? ''),
    'C.U.P.S. / Supply Point Identification U.S.P.C. : ' + (c.cups?.join(', ') ?? ''),
  ];
  acreedor.forEach(l => { doc.text(l, margin, y); y += 4.5; });
  y += 3;

  const legal1 = doc.splitTextToSize(
    'Mediante la firma de esta orden de domiciliación, el cliente autoriza (A) a VIBRA ENERGIA , S.L. a enviar instrucciones a la entidad del cliente para adeudar en su cuenta y (B) a la entidad para efectuar los adeudos en su cuenta siguiendo las instrucciones de VIBRA ENERGIA, S.L. Como parte de sus derechos, el cliente está legitimado al reembolso por su entidad en los términos y condiciones del contrato suscrito con la misma. La solicitud de reembolso deberá efectuarse dentro de las ocho semanas que siguen a la fecha de adeudo en cuenta. Puede obtener información adicional sobre sus derechos en su entidad financiera.',
    colW);
  doc.setFontSize(8);
  doc.text(legal1, margin, y);
  y += legal1.length * 3.5 + 3;

  const legal2 = doc.splitTextToSize(
    'By signing this mandate form, you authorise (A) VIBRA ENERGIA , S.L. to send instructions to your bank to debit your account and (B) your bank to debit your account in accordance with the instructions from VIBRA ENERGIA , S.L.. As part of your rights, you are entitled to a refund from your bank under the terms and conditions of your agreement with your bank. A refund must be claimed within eight weeks starting from the date on which your account was debited. Your rights are explained in a statement that you can obtain from your bank.',
    colW);
  doc.text(legal2, margin, y);
  y += legal2.length * 3.5 + 5;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('2. A CUMPLIMENTAR POR EL TITULAR / TO BE COMPLETED BY THE ACCOUNT HOLDER', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);

  const titular = [
    "Nombre del titular (titular de la cuenta de cargo) / Account holder's name : " + (c.nombre_cliente ?? ''),
    'N.I.F./C.I.F. / Tax ID number : ' + (c.cif ?? ''),
    'Dirección del titular / Address of the account holder : ' + (c.direccion_fiscal ?? ''),
    'Código postal - Población - Provincia / Postal Code - City - Town : ' +
      [c.cp_fiscal ?? c.cp ?? '', c.municipio_fiscal ?? c.municipio ?? '', c.provincia_fiscal ?? c.provincia ?? ''].filter(Boolean).join(' - '),
    'País del titular / Country of the account holder :   España',
    'Swift BIC / Swift BIC :',
    'Número de cuenta - IBAN / Account number - IBAN : ' + (c.numero_cuenta_bancaria ?? ''),
  ];
  titular.forEach(l => { doc.text(l, margin, y); y += 4.5; });
  y += 4;

  signatureBoxes(doc, y, margin, colW);
  pageFooter(doc, margin, colW, H);
}

// ── Página 3: Condiciones generales ─────────────────────────────
const CLAUSULAS = [
  ['1.- OBJETO DEL CONTRATO', '1.1. El objeto de las presentes Condiciones Generales del contrato de servicios energéticos (en adelante las "Condiciones Generales") es establecer las condiciones de los servicios energéticos proporcionados por VIBRA ENERGIA , S.L. (en adelante "VIBRA ENERGIA") en el/los punto/s de suministro correspondiente/s a las instalaciones del CLIENTE que se indican en las Condiciones Particulares, así como la prestación de servicios adicionales indicados, en su caso, indicados en las Condiciones Particulares. El contrato de servicios energéticos se compone de los siguientes documentos contractuales (en adelante, conjuntamente, el "Contrato"): Condiciones Particulares, Condiciones Generales y Anexo de Condiciones Económicas e Instalaciones, cuando éstas, no estén estipuladas en las Condiciones Particulares.'],
  ['2.- PUNTO DE SUMINISTRO E INSTALACIONES DEL CLIENTE', '2.1. A los efectos de lo estipulado en el Contrato, se entiende por punto de suministro el punto de conexión o entrega situado en las instalaciones del CLIENTE en las que se lleva a cabo la medida de consumo de energía eléctrica suministrada por la comercializadora elegida por VIBRA ENERGIA. 2.2. El CLIENTE se obliga a: (i) Mantener las instalaciones objeto del suministro en las condiciones técnicas y de seguridad adecuadas, así como a facilitar la documentación que acredite que tales instalaciones cumplen dichas condiciones a requerimiento de VIBRAENERGIA. Toda adecuación técnica será siempre por cuenta del CLIENTE. VIBRAENERGIA no podrá ser considerado bajo ningún concepto responsable por hechos relacionados con la instalación, operación, manipulación de equipos de medida y/o mantenimiento de la energía eléctrica en las instalaciones del CLIENTE o de los daños causados por la energía eléctrica, asumiendo total responsabilidad el CLIENTE de todo tipo de penalizaciones o sanciones derivadas de los hechos anteriormente citados.'],
  ['3.- EQUIPOS DE MEDIDA DE ENERGÍA ELÉCTRICA', '3.1. La medida del consumo de la energía eléctrica se realizará en el punto de medida y facturación situado en las instalaciones del CLIENTE. Las potencias contratadas a las que se efectúa el suministro se especifican en las Condiciones Particulares, siendo las potencias máximas que el CLIENTE puede consumir de acuerdo con el Contrato serán determinadas conforme a lo dispuesto en la normativa aplicable a tal efecto. VIBRAENERGIA tendrá potestad para optimizar las potencias contratadas pudiendo así realizar subidas o bajadas en beneficio del CLIENTE y a su vez de VIBRA ENERGIA .'],
  ['4.- SUMINISTRO DE ENERGÍA ELÉCTRICA', '4.1. Las condiciones para el inicio del contrato con VIBRAENERGIA: a) Que el CLIENTE se encuentre al corriente en el pago de su punto de suministro eléctrico. b) Que, tras el análisis efectuado por VIBRAENERGIA, el CLIENTE acredite la solvencia necesaria para garantizar el pago de las facturas del servicio de gestión energética que vaya a llevarse a cabo con el Cliente, a satisfacción de VIBRAENERGIA.'],
  ['5.- PRESTACIÓN DE SERVICIOS ENERGÉTICOS', 'VIBRAENERGIA prestará al CLIENTE los servicios adicionales, cuya descripción y condiciones específicas se detallan, en su caso, en las Condiciones Particulares y/o en el Anexo de condiciones económicas e Instalaciones.'],
  ['6.- PRECIO DEL SUMINISTRO DE ENERGÍA ELÉCTRICA', '6.1. El CLIENTE vendrá obligado a pagar a VIBRAENERGIA por el suministro de energía eléctrica el precio que se determina en las Condiciones Particulares y, en su caso, el Anexo de Condiciones Económicas. En particular, el precio mencionado no incluye, entre otros, los siguientes conceptos: el coste del alquiler del equipo de medida y/u otros componentes (en su caso). 6.2. El precio del suministro de energía eléctrica incluye únicamente los conceptos específicamente detallados en las Condiciones Particulares y, en su caso, en las Condiciones Económicas.'],
  ['7.- FACTURACIÓN', '7.1. El coste de energía eléctrica se facturará con el importe correspondiente al consumo de energía eléctrica con los datos que le facilite la comercializadora contratada por VIBRAENERGIA o la Empresa Distribuidora del suministro objeto del contrato. El período de facturación por defecto será el que establezca la compañía Distribuidora en sus lecturas.'],
  ['8.- AUTORIZACIONES', 'El CLIENTE autoriza a VIBRAENERGIA todos los derechos relativos al contrato de acceso con la Empresa Distribuidora durante la duración del contrato y, otorgándole permisos para realizar bajas temporales del suministro, cambios de comercializadora, cambios en las potencias contratadas, y/o cualquier cambio que VIBRAENERGIA considere necesario para el beneficio de ambas partes.'],
  ['9.- PERFECCIONAMIENTO DEL CONTRATO, ENTRADA EN VIGOR Y DURACIÓN', '9.1. El perfeccionamiento del Contrato tendrá lugar desde el momento en que se cumplan todas y cada una (de) suscripción por parte de VIBRAENERGIA y del CLIENTE de toda la documentación contractual (Condiciones Particulares, Condiciones Generales, y, en su caso, Anexo de Condiciones Económicas e Instalaciones). (ii) Entrega por parte del CLIENTE a VIBRAENERGIA de la citada documentación original y/o en formato digital, debidamente firmada junto con el resto de documentos especificados en las Condiciones Particulares.'],
  ['10.- RESOLUCIÓN', '10.1. El Contrato podrá quedar resuelto en los siguientes casos: Por acuerdo entre las Partes. A instancia de una de las Partes, previa comunicación por escrito a la otra, por alguna de las siguientes causas: a) En caso de incumplimiento de alguna de las obligaciones derivadas del Contrato, en especial, y con carácter enunciativo y no limitativo, por el impago de las facturas por parte del cliente, o por la negativa.'],
  ['12.- CONFIDENCIALIDAD', '12.1. Las Partes se comprometen a no divulgar el contenido del Contrato a terceros sin el previo expreso acuerdo de la otra Parte.'],
  ['13.- PROTECCIÓN DE DATOS', '13.1. De conformidad con lo dispuesto en la normativa vigente relativa a la protección de datos de carácter personal, VIBRAENERGIA le informa que los datos personales recabados con la firma de este Contrato y aquellos que el CLIENTE suministre durante la prestación de los servicios y vigencia de la relación contractual, serán incorporados a un tratamiento del cual es responsable VIBRAENERGIA, a los efectos de adecuar los servicios ofertados a las necesidades del CLIENTE, así como para traslado a la Empresa Distribuidora del CLIENTE los datos necesarios para la formalización del contrato de acceso, en su caso.'],
  ['14.- CESIÓN Y SUBCONTRATACIÓN', '14.1. VIBRAENERGIA podrá ceder total o parcialmente el Contrato y sus derechos y obligaciones a cualquiera de las empresas de su grupo, sean matrices, filiales o filiales de cualquiera de las matrices, asumiendo el cesionario todos los derechos y obligaciones del cedente y subrogándose a tales efectos en los mismos, comunicándolo al CLIENTE de forma fehaciente.'],
  ['15.- RENUNCIA', 'La renuncia expresa o presunta de una de las Partes en un momento determinado de alguno de los derechos previstos en el Contrato, no supondrá renuncia alguna al ejercicio de ese mismo derecho en otro momento o al ejercicio de cualquier otro de los derechos previstos en el mismo, a menos que éste sea realizado por escrito y firmado por el representante de la Parte renunciante.'],
  ['16.- CAMBIOS REGULATORIOS. INVALIDEZ', '16.1. En el caso de un cambio en la modificación legal que pudiera producirse durante el período de vigencia del mismo y, en particular, cualquier cambio en la normativa que tenga como resultado una modificación de las Condiciones Particulares o una modificación que afecte al Suministro.'],
  ['17.- NOTIFICACIONES', 'Todas las notificaciones y comunicaciones que hayan de realizarse en virtud del Contrato deberán efectuarse por cualquier medio que acredite su recepción, bien a la dirección del domicilio social de VIBRAENERGIA o bien a la dirección del titular del Contrato, que a estos efectos las Partes hayan señalado en las Condiciones Particulares al contrato.'],
  ['18.- INFORMACIÓN Y/O REGULACIONES', 'Sin perjuicio de lo establecido en la Cláusula 23, el CLIENTE podrá solicitar información y/o realizar las reclamaciones que estime pertinentes en relación con el Contrato por escrito a: PASEO ALAMEDA 38 46023 VALENCIA, a través del teléfono de atención al cliente: 604 17 66 45, o a la dirección electrónica de atención al cliente VIBRAENERGIA.com. El CLIENTE declara haber recibido, conocer y aceptar las presentes Condiciones Generales.'],
];

function pagina3Condiciones(doc: jsPDF, margin: number, colW: number, H: number): void {
  const colGap = 4;
  const colWidth = (colW - colGap) / 2;
  const yStart = 34;
  const yBottom = H - 22;

  pageTop(doc, 'Condiciones Generales', null, margin, colW);
  let col: 0 | 1 = 0;
  let y = yStart;

  const nextSlot = (): void => {
    if (col === 0) {
      col = 1;
      y = yStart;
    } else {
      pageFooter(doc, margin, colW, H);
      doc.addPage();
      pageTop(doc, 'Condiciones Generales', null, margin, colW);
      col = 0;
      y = yStart;
    }
  };

  CLAUSULAS.forEach(([titulo, cuerpo]) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    const tituloLines = doc.splitTextToSize(titulo, colWidth) as string[];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    const cuerpoLines = doc.splitTextToSize(cuerpo, colWidth) as string[];
    const altura = tituloLines.length * 3.5 + 1 + cuerpoLines.length * 2.8 + 2.5;

    if (y + altura > yBottom) nextSlot();

    const x = col === 0 ? margin : margin + colWidth + colGap;
    tc(doc, TITLE_BLUE);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(tituloLines, x, y);
    y += tituloLines.length * 3.5 + 1;
    tc(doc, TEXT_DARK);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(cuerpoLines, x, y);
    y += cuerpoLines.length * 2.8 + 2.5;
  });

  pageFooter(doc, margin, colW, H);
}

// ── Página 4: Firmas + Anexo condiciones económicas ─────────────
function pagina4Anexo(doc: jsPDF, margin: number, colW: number, H: number): void {
  let y = pageTop(doc, '', null, margin, colW);
  y = signatureBoxes(doc, y + 8, margin, colW);

  y += 6;
  hairline(doc, y, margin, colW); y += 6;

  tc(doc, TITLE_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ANEXO DE CONDICIONES ECONÓMICAS E INSTALACIONES', margin, y); y += 6;
  doc.text('RELACIÓN DE SOLUCIONES DE GESTION ENERGÉTICA Y EFICIENCIA ENERGÉTICA', margin, y); y += 8;

  const soluciones = ['Gestión Energética', 'AVR', 'Contador Telemedida', 'Baterías Condensadores', 'Iluminación LED', 'Otros'];
  const cellW = colW / soluciones.length;
  dr(doc, BOX_BORDER);
  doc.setLineWidth(0.3);
  fl(doc, WHITE);
  doc.rect(margin, y, colW, 8, 'FD');
  tc(doc, TEXT_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  soluciones.forEach((s, i) => {
    const w = doc.getTextWidth(s);
    doc.text(s, margin + cellW * i + (cellW - w) / 2, y + 5);
  });
  y += 8;
  doc.rect(margin, y, colW, 8);
  soluciones.forEach((_, i) => {
    checkbox(doc, margin + cellW * i + cellW / 2 - 1.5, y + 2.5, i === 0);
  });
  y += 12;

  const descs: Array<[string, string]> = [
    ['Gestión Energética', 'La Gestión Energética implementada por VIBRA ENERGIA permite una reducción del coste por la mejora de las condiciones de contratación actual del CLIENTE.'],
    ['AVR', 'Instalación de Regulador de Voltaje Automático con la finalidad de ahorro en el consumo energético y evitar sobretensiones y microcortes de la red eléctrica.'],
    ['Contador Telemedida', 'Instalación de un equipo de telemedida y/o cambio del contador fiscal con la plataforma de monitorización energética y parametrización de alarmas para la correcta gestión energética del suministro.'],
    ['Baterías de Condensadores', 'Instalación de baterías de condensadores para la compensación de energía reactiva.'],
    ['Iluminación LED', 'Instalación de sistema de iluminación inteligente LED para la reducción de los costes energéticos reduciendo el consumo del suministro.'],
    ['Otros', 'Otro tipo de soluciones que permitan la reducción de los costes energéticos como es la modificación de cuadros eléctricos como consecuencia de incrementar la potencia, reducirla o cualquier cambio que mejore la eficiencia del suministro.'],
  ];
  descs.forEach(([t, d]) => {
    tc(doc, TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(t, margin, y); y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(d, colW);
    doc.text(lines, margin, y);
    y += lines.length * 3 + 3;
  });

  y += 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Valoración de los bienes en relación a las Soluciones GE y EE', margin, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  const valoracion = [
    'El importe total de la inversión de las Soluciones GE y EE es de € + IVA incluyendo la instalación, estudio y proyecto de las actuaciones a realizar.',
    'El pago se realizara fraccionado en cada factura emitida por VIBRA ENERGIA , estando pendiente de la aprobación de financiación para el importe indicado tras la firma del presente contrato, la cual tendrá una duración de 12 meses desde la finalización de la instalación de las soluciones GE y EE propuestas.',
    'El ahorro anual sumando las diferentes Soluciones GE y EE propuestas será de €, el cual podrá ser estudiado cada 12 meses por posibles variaciones en los hábitos de consumo del CLIENTE.',
  ];
  valoracion.forEach(t => {
    const lines = doc.splitTextToSize(t, colW);
    doc.text(lines, margin, y);
    y += lines.length * 3 + 2;
  });

  pageFooter(doc, margin, colW, H);
}

// ── Página 5: Condiciones económicas personalizadas ─────────────
function pagina5Economicas(doc: jsPDF, c: PdfContratoData, margin: number, colW: number, H: number): void {
  let y = pageTop(doc, '', null, margin, colW);

  tc(doc, TITLE_BLUE);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('CONDICIONES ECONOMICAS PERSONALIZADAS', margin, y); y += 8;

  tc(doc, TEXT_DARK);
  doc.setFontSize(10);
  doc.text('PROMOCION ESPECIAL', margin, y); y += 6;

  const tarifa = getTarifa(c);
  const productoNombre = c.ofertas?.[0]?.nombre_producto ?? 'PRODUCTO COMERCIAL';
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('TARIFA', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(c.tarifa ?? '2.0TD', margin + 30, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('TARIFA', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(productoNombre, margin + 30, y); y += 8;

  tc(doc, TITLE_BLUE);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Condiciones económicas', margin, y); y += 6;

  const colW2 = colW / 2;
  const rows: Array<[string, number | null | undefined, string, number | null | undefined]> = [
    ['Precio potencia P1:', tarifa?.potencia_p1, 'Precio energía P1:', tarifa?.energia_p1],
    ['Precio potencia P2:', tarifa?.potencia_p2, 'Precio energía P2:', tarifa?.energia_p2],
    ['Precio potencia P3:', tarifa?.potencia_p3, 'Precio energía P3:', tarifa?.energia_p3],
    ['Precio potencia P4:', tarifa?.potencia_p4, 'Precio energía P4:', tarifa?.energia_p4],
    ['Precio potencia P5:', tarifa?.potencia_p5, 'Precio energía P5:', tarifa?.energia_p5],
    ['Precio potencia P6:', tarifa?.potencia_p6, 'Precio energía P6:', tarifa?.energia_p6],
  ];
  tc(doc, TEXT_DARK);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  rows.forEach(([lp, vp, le, ve]) => {
    doc.text(lp, margin, y);
    doc.text(vp != null ? num(vp) : 'Según anexo', margin + colW2 - 25, y);
    doc.text(le, margin + colW2, y);
    doc.text(ve != null ? num(ve) : 'Según anexo', margin + colW - 25, y);
    y += 5;
  });
  y += 4;

  doc.setFontSize(7.5);
  const t1 = doc.splitTextToSize(
    'Para los puntos de suministro peninsulares, a los precios de luz también se añadira el coste regulado de la financiacion del tope del gas establecido en el RDL 10/2022. Esta medida aprobada por el gobierno establece un tope al coste del gas que se aplica para la generacion de electricidad, y entre otros aspectos , supone un coste regulado adicional para financiar la propia medida. Este coste regulado se incluira en la factura bajo el concepto "coste tope del gas RDL 10/2022".',
    colW);
  doc.text(t1, margin, y); y += t1.length * 3 + 3;

  const t2 = doc.splitTextToSize(
    'Para la configuración de las presentes condiciones económicas se han tenido en cuenta los peajes de acceso previstos en la Orden TEC/1366/2018, de 20 de diciembre. Los precios indicados no incluyen IVA ni el impuesto eléctrico. Las variaciones que se produzcan en los peajes de acceso, cargos, tributos y/o cualquiera otros de los impuestos que sean de aplicación, incluso los de nueva creación, se repercutirán al cliente al alza o a la baja según proceda. La potencia contratada y los excesos de potencia se facturarán según el precio establecido en el contrato. Los precios se actualizarán cada 1 de enero de acuerdo a la variación del IPC, siendo éste el valor acumulado real del Índice de Precios al Consumo General publicado por el Instituto Nacional de Estadística del período de noviembre a noviembre del año anterior a la aplicación de la variación. En caso de resolución unilateral anticipada del contrato de suministro de electricidad por parte del Cliente, antes de iniciada la primera prórroga, podrá serle aplicada una penalización de hasta un 5% del precio del contrato por la energía estimada pendiente de suministro.',
    colW);
  doc.text(t2, margin, y); y += t2.length * 3 + 5;

  signatureBoxes(doc, y, margin, colW);
  pageFooter(doc, margin, colW, H);
}

// ── Servicio ────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class VibraContratoPdfService {
  async generarPdf(contrato: PdfContratoData): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 15;
    const colW = 210 - margin * 2;
    const H = 297;

    pagina1(doc, contrato, margin, colW, H);
    doc.addPage(); pagina2Sepa(doc, contrato, margin, colW, H);
    doc.addPage(); pagina3Condiciones(doc, margin, colW, H);
    doc.addPage(); pagina4Anexo(doc, margin, colW, H);
    doc.addPage(); pagina5Economicas(doc, contrato, margin, colW, H);

    const nombre = (contrato.nombre_cliente ?? 'contrato').replace(/\s+/g, '_');
    doc.save(`Contrato_VIBRA_${nombre}.pdf`);
  }
}
