/** Paso en segundo plano de la migración desde Kilowy. */
export interface TrabajoMigracionKilowy {
  enCurso: boolean;
  hechos: number;
  total: number;
  errores: number;
  mensaje: string | null;
  error: string | null;
  inicio: string | null;
  fin: string | null;
}

export interface EstadoMigracionKilowy {
  kilowyConfigurado: boolean;
  syncHabilitado: boolean;
  altasKilowy: number;
  clientes: number;
  clientesConCalle: number;
  facturasKilowy: number;
  facturasConPdf: number;
  ultimaRemesa: number;
  /** Claves de app_setting de empresa aún vacías. */
  empresaVacios: string[];
  clientesCalle: TrabajoMigracionKilowy;
  pdfs: TrabajoMigracionKilowy;
}

export interface RemesasMigracionKilowy {
  ultimaKilowy: number;
  ultimaControl: number;
}

export interface EmpresaMigracionKilowy {
  rellenados: string[];
  yaConValor: string[];
  sinDatoEnKilowy: string[];
}
