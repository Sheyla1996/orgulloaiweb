import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../../services/messages.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './list-messages.component.html',
  styleUrls: ['./list-messages.component.scss']
})
export class ChatComponent {
    showSend = false;
    userType: string | null = null;
  messages: any[] = [];

  newMessage = '';
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private _messagesService: MessagesService,
    private _wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.userType = localStorage.getItem('userType');
      this.getMessages();
      this._wsService.messages$.subscribe((msg) => {
        if (msg && msg.type === 'message') {
            this.getMessages();
        }
      });
    }
  }

  getMessages() {
    this._messagesService.getMessages().subscribe((data: any[]) => {
        this.messages = data.map(msg => ({
            text: msg.message,
            hour: new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Madrid' }),
            sent: true
        }));
        this.scrollToBottom();
    }, error => {
        console.error('Error al obtener los mensajes:', error);
    });
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      this._messagesService.sendMessage({ message: this.newMessage }).subscribe(
        (response) => {
            this.newMessage = '';
            this.getMessages();
        },
        (error) => {
          console.error('Error al enviar el mensaje:', error);
        }
        );
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
        setTimeout(() => {
            const el = this.messagesContainer.nativeElement;
            el.scrollTop = el.scrollHeight;
        }, 100); // Delay to ensure the DOM is updated
    }
  }
}
