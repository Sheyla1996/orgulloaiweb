import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFabMenu, MatFabMenuModule } from '@angular-material-extensions/fab-menu';
import { filter } from 'rxjs/operators';
import { WebSocketService } from './services/websocket.service';
import { ToastrService } from 'ngx-toastr';
import { PushService } from './services/push.service';
import { NgxSpinnerModule } from "ngx-spinner";
import { ErrorModalService } from './components/error-modal/error-modal.service';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    RouterModule,
    MatFabMenuModule,
    NgxSpinnerModule
  ],
  providers: [TitleCasePipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent implements OnInit {
  title = 'orgullo2022';
  menu: MatFabMenu[] = [];
  notificationsOn = false;

  constructor(
    private router: Router,
    private wsService: WebSocketService,
    private toastr: ToastrService,
    private pushService: PushService,
    private errorModal: ErrorModalService,
    private swUpdate: SwUpdate,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt: any) => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          if (confirm('Hay una nueva versión disponible. ¿Deseas actualizar?')) {
            if (isPlatformBrowser(this.platformId)) {
              window.location.reload();
            }
          }
        });
    }
  }

  get currentUrl(): string {
    return this.router.url;
  }

  ngOnInit(): void {
    console.log('AppComponent initialized');
    this.wsService.connect();
    this.updateMenu();
    this.subscribeToPushNotifications();
    this.subscribeToRouterEvents();
    this.subscribeToWebSocketMessages();
    if (isPlatformBrowser(this.platformId)) {
      this.setViewportHeight();
      window.visualViewport?.addEventListener('resize', this.setViewportHeight);
    }
  }

  private subscribeToPushNotifications(): void {
    this.pushService.isSubscribed$.subscribe({
      next: (isSubscribed) => this.notificationsOn = isSubscribed,
      error: (err) => this.handleError('Error checking subscription status:', err)
    });
  }

  private subscribeToRouterEvents(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.updateMenu());
  }

  private subscribeToWebSocketMessages(): void {
    this.wsService.messages$.subscribe({
      next: (msg) => this.handleWebSocketMessage(msg),
      error: (err) => this.handleError('Error in WebSocket messages subscription:', err)
    });
  }

  private handleWebSocketMessage(msg: any): void {
    if (!msg || !isPlatformBrowser(this.platformId)) return;
    const userType = localStorage.getItem('userType') || 'normal';
    if (msg.type === 'message') {
      this.toastr.success(msg.message, 'Nuevo mensaje:', {
        closeButton: true,
        timeOut: 20000
      });
    } else if (msg.type === 'actualizar_listado_carr' && ['mañana', 'boss', 'willy'].includes(userType)) {
      this.showCarrozaNotification(msg.carroza);
    }
  }

  private showCarrozaNotification(carroza: any): void {
    const baseOptions = {
      closeButton: true,
      timeOut: 20000,
      disableTimeOut: true
    };
    switch (carroza.status) {
      case 'pendiente':
        this.toastr.error(`La carroza ${carroza.position} - ${carroza.name} está pendiente de llegar`, '', baseOptions);
        break;
      case 'situado':
        this.toastr.warning(`La carroza ${carroza.position} - ${carroza.name} está ya aparcada`, '', baseOptions);
        break;
      case 'aparcando':
        this.toastr.info(`La carroza ${carroza.position} - ${carroza.name} está aparcando`, '', baseOptions);
        break;
    }
  }

  private handleError(message: string, error: any): void {
    this.errorModal.openDialog(error);
    console.error(message, error);
  }

  setViewportHeight = (): void => {
    const vh = (window.visualViewport?.height || window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  private updateMenu(): void {
    const userType = localStorage.getItem('userType');
    const baseMenu: MatFabMenu[] = [
      { id: 'messages', icon: 'notifications' },
      { id: 'phones', icon: 'contact_phone' },
      { id: 'asociaciones', icon: 'groups' }
    ];
    if (userType === 'mañana') {
      this.menu = [
        ...baseMenu.slice(0, 3),
        { id: 'carrozas', icon: 'local_shipping' },
      ];
    } else if (userType === 'boss') {
      this.menu = [
        ...baseMenu.slice(0, 3),
        { id: 'carrozas', icon: 'local_shipping' },
        { id: 'admin', icon: 'manage_accounts' }
      ];
    } else {
      this.menu = baseMenu;
    }
  }

  onChangeMenu(event: string | number): void {
    const routes: Record<string, string> = {
      asociaciones: '/asociaciones',
      carrozas: '/carrozas',
      phones: '/telefonos',
      admin: '/admin',
      messages: '/messages'
    };
    if (event === 'logout') {
      localStorage.removeItem('userType');
      localStorage.removeItem('zone');
      this.router.navigate(['/login']);
    } else if (routes[event as string]) {
      this.router.navigate([routes[event as string]]);
    } else {
      console.warn('Unknown menu item:', event);
    }
  }

  activarNotificaciones(): void {
    this.pushService.subscribeToNotifications()
      .then(() => alert('Recibirás las notificaciones de la app.'))
      .catch(error => this.handleError('Error subscribing to notifications:', error));
  }
}
