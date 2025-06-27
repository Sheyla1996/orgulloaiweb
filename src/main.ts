import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('firebase-messaging-sw.js')
    .then(reg => console.log('SW registrado', reg))
    .catch(err => console.error('Error SW', err));
}
bootstrapApplication(AppComponent, appConfig)
  .then(() => console.log('✅ Angular bootstrap completo'))
  .catch(err => console.error('❌ Error al hacer bootstrap:', err));