import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  navigationItems: NavigationItem[] = [
    { label: 'Asociaciones', icon: 'map_search', route: '/asociaciones' },
    { label: 'Carrozas', icon: 'airport_shuttle', route: '/carrozas' },
    { label: 'Teléfonos', icon: 'contact_phone', route: '/telefonos' }/*,
    { label: 'Notificaciones', icon: 'notifications', route: '/notificaciones' }*/
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    if (localStorage.getItem('userType') === 'boss') {
      this.navigationItems.push({ label: 'Admin', icon: 'shield_person', route: '/admin' });
    }
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
