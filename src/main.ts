import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

try { localStorage.setItem('appBootstrapStarted', String(Date.now())); } catch (e) {}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('firebase-messaging-sw.js')
    .then(reg => console.log('SW registrado', reg))
    .catch(err => console.error('Error SW', err));
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    try { localStorage.setItem('appBootstrapComplete', '1'); } catch (e) {}
    console.log('✅ Angular bootstrap completo');
  })
  .catch(err => {
    try { localStorage.setItem('appBootstrapComplete', '0'); } catch (e) {}
    console.error('❌ Error al hacer bootstrap:', err);
  });