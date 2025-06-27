import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { provideToastr } from 'ngx-toastr';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';

import { routes } from './app.routes';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from './enviroments/enviroment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideToastr(),
    provideClientHydration(withIncrementalHydration()),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideMessaging(() => getMessaging())
    // ServiceWorkerModule.register should be added to the imports array of your AppModule, not here
  ]
};
