// login.component.ts
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    MatButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  password = '';
  error = false;
  // Cambia 'tu_clave' por la contraseña que quieras
  private readonly clave = 'orgullo25';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  login() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.password === this.clave) {
        localStorage.setItem('logueado', 'true');
        this.router.navigate(['/']);
      } else {
        this.error = true;
      }
    }
  }
}