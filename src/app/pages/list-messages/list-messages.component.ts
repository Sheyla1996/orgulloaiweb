import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../../services/messages.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WebSocketService } from '../../services/websocket.service';
import { ErrorModalService } from '../../components/error-modal/error-modal.service';

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
  messages: { text: string; hour: string; sent: boolean }[] = [];
  newMessage = '';

  // Mensajes predefinidos para envío rápido
  predefinedMessages: string[] = [
    'Cabecera en marcha',
    'Cabecera en nepturo',
    'Zona Amarilla en marcha',
    'Todos a Coón',
    'Mensaje personalizado',
    'Zona Roja en marcha',
    'Zona Azul en marcha'
  ];

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private messagesService: MessagesService,
    private wsService: WebSocketService,
    private errorModal: ErrorModalService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.userType = localStorage.getItem('userType');
      this.loadMessages();
      this.wsService.messages$.subscribe(msg => {
        if (msg?.type === 'message') {
          this.loadMessages();
        }
      });
    }
  }

  private loadMessages(): void {
    this.messagesService.getMessages().subscribe({
      next: (data: any[]) => {
        this.messages = data.map(msg => ({
          text: msg.message,
          hour: this.formatHour(msg.created_at),
          sent: true
        }));
        this.scrollToBottom();
      },
      error: error => {
        this.handleError(error, 'Error al obtener los mensajes');
      }
    });
  }

  sendMessage(): void {
    const message = this.newMessage.trim();
    if (!message) return;

    this.messagesService.sendMessage({ message, topic: localStorage.getItem('topic') || `global` }).subscribe({
      next: () => {
        this.newMessage = '';
        this.loadMessages();
      },
      error: error => {
        this.handleError(error, 'Error al enviar el mensaje');
      }
    });
  }

  sendPredefined(messageText: string): void {
    this.newMessage = messageText;
    // enviar inmediatamente
    this.sendMessage();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      setTimeout(() => {
        const el = this.messagesContainer!.nativeElement;
        el.scrollTop = el.scrollHeight;
      }, 100);
    }
  }

  private formatHour(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Madrid'
    });
  }

  private handleError(error: any, logMessage: string): void {
    this.errorModal.openDialog(error);
    console.error(`${logMessage}:`, error);
  }
}
