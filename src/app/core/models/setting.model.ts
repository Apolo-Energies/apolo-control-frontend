export type SettingTipo = 'BOOLEAN' | 'TEXT' | 'INTEGER' | 'DECIMAL' | 'JSON';

export interface AppSetting {
  id: string;
  clave: string;
  valor: string | null;
  tipo: SettingTipo;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettingRequest {
  clave: string;
  valor: string | null;
  tipo: SettingTipo;
  nombre: string;
  descripcion?: string | null;
  categoria: string;
}
