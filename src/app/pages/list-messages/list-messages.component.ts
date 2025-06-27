import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../../services/messages.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WebSocketService } from '../../services/websocket.service';
import { NgxSpinnerService } from 'ngx-spinner';
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

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private messagesService: MessagesService,
    private wsService: WebSocketService,
    private spinner: NgxSpinnerService,
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
    this.spinner.show();
    this.messagesService.getMessages().subscribe({
      next: (data: any[]) => {
        this.messages = data.map(msg => ({
          text: msg.message,
          hour: this.formatHour(msg.created_at),
          sent: true
        }));
        this.scrollToBottom();
        this.spinner.hide();
      },
      error: error => {
        this.handleError(error, 'Error al obtener los mensajes');
      }
    });
  }

  sendMessage(): void {
    const message = this.newMessage.trim();
    if (!message) return;

    this.spinner.show();
    this.messagesService.sendMessage({ message }).subscribe({
      next: () => {
        this.newMessage = '';
        this.loadMessages();
      },
      error: error => {
        this.handleError(error, 'Error al enviar el mensaje');
      }
    });
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
    this.spinner.hide();
  }
}
