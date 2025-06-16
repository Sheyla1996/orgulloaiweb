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

  constructor(private router: Router) {}
  title = 'orgullo2022';
  menu: MatFabMenu[] = [
    {
      id: 1,
      icon: 'groups'
    },
    {
      id: 2,
      icon: 'local_shipping'
    },
    {
      id: 3,
      icon: 'contact_phone'
    }
  ];

  onChangeMenu(event: any): void {
    console.log('Menu changed:', event);
    switch (event) {
      case 1:
        this.router.navigate(['/asociaciones']);
        break;
      case 2:
        this.router.navigate(['/carrozas']);
        break;
      case 3:
        this.router.navigate(['/telefonos']);
        break;
      default:
        console.warn('Unknown menu item:', event);
    }

  }
}
