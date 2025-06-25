import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatFabMenu } from '@angular-material-extensions/fab-menu';
import { SessionService } from './session.service';
import { Roles } from '../roles';

@Injectable({ providedIn: 'root' })
export class MenuService {
  constructor(private session: SessionService, private router: Router) {}

  getMenu(): MatFabMenu[] {
    const userType = this.session.userType;
    if (userType === Roles.Manana) {
      return [
        { id: 'messages', icon: 'notifications' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'carrozas', icon: 'local_shipping' },
        { id: 'asociaciones', icon: 'groups' }
      ];
    } else if (userType === Roles.Boss) {
      return [
        { id: 'messages', icon: 'notifications' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'carrozas', icon: 'local_shipping' },
        { id: 'asociaciones', icon: 'groups' },
        { id: 'admin', icon: 'manage_accounts' }
      ];
    } else {
      return [
        { id: 'messages', icon: 'notifications' },
        { id: 'phones', icon: 'contact_phone' },
        { id: 'asociaciones', icon: 'groups' }
      ];
    }
  }

  handleMenuSelection(event: string): void {
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
        this.session.clear();
        this.router.navigate(['/login']);
        break;
      default:
        console.warn('Unknown menu item:', event);
    }
  }
}