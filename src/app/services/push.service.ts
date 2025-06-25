// push.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PushService {
  readonly publicKey = 'BEViErh-fOZsxN-2KakVHn4ZLGdQRrHBJ-FrhUnEPM0QGJGHaZLt6fkXGKeRvTYoj69bI6yXDmTPiy3b-1Fx-NE'; // Copiada del paso 1

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
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return new Uint8Array([...raw].map(char => char.charCodeAt(0)));
  }
}
