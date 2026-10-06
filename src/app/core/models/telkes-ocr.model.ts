/** Datos extraidos de una factura electrica via OCR del backend. */
export interface TelkesOcrResult {
  nombre: string | null;
  documentoNum: string | null;
  tipoDocumento: string | null;
  cups: string | null;
  tarifaAcceso: string | null;

  direccion: string | null;
  numero: string | null;
  pisoPuerta: string | null;
  poblacion: string | null;
  provincia: string | null;
  codigoPostal: string | null;

  p1: string | null;
  p2: string | null;
  p3: string | null;
  p4: string | null;
  p5: string | null;
  p6: string | null;
}
