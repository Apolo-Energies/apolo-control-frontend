/** Valor de aria-sort de una cabecera: solo la columna activa lo lleva. */
export function ariaSort(activa: boolean, dir: 'asc' | 'desc'): 'ascending' | 'descending' | null {
  return activa ? (dir === 'asc' ? 'ascending' : 'descending') : null;
}
