import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  public messages$ = this.messageSubject.asObservable();

  connect(): void {
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

    this.socket.onclose = () => {
      console.warn('🔌 WebSocket desconectado');
      this.socket = null;
    };
  }

  send(data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }
}
