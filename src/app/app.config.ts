import {
  APP_INITIALIZER,
  ApplicationConfig,
  LOCALE_ID,
  PLATFORM_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { isPlatformBrowser, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/auth/auth.interceptor';
import { maintenanceInterceptor } from './core/http/maintenance.interceptor';
import { AuthService } from './core/auth/auth.service';
import { MasterDataService } from './core/services/master-data.service';

registerLocaleData(localeEs, 'es-ES');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    provideRouter(routes, withComponentInputBinding()),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: '.dark' } },
    }),
    MessageService,
    ConfirmationService,
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, maintenanceInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [PLATFORM_ID],
      useFactory: (platformId: object) => () => {
        if (isPlatformBrowser(platformId)) {
          document.title = environment.appTitle;
        }
      },
    },
    {
      // Hydrate master-data signals from the IndexedDB cache before the first
      // route renders. Only fires when a valid session already exists (page
      // refresh / tab restore). Does NOT hit the network — that happens in the
      // Layout component so the interceptor has a live token.
      provide: APP_INITIALIZER,
      multi: true,
      deps: [PLATFORM_ID, AuthService, MasterDataService],
      useFactory:
        (platformId: object, auth: AuthService, masterData: MasterDataService) => async () => {
          if (isPlatformBrowser(platformId) && auth.isAuthenticated()) {
            await masterData.initialize();
          }
        },
    },
  ],
};
