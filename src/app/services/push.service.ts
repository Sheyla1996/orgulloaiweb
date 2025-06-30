// push.service.ts
import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushService {
  private isSubscribedSubject = new BehaviorSubject<boolean>(false);
  isSubscribed$ = this.isSubscribedSubject.asObservable();
  readonly publicKey = 'BEViErh-fOZsxN-2KakVHn4ZLGdQRrHBJ-FrhUnEPM0QGJGHaZLt6fkXGKeRvTYoj69bI6yXDmTPiy3b-1Fx-NE'; // Copiada del paso 1
  private isSupported = false;

  constructor() {
    this.checkSupport();
    if (this.isSupported) {
      this.checkSubscription();
    }
  }

  private checkSupport(): boolean {
    this.isSupported = 
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      !/iPad|iPhone|iPod/.test(navigator.userAgent);
    
    console.log('Push Service Support check:', this.isSupported);
    return this.isSupported;
  }

  // Verifica al iniciar si ya está suscrito
  async checkSubscription() {
    if (!this.isSupported) {
      console.log('Push notifications not supported in this browser');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      this.isSubscribedSubject.next(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription:', error);
      this.isSubscribedSubject.next(false);
    }
  }

  async subscribeToNotifications(): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported in this browser');
    }

    try {
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
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return new Uint8Array([...raw].map(char => char.charCodeAt(0)));
  }

  async isUserSubscribed(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('Push notifications not supported, returning false');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return false;

      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Error checking user subscription:', error);
      return false;
    }
  }
}
