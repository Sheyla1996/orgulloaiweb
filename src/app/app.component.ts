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
    console.log('ngOnInit started');
    console.log('Platform ID:', this.platformId);
    console.log('isPlatformBrowser check:', isPlatformBrowser(this.platformId));
    
    // Check for iOS Safari specific limitations
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    console.log('Is iOS:', isIOS, 'Is Safari:', isSafari);
    
    // Only initialize FCM if platform supports it
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.fcm.requestPermission();
        console.log('FCM requestPermission completed');
      } catch (error) {
        console.error('Error in FCM requestPermission:', error);
      }
      
      try {
        this.fcm.listen();
        console.log('FCM listen completed');
      } catch (error) {
        console.error('Error in FCM listen:', error);
      }
    } else {
      console.log('Skipping FCM initialization - not browser platform');
    }
    
    console.log('AppComponent initialized');
    
    try {
      this.wsService.connect();
      console.log('WebSocket service connected');
    } catch (error) {
      console.error('Error in WebSocket connect:', error);
    }
    
    try {
      this.subscribeToRouterEvents();
      console.log('Router events subscribed');
    } catch (error) {
      console.error('Error in subscribeToRouterEvents:', error);
    }
    
    try {
      this.subscribeToWebSocketMessages();
      console.log('WebSocket messages subscribed');
    } catch (error) {
      console.error('Error in subscribeToWebSocketMessages:', error);
    }
    
    try {
      this.listenToStorageChanges();
      console.log('Storage changes listener added');
    } catch (error) {
      console.error('Error in listenToStorageChanges:', error);
    }
    
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.setViewportHeight();
        window.visualViewport?.addEventListener('resize', this.setViewportHeight);
        console.log('Viewport height set');
      } catch (error) {
        console.error('Error in viewport setup:', error);
      }
      
      console.log('About to call updateMenu');
      // Update menu after platform browser check
      setTimeout(() => {
        console.log('setTimeout for updateMenu executed');
        this.updateMenu();
      }, 200);
    } else {
      console.log('Not platform browser in ngOnInit');
    }
    
    // Also try calling updateMenu directly without platform check
    console.log('Calling updateMenu directly');
    try {
      this.updateMenuDirect();
    } catch (error) {
      console.error('Error in updateMenuDirect:', error);
    }
    
    try {
      this.cdr.detectChanges();
      console.log('Change detection completed');
    } catch (error) {
      console.error('Error in detectChanges:', error);
    }
  }


  private subscribeToRouterEvents(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        console.log('Router navigation end, calling updateMenu');
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
          console.log('UserType changed in localStorage:', event.newValue);
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
    console.log('testMenu called from console');
    console.log('Current userType:', localStorage?.getItem('userType'));
    console.log('Current menu:', this.menu);
    this.updateMenuDirect();
  }

  private updateMenuDirect(): void {
    console.log('updateMenuDirect called - no platform check');
    try {
      const userType = localStorage?.getItem('userType');
      console.log('UpdateMenuDirect - UserType:', userType);
      
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
        console.log('Menu updated for mañana/test_coor:', this.menu);
      } else if (userType === 'boss') {
        this.menu = [
          ...baseMenu,
          { id: 'carrozas', icon: 'local_shipping' },
          { id: 'admin', icon: 'manage_accounts' }
        ];
        console.log('Menu updated for boss:', this.menu);
      } else {
        this.menu = [...baseMenu];
        console.log('Menu updated for normal user:', this.menu);
      }
      
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error in updateMenuDirect:', error);
    }
  }

  private updateMenu(): void {
    console.log('updateMenu called'); // Debug log
    setTimeout(() => {
      console.log('updateMenu setTimeout executed'); // Debug log
      console.log('isPlatformBrowser:', isPlatformBrowser(this.platformId)); // Debug log
      
      if (!isPlatformBrowser(this.platformId)) {
        console.log('Not platform browser, returning'); // Debug log
        return;
      }
      
      const userType = localStorage.getItem('userType');
      console.log('UpdateMenu - UserType:', userType); // Debug log
      
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
        console.log('Menu updated for mañana/test_coor:', this.menu); // Debug log
      } else if (userType === 'boss') {
        this.menu = [
          ...baseMenu,
          { id: 'carrozas', icon: 'local_shipping' },
          { id: 'admin', icon: 'manage_accounts' }
        ];
        console.log('Menu updated for boss:', this.menu); // Debug log
      } else {
        this.menu = [...baseMenu];
        console.log('Menu updated for normal user:', this.menu); // Debug log
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
