/**
 * Tema oficial de marca Apolo para el loader.
 * Este proyecto es single-brand (apolo) — los assets están en /public/apolo/.
 */
export interface LoaderTheme {
  logoSrc: string;
  wordmark: string;
  ringColor: string;
  accentColor: string;
  glowColor: string;
  backdrop: string;
}

export const APOLO_THEME: LoaderTheme = {
  logoSrc: '/apolo/isotipo_blanco.svg',
  wordmark: 'Apolo Control',
  ringColor: '#12aff0',
  accentColor: '#7dd3fc',
  glowColor: 'rgba(56, 189, 248, 0.55)',
  backdrop: 'rgba(7, 11, 20, 0.82)',
};
