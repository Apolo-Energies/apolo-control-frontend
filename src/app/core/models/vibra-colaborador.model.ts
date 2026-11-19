/** Colaborador Vibra (nombre que vuelca Kilowy) con su comisión por alta. */
export interface VibraColaborador {
  clave: string;
  nombre: string;
  comisionAlta: number | null;
  contratosActivos: number;
  sinComision: boolean;
}

export interface VibraComisionHistorial {
  anterior: number | null;
  nuevo: number;
  usuario: string | null;
  fecha: string;
}
