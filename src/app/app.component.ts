import { HttpClientModule } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CommonModule } from '@angular/common';
import {MatFabMenu, MatFabMenuModule} from '@angular-material-extensions/fab-menu';


@Component({
    selector: 'app-root',
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

    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    encapsulation: ViewEncapsulation.None,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent {
  get currentUrl(): string {
    return this.router.url;
  }
  
  constructor(private router: Router) {}
  title = 'orgullo2022';
  menu: MatFabMenu[] = [
    {
      id: 'phones',
      icon: 'contact_phone'
    },
    {
      id: 'asociaciones',
      icon: 'groups'
    }
  ];

  ngOnInit(): void {
    // Check if the user is logged in
    this.router.events.subscribe(() => {
      const userType = localStorage.getItem('userType');
      if (userType === 'mañana') {
      this.menu = [
        {
          id: 'phones',
          icon: 'contact_phone'
        },
        {
          id: 'carrozas',
          icon: 'local_shipping'
        },
        {
          id: 'asociaciones',
          icon: 'groups',
          tooltip: 'Asociaciones',
          tooltipPosition: 'right'
        }
      ];
      } else {
        this.menu = [
          {
            id: 'phones',
            icon: 'contact_phone'
          },
          {
            id: 'asociaciones',
            icon: 'groups'
          }
        ];
      }
    });

  }

  onChangeMenu(event: any): void {
    console.log('Menu changed:', event);
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
