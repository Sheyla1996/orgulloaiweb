import { Injectable } from '@angular/core';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../enviroments/enviroment';

@Injectable({ providedIn: 'root' })
export class FcmService {
  currentMessage = new BehaviorSubject<string | null>(null);
  private isSupported = false;

  constructor(private messaging: Messaging) {
    this.checkSupport();
  }

  private checkSupport(): boolean {
    // Check if the current environment supports Firebase Messaging
    this.isSupported = 
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      !/iPad|iPhone|iPod/.test(navigator.userAgent);
    
    console.log('FCM Support check:', this.isSupported);
    return this.isSupported;
  }

  requestPermission() {
    if (!this.isSupported) {
      console.log('FCM not supported in this browser');
      return Promise.resolve();
    }

    return Notification.requestPermission().then((permission) => {
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
        }).catch(error => {
          console.error('Error getting FCM token:', error);
        });
      }
    }).catch(error => {
      console.error('Error requesting notification permission:', error);
    });
  }

  listen() {
    if (!this.isSupported) {
      console.log('FCM listen not supported in this browser');
      return;
    }

    try {
      onMessage(this.messaging, (payload) => {
        console.log('Mensaje recibido', payload);
        this.currentMessage.next(payload.notification?.body || null);
        if ('Notification' in window) {
          new Notification(payload?.notification?.title || 'Mensaje', { body: payload?.notification?.body });
        }
      });
    } catch (error) {
      console.error('Error setting up FCM listener:', error);
    }
  }
}
