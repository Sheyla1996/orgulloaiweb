// login.component.ts
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import {MatSelectModule} from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  password = '';
  error = false;
  selectZone: string | null = null;
  // Cambia 'tu_clave' por la contraseña que quieras
  private readonly clave = 'orgullo25';
  private readonly claveManana = 'manana';
  private readonly claveCoor = 'coor';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  login() {
    if (isPlatformBrowser(this.platformId)) {
      switch (this.password) {
        case this.clave:
          localStorage.setItem('userType', 'normal');
          localStorage.setItem('zone', this.selectZone || '');
          this.router.navigate(['/asociaciones']);
          break;
        case this.claveManana:
          localStorage.setItem('userType', 'mañana');
          localStorage.setItem('zone', 'coor');
          this.router.navigate(['/asociaciones']);
          break;
        case this.claveCoor:
          localStorage.setItem('userType', 'coor');
          localStorage.setItem('zone', 'coor');
          this.router.navigate(['/asociaciones']);
          break;
        default:
          localStorage.removeItem('userType');
          this.error = true;
      }
    }
  }
}