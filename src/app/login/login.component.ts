// login.component.ts
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule,
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  password = '';
  error = false;
  // Cambia 'tu_clave' por la contraseña que quieras
  private readonly clave = 'orgullo25';

  constructor(private router: Router) {}

  login() {
    if (this.password === this.clave) {
      sessionStorage.setItem('logueado', 'true');
      this.router.navigate(['/']);
    } else {
      this.error = true;
    }
  }
}