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
  navigationItems: NavigationItem[] = [];

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
    const userType = localStorage.getItem('userType');
    const year = localStorage.getItem('year');
    const zone = localStorage.getItem('zone');

    if (!userType || !year || !zone) {
      this.showNavigation = false;
      return;
    }

    this.showNavigation = true;
    this.modifyNavigation();
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  modifyNavigation(): void {
    const userType = localStorage.getItem('userType');
    const zona = localStorage.getItem('zone');
    this.navigationItems = [];
    this.navigationItems.push({ label: 'Asociaciones', icon: 'map_search', route: '/asociaciones' });
    if (['boss', 'coor_manana'].includes(userType || '') || ['rosa'].includes(zona || '')) {
      this.navigationItems.push({ label: 'Carrozas', icon: 'airport_shuttle', route: '/carrozas' });
    }
    this.navigationItems.push({ label: 'Teléfonos', icon: 'contact_phone', route: '/telefonos' });
    if (userType === 'boss') {
      this.navigationItems.push({ label: 'Admin', icon: 'shield_person', route: '/admin' });
    }
  }
}
