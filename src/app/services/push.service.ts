// push.service.ts
import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushService {
  private isSubscribedSubject = new BehaviorSubject<boolean>(false);
  isSubscribed$ = this.isSubscribedSubject.asObservable();
  readonly publicKey = 'BEViErh-fOZsxN-2KakVHn4ZLGdQRrHBJ-FrhUnEPM0QGJGHaZLt6fkXGKeRvTYoj69bI6yXDmTPiy3b-1Fx-NE'; // Copiada del paso 1

  constructor() {
    this.checkSubscription();
  }

  // Verifica al iniciar si ya está suscrito
  async checkSubscription() {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    this.isSubscribedSubject.next(!!subscription);
  }

  async subscribeToNotifications(): Promise<void> {
    const registration = await navigator.serviceWorker.register('service-worker.js');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permiso de notificación denegado');
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
    });

    // Enviar la suscripción a tu backend
    await fetch('https://apiorgullo.sheylamartinez.es/push/suscribir', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Suscripción enviada:', subscription);
    this.isSubscribedSubject.next(true); // ✅ Notifica a los observadores
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return new Uint8Array([...raw].map(char => char.charCodeAt(0)));
  }

  async isUserSubscribed(): Promise<boolean> {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  }
}
