import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule, isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFabMenu, MatFabMenuModule } from '@angular-material-extensions/fab-menu';
import { filter } from 'rxjs/operators';
import { WebSocketService } from './services/websocket.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HttpClientModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    RouterModule,
    MatFabMenuModule
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

  constructor(
    private router: Router,
    private _wsService: WebSocketService,
    private toastr: ToastrService,
    private _titleCasePipe: TitleCasePipe,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  get currentUrl(): string {
    return this.router.url;
  }

  ngOnInit(): void {
    console.log('AppComponent initialized');
    this._wsService.connect();
    this.setMenu();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.setMenu());
    this._wsService.messages$.subscribe((msg) => {
        if (msg && isPlatformBrowser(this.platformId)) {
          const userType = localStorage.getItem('userType');
          if (msg.type === 'message') {
            this.toastr.success(msg.message, 'Nuevo mensaje:', {
              closeButton: true,
              timeOut: 20000
            });
          } else if (msg.type === 'actualizar_listado_carr' && ['mañana', 'boss'].includes(userType || 'normal')) {
            switch (msg.carroza.status) {
              case 'pendiente':
                this.toastr.error(`La carroza ${msg.carroza.position} - ${msg.carroza.name} está pendiente de llegar`, ``, {
                  closeButton: true,
                  timeOut: 20000,
                  disableTimeOut: true
                });
                break;
              case 'situado':
                this.toastr.warning(`La carroza ${msg.carroza.position} - ${msg.carroza.name} está ya aparcada`, ``, {
                  closeButton: true,
                  timeOut: 20000,
                  disableTimeOut: true
                });
                break;
              case 'aparcando':
                this.toastr.info(`La carroza ${msg.carroza.position} - ${msg.carroza.name} está aparcando`, ``, {
                  closeButton: true,
                  timeOut: 20000,
                  disableTimeOut: true
                });
                break;
            }
            
          }
        }
      });
      if (isPlatformBrowser(this.platformId)) {
        this.setViewportHeight();
        window.visualViewport?.addEventListener('resize', this.setViewportHeight);
      }
  }

  setViewportHeight = () => {
    const vh = (window.visualViewport?.height || window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  private setMenu(): void {
    const userType = localStorage.getItem('userType');
    if (userType === 'mañana') {
      this.menu = [
        { id: 'messages', icon: 'notifications' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'carrozas', icon: 'local_shipping' },
        { id: 'asociaciones', icon: 'groups', tooltip: 'Asociaciones', tooltipPosition: 'right' }
      ];
    } else if (userType === 'boss') {
      this.menu = [
        { id: 'messages', icon: 'notifications' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'carrozas', icon: 'local_shipping' },
        { id: 'asociaciones', icon: 'groups', tooltip: 'Asociaciones', tooltipPosition: 'right' },
        { id: 'admin', icon: 'manage_accounts' }
      ];
    } else {
      this.menu = [
        { id: 'messages', icon: 'notifications' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'asociaciones', icon: 'groups' }
      ];
    }
  }

  onChangeMenu(event: string | number): void {
    switch (event) {
      case 'asociaciones':
        this.router.navigate(['/asociaciones']);
        break;
      case 'carrozas':
        this.router.navigate(['/carrozas']);
        break;
      case 'phones':
        this.router.navigate(['/telefonos']);
        break;
      case 'admin':
        this.router.navigate(['/admin']);
        break;
      case 'messages':
        this.router.navigate(['/messages']);
        break;
      case 'logout':
        localStorage.removeItem('userType');
        localStorage.removeItem('zone');
        this.router.navigate(['/login']);
        break;
      default:
        console.warn('Unknown menu item:', event);
    }
  }
}
