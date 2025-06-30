import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
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
import { FcmService } from './services/fcm.service';
import { getToken } from 'firebase/messaging';
import { MdlFabMenuModule } from '@angular-mdl/fab-menu';
import { MdlPopoverModule } from '@angular-mdl/popover';
import { FabComponent } from './components/fab/fab.component';

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
    NgxSpinnerModule,
    MdlFabMenuModule,
    MdlPopoverModule,
    FabComponent
  ],
  providers: [TitleCasePipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent implements OnInit {
  title = 'orgullo2022';
  menu: MatFabMenu[] = [
      { id: 'messages', icon: 'notifications' },
      { id: 'phones', icon: 'contact_phone' },
      { id: 'asociaciones', icon: 'groups' }
    ];
  notificationsOn = false;

  constructor(
    private router: Router,
    private wsService: WebSocketService,
    private toastr: ToastrService,
    private pushService: PushService,
    private errorModal: ErrorModalService,
    private fcm: FcmService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    
  }

  get currentUrl(): string {
    return this.router.url;
  }
  ngOnInit(): void {
    
    // Check for iOS Safari specific limitations
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    // Only initialize FCM if platform supports it
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.fcm.requestPermission();
      } catch (error) {
        console.error('Error in FCM requestPermission:', error);
      }
      
      try {
        this.fcm.listen();
      } catch (error) {
        console.error('Error in FCM listen:', error);
      }
    } 
    
    
    try {
      this.wsService.connect();
    } catch (error) {
      console.error('Error in WebSocket connect:', error);
    }
    
    try {
      this.subscribeToRouterEvents();
    } catch (error) {
      console.error('Error in subscribeToRouterEvents:', error);
    }
    
    try {
      this.subscribeToWebSocketMessages();
    } catch (error) {
      console.error('Error in subscribeToWebSocketMessages:', error);
    }
    
    try {
      this.listenToStorageChanges();
    } catch (error) {
      console.error('Error in listenToStorageChanges:', error);
    }
    
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.setViewportHeight();
        window.visualViewport?.addEventListener('resize', this.setViewportHeight);
      } catch (error) {
        console.error('Error in viewport setup:', error);
      }
      
      // Update menu after platform browser check
      setTimeout(() => {
        this.updateMenu();
      }, 200);
    } 
    
    // Also try calling updateMenu directly without platform check
    try {
      this.updateMenuDirect();
    } catch (error) {
      console.error('Error in updateMenuDirect:', error);
    }
    
    try {
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error in detectChanges:', error);
    }

    const now = new Date();
    const cutoff = new Date(now.getFullYear(), 6, 4, 13, 0, 0); // July is month 6 (0-based)
    const userType = localStorage.getItem('userType');
    if (
      isPlatformBrowser(this.platformId) &&
      userType &&
      (userType === 'test' || userType === 'test_coor') &&
      now > cutoff
    ) {
      localStorage.removeItem('userType');
      localStorage.removeItem('zone');
      this.router.navigate(['/login']);
    }
  }


  private subscribeToRouterEvents(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateMenu();
      });
  }

  private subscribeToWebSocketMessages(): void {
    this.wsService.messages$.subscribe({
      next: (msg) => this.handleWebSocketMessage(msg),
      error: (err) => this.handleError('Error in WebSocket messages subscription:', err)
    });
  }

  private listenToStorageChanges(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('storage', (event) => {
        if (event.key === 'userType') {
          this.updateMenu();
        }
      });
    }
  }

  private handleWebSocketMessage(msg: any): void {
    if (!msg || !isPlatformBrowser(this.platformId)) return;
    const userType = localStorage.getItem('userType') || 'normal';
    if (msg.type === 'message') {
      this.toastr.success(msg.message, 'Nuevo mensaje:', {
        closeButton: true,
        timeOut: 20000
      });
    } else if (msg.type === 'actualizar_listado_carr' && ['mañana', 'boss', 'willy', 'test_coor'].includes(userType)) {
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

  public refreshMenu(): void {
    this.updateMenu();
  }

  public testMenu(): void {
    this.updateMenuDirect();
  }

  private updateMenuDirect(): void {
    try {
      const userType = localStorage?.getItem('userType');
      
      const baseMenu = [
        { id: 'messages', icon: 'notifications' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'asociaciones', icon: 'groups' }
      ];
      
      if (userType === 'mañana' || userType === 'test_coor') {
        this.menu = [
          ...baseMenu,
          { id: 'carrozas', icon: 'local_shipping' },
        ];
      } else if (userType === 'boss') {
        this.menu = [
          ...baseMenu,
          { id: 'carrozas', icon: 'local_shipping' },
          { id: 'admin', icon: 'manage_accounts' }
        ];
      } else {
        this.menu = [...baseMenu];
      }
      
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error in updateMenuDirect:', error);
    }
  }

  private updateMenu(): void {
    setTimeout(() => {
      
      if (!isPlatformBrowser(this.platformId)) {
        console.log('Not platform browser, returning'); // Debug log
        return;
      }

      const userType = localStorage.getItem('userType');

      const baseMenu = [
        { id: 'messages', icon: 'notifications' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'asociaciones', icon: 'groups' }
      ];

      if (userType === 'mañana' || userType === 'test_coor') {
        this.menu = [
          ...baseMenu,
          { id: 'carrozas', icon: 'local_shipping' },
        ];
      } else if (userType === 'boss') {
        this.menu = [
          ...baseMenu,
          { id: 'carrozas', icon: 'local_shipping' },
          { id: 'admin', icon: 'manage_accounts' }
        ];
      } else {
        this.menu = [...baseMenu];
      }
      
      // Force change detection in iOS
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 100);
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

}
