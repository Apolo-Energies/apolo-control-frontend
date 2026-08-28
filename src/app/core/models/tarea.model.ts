export type PrioridadTarea = 'BAJA' | 'NORMAL' | 'ALTA';
export type EstadoTarea = 'PENDIENTE' | 'REALIZADA';

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  fechaVencimiento: string;
  usuarioEmail: string | null;
  completada: boolean;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  esGeneral: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TareaRequest {
  titulo: string;
  descripcion?: string | null;
  fechaVencimiento: string;
  usuarioEmail?: string | null;
  prioridad?: PrioridadTarea;
  estado?: EstadoTarea;
}

export interface TareaStats {
  totalHoy: number;
  pendientesHoy: number;
  completadasHoy: number;
  tareasHoy: Tarea[];
}
