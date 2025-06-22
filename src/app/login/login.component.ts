// login.component.ts
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import {MatSelectModule} from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { LoginService } from '../services/login.service';

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
export class LoginComponent implements OnInit {
  password = '';
  error = false;
  selectZone: string = '';
  installPromptEvent: any = null;
  showInstallButton = false;
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private _loginService: LoginService
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    //this.setupPwaInstallPrompt();
    this.handleAutoLoginFromUrl();
  }

  private setupPwaInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event: any) => {
      event.preventDefault();
      this.installPromptEvent = event;
      this.showInstallButton = true;
    });
  }

  private handleAutoLoginFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const pass = params.get('pass');
    const type = params.get('type');
    if (pass && type) {
      this.password = pass;
      this.selectZone = type;
      this.login();
    }
  }

  login(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this._loginService.login(this.password, this.selectZone).subscribe({
      next: (response: any) => {
        if (response.ok) {
          localStorage.setItem('userType', response.type || 'normal');
          localStorage.setItem('zone', response.zona || '');
          this.router.navigate(['/asociaciones'], { queryParams: { pass: this.password, type: this.selectZone } });
        } else {
          localStorage.removeItem('userType');
          this.error = true;
        }
      },
      error: () => {
        localStorage.removeItem('userType');
        this.error = true;
      }
    });
  }

  onInstallPwa(): void {
    if (!this.installPromptEvent) return;

    this.installPromptEvent.prompt();
    this.installPromptEvent.userChoice.then(() => {
      this.showInstallButton = false;
      this.installPromptEvent = null;
    });
  }
}