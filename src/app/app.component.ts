import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { filter } from 'rxjs/operators';
import { WebSocketService } from './services/websocket.service';
import { ToastrService } from 'ngx-toastr';
import { PushService } from './services/push.service';
import { NgxSpinnerModule } from "ngx-spinner";
import { ErrorModalService } from './components/error-modal/error-modal.service';
import { FcmService } from './services/fcm.service';
import { BottomNavigation } from './components/bottom-navigation/bottom-navigation';
import { SettingsService } from './services/settings.service';
import { LocationSharingService } from './services/location-sharing.service';
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
    NgxSpinnerModule,
    BottomNavigation
  ],
  providers: [TitleCasePipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent implements OnInit {
  title = 'orgullo2022';
  notificationsOn = false;

  constructor(
    private router: Router,
    private wsService: WebSocketService,
    private toastr: ToastrService,
    private errorModal: ErrorModalService,
    private fcm: FcmService,
    private cdr: ChangeDetectorRef,
    private settingsService: SettingsService,
    private locationSharingService: LocationSharingService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  get currentUrl(): string {
    return this.router.url;
  }
  ngOnInit(): void {
    
    this.loadSettings();
    if (isPlatformBrowser(this.platformId)) {
      this.locationSharingService.resumeFromStorage();
    }
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
      this.subscribeToWebSocketMessages();
    } catch (error) {
      console.error('Error in subscribeToWebSocketMessages:', error);
    }

    if (isPlatformBrowser(this.platformId)) {
      try {
        this.setViewportHeight();
        window.visualViewport?.addEventListener('resize', this.setViewportHeight);
      } catch (error) {
        console.error('Error in viewport setup:', error);
      }
    }

    try {
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error in detectChanges:', error);
    }

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
    } else if (msg.type === 'actualizar_listado_carr' && ['mañana', 'boss', 'willy', 'test_coor'].includes(userType)) {
      this.showCarrozaNotification(msg.carroza);
    }
  }

  private showCarrozaNotification(carroza: any): void {
    const baseOptions = {
      closeButton: true,
      timeOut: 20000,
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

  loadSettings(): void {
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        const testSettings = settings.find(s => s.key === 'test');
        localStorage.setItem('test', testSettings ? testSettings.value : 'false');
        const actualYear = new Date().getFullYear();
        localStorage.setItem('topic', `${actualYear}${ testSettings ? (testSettings.value === 'true' ? '_test' : '') : ''}`);
      },
      error: (err) => this.handleError('Error loading settings:', err)
    });
  }
}
