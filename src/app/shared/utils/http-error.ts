import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje para el usuario: errores de validación por campo, el mensaje del backend o el de reserva. */
export function mensajeError(err: HttpErrorResponse, reserva: string): string {
  const campos = err.error?.validationErrors as Record<string, string> | undefined;
  if (campos && Object.keys(campos).length) return Object.values(campos).join('. ');
  return err.error?.message ?? reserva;
}

/** Igual que mensajeError para peticiones con responseType 'blob' (el JSON de error llega como Blob). */
export async function mensajeErrorBlob(err: HttpErrorResponse, reserva: string): Promise<string> {
  if (err.error instanceof Blob) {
    try {
      return JSON.parse(await err.error.text())?.message ?? reserva;
    } catch {
      return reserva;
    }
  }
  return mensajeError(err, reserva);
}
