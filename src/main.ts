import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Polyfills solo si el navegador no lo soporta: <input switch>, popover (menú «Más») y focusgroup (pestañas, menús)
if (!('switch' in HTMLInputElement.prototype)) {
  void import('input-switch-polyfill');
}
if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
  void import('@oddbird/popover-polyfill');
}
if (!Object.hasOwn(HTMLElement.prototype, 'focusGroup')) {
  void import('@microsoft/focusgroup-polyfill').then(({ polyfillBodyAndObserve }) => polyfillBodyAndObserve());
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
