import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-bottom-navigation',
  imports: [CommonModule, MatIconModule],
  templateUrl: './bottom-navigation.html',
  styleUrl: './bottom-navigation.scss'
})
export class BottomNavigation implements OnInit {
  showNavigation = true;
  navigationItems: NavigationItem[] = [
    { label: 'Asociaciones', icon: 'map_search', route: '/asociaciones' },
    { label: 'Carrozas', icon: 'airport_shuttle', route: '/carrozas' },
    { label: 'Teléfonos', icon: 'contact_phone', route: '/telefonos' }/*,
    { label: 'Notificaciones', icon: 'notifications', route: '/notificaciones' }*/
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkUserType();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkUserType();
      });

    window.addEventListener('storage', (event: StorageEvent) => {
      if (['userType', 'zone', 'year'].includes(event.key || '')) {
        this.checkUserType();
      }
    });
  }

  private checkUserType(): void {
    const isAdmin = this.navigationItems.some(item => item.route === '/admin');
    const userType = localStorage.getItem('userType');
    const year = localStorage.getItem('year');
    const zone = localStorage.getItem('zone');

    if (!userType || !year || !zone) {
      this.showNavigation = false;
      return;
    }

    this.showNavigation = true;
    
    if (userType === 'boss' && !isAdmin) {
      this.navigationItems.push({ label: 'Admin', icon: 'shield_person', route: '/admin' });
    } else if (userType !== 'boss' && isAdmin) {
      this.navigationItems = this.navigationItems.filter(item => item.route !== '/admin');
    }
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
