import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ErrorHandler, Injectable, LOCALE_ID } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authAndSessionInterceptor } from './app/interceptors/auth.interceptor';

import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs, 'es-ES');
registerLocaleData(localeEs, 'es');

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const errorStr = error?.message || error?.toString() || (error?.originalError ? error.originalError.toString() : '') || '';
    const isChunkError = 
      /Loading chunk .* failed/i.test(errorStr) ||
      /ChunkLoadError/i.test(errorStr) ||
      /Expected a JavaScript-or-Wasm module script/i.test(errorStr) ||
      /Failed to fetch dynamically imported module/i.test(errorStr) ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('chunk_reload_timestamp');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('chunk_reload_timestamp', now.toString());
        window.location.reload();
        return;
      }
    }
    console.error('Unhandled Error:', error);
  }
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = reason?.message || reason?.toString() || '';
  if (
    /Loading chunk .* failed/i.test(reasonStr) ||
    /ChunkLoadError/i.test(reasonStr) ||
    /Expected a JavaScript-or-Wasm module script/i.test(reasonStr) ||
    /Failed to fetch dynamically imported module/i.test(reasonStr)
  ) {
    const lastReload = sessionStorage.getItem('chunk_reload_timestamp');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('chunk_reload_timestamp', now.toString());
      window.location.reload();
    }
  }
});

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([authAndSessionInterceptor])),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
}).catch(err => console.error(err));

