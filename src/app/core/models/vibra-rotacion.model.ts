export interface RotacionSemestralPayload {
  comercializadora: string;
}

export interface RotacionSemestralResponse {
  elegibles: number;
  actualizados: number;
  comercializadora: string;
  cutoff: string;
  dryRun: boolean;
}

export interface RotacionElegiblesResponse {
  elegibles: number;
  cutoff: string;
}

export interface VibraImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  dryRun: boolean;
}
