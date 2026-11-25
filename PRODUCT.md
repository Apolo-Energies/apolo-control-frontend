# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Back-office de Vibra (oficina):** administración, contabilidad y operaciones de Vibra Energies trabajando a diario en PC. Crean y tramitan contratos, generan y emiten facturas de venta a partir de las facturas de compra de las comercializadoras, cobran por remesa SEPA, gestionan devoluciones e impagos y liquidan comisiones a la red comercial. Trabajan muchas horas seguidas: prima la rapidez, ver mucho dato a la vez y pocos clics.
- **Colaboradores (red comercial):** comerciales externos de Vibra que entran a su propio portal para cargar contratos, consultar los suyos y descargar su autofactura. Entran desde el PC y también desde el móvil (confirmado: «mezcla oficina y colaboradores»).

## Product Purpose

Vibra es la sección de Apolo Control que sustituye a Kilowy, el CRM que Vibra usaba hasta ahora: contratos, clientes y suministros, productos y precios, facturación de venta (borrador desde la factura de compra, emisión, envío), remesas SEPA, devoluciones e impagos, equipo de colaboradores y liquidaciones. Éxito: la oficina hace todo su día a día de Vibra en Control sin volver a Kilowy, y cada colaborador se sirve solo.

## Positioning

Control replica el funcionamiento de Kilowy (copiando su comportamiento real, no solo sus pantallas) dentro de la plataforma interna de Apolo, con los datos migrados una sola vez desde Kilowy. La factura de Vibra se construye cruzando tres fuentes: la factura de compra leída por OCR, el contrato del cliente (precios propios o producto, potencias, servicios, IBAN) y la configuración de empresa.

## Operating Context

- Flujo diario: buzón de facturas de compra → borradores → revisión de avisos (margen, precios, periodo) → emitir → enviar por correo → remesa XML que la oficina sube al banco → PDF de devoluciones del banco → impagos y regiros.
- Mensual: liquidación por colaborador (comisión por alta, descuento por baja, +100 € por renovación) y autofactura del colaborador.
- Documentos reales del día a día: facturas de compra en PDF (Endesa, Repsol, Apolo), contratos en PDF con mandato SEPA, ficheros SEPA pain.008, «Relación de impagados» de CaixaBank.
- Mucho volumen tabular: ~600 contratos, ~3.000 facturas, ~100 facturas de compra cada pocos días.

## Capabilities and Constraints

- Frontend Angular 21 (standalone, signals, OnPush), PrimeNG y Tailwind 4, dentro del shell de Apolo Control (menú lateral, tema claro y oscuro). Backend Spring.
- Roles: admin, contabilidad, operaciones, comercial; colaborador solo ve su portal (`/colaborador`).
- Terminología fija del dominio: alta/contrato, CUPS, tarifa de acceso (2.0TD, 3.0TD), P1–P6, potencia €/kW·día, energía €/kWh, impuesto eléctrico, remesa, regiro, devolución, impago, liquidación, autofactura.
- Decisión del usuario (2026-11-25): Vibra mantiene el mundo visual actual de Apolo Control (tema oscuro, menú lateral) — no identidad nueva — y se mejora a fondo dentro de él: orden, tablas, formularios, coherencia entre pantallas y uso en móvil para el colaborador.

## Brand Commitments

- Nombre comercial «Vibra Energies»; razón social «Vibra Energia, SL». Registro IDAE en cabeceras de contratos y facturas.
- No hay logotipo ni colores de marca de Vibra en el repositorio; no se deben inventar como si fueran oficiales.

## Evidence on Hand

- Pantallas actuales de Vibra en `src/app/features/vibra/**` y portal en `src/app/features/colaborador/**` (el usuario las considera desordenadas, feas, difíciles de usar e inconsistentes).
- Referencia funcional: Kilowy (páginas guardadas fuera del repo durante el análisis).
- Ausente: logotipo de Vibra, guía de marca, capturas de referencia aprobadas.

## Product Principles

1. El día a día de la oficina primero: lo frecuente (revisar borradores, emitir, cobrar, gestionar impagos) a un vistazo y en pocos clics.
2. Un mismo lenguaje en todas las pantallas: listas, filtros, estados, acciones y detalles se comportan igual en contratos, facturas, remesas e impagos.
3. El estado del dinero siempre visible y sin ambigüedad: qué está emitido, enviado, en el banco, cobrado o devuelto.
4. Avisos que ayudan a decidir, no ruido: cada aviso dice qué pasa y qué hacer.
5. El colaborador se sirve solo, también desde el móvil.

## Accessibility & Inclusion

Uso prolongado en pantalla: contraste suficiente en claro y oscuro, navegación por teclado en tablas y diálogos, estados que no dependan solo del color.
