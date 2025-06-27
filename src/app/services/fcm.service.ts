import { Injectable } from '@angular/core';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../enviroments/enviroment';

@Injectable({ providedIn: 'root' })
export class FcmService {
  currentMessage = new BehaviorSubject<string | null>(null);

  constructor(private messaging: Messaging) {}

  requestPermission() {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        getToken(this.messaging, {
          vapidKey: environment.firebaseConfig.vapidKey
        }).then(async token => {
          console.log('Token:', token);
          await fetch('https://apiorgullo.sheylamartinez.es/push/suscribir', {
            method: 'POST',
            body: JSON.stringify({ token }),
            headers: { 'Content-Type': 'application/json' }
          });
          // 👉 Manda el token a tu backend para enviar notificaciones
        });
      }
    });
  }

  listen() {
    onMessage(this.messaging, (payload) => {
      console.log('Mensaje recibido', payload);
      this.currentMessage.next(payload.notification?.body || null);
      new Notification(payload?.notification?.title || 'Mensaje', { body: payload?.notification?.body });
    });
  }
}
