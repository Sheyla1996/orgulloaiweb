import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  get currentUrl(): string {
    return this.router.url;
  }

  ngOnInit(): void {
    this._wsService.connect();
    this.setMenu();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.setMenu());
    this._wsService.messages$.subscribe((msg) => {
        if (msg && msg.type === 'message') {
            this.toastr.success(msg.message, 'Nuevo mensaje:', {
              closeButton: true,
              timeOut: 20000,
            });
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
        { id: 'messages', icon: 'chat' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'carrozas', icon: 'local_shipping' },
        { id: 'asociaciones', icon: 'groups', tooltip: 'Asociaciones', tooltipPosition: 'right' }
      ];
    } else if (userType === 'boss') {
      this.menu = [
        { id: 'messages', icon: 'chat' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'carrozas', icon: 'local_shipping' },
        { id: 'asociaciones', icon: 'groups', tooltip: 'Asociaciones', tooltipPosition: 'right' },
        { id: 'admin', icon: 'manage_accounts' }
      ];
    } else {
      this.menu = [
        { id: 'messages', icon: 'chat' },
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
