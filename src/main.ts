import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => console.log('✅ Angular bootstrap completo'))
  .catch(err => console.error('❌ Error al hacer bootstrap:', err));