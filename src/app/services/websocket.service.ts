import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  public messages$ = this.messageSubject.asObservable();


  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  connect(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.socket) return;

      this.socket = new WebSocket('wss://apiorgullo.sheylamartinez.es/ws');

      this.socket.onopen = () => {
        console.log('✅ WebSocket conectado');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageSubject.next(data);
        } catch (e) {
          console.error('❌ Error al parsear mensaje:', event.data);
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.socket.onclose = (error) => {
        console.warn('🔌 WebSocket desconectado', error);
        this.socket = null;
      };
    }
  }

  send(data: any): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(data));
      }
    }
  }

  disconnect(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
    }
  }
}
