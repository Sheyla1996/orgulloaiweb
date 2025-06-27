// login.component.ts
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import {MatSelectModule} from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { LoginService } from '../services/login.service';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ModalStatusComponent } from '../pages/admin/admin.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule
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
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: Object,
    private _loginService: LoginService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const params = new URLSearchParams(window.location.search);
      const pass = params.get('pass');
      const type = params.get('type');
      if (pass && type) {
        this.password = pass;
        this.selectZone = type;
        this.login();
      }
    }
  }

  login() {
    if (isPlatformBrowser(this.platformId)) {
      const params = new URLSearchParams();
      params.set('pass', this.password);
      params.set('type', this.selectZone);

      this._loginService.login(this.password, this.selectZone).subscribe({
        next: (response: any) => {
          if (response.ok) {
        localStorage.setItem('userType', response.type || 'normal');
        localStorage.setItem('zone', response.zona || '');
        // Navega usando los parámetros en la URL
        this.router.navigate(['/asociaciones'], { queryParams: { pass: this.password, type: this.selectZone } });
          } else {
        localStorage.removeItem('userType');
        this.error = true;
          }
        }, 
        error: (error) => {
          localStorage.removeItem('userType');
          this.error = true;
        }
      });
    }
  }

  onInstallPwa() {
    if (this.installPromptEvent) {
      this.installPromptEvent.prompt();
      this.installPromptEvent.userChoice.then((choiceResult: any) => {
        // Puedes ocultar el botón si el usuario acepta o rechaza
        this.showInstallButton = false;
        this.installPromptEvent = null;
      });
    }
  }

  openDialogQr(): void {
      const dialogRef = this.dialog.open(ModalScannerComponent);

      dialogRef.afterClosed().subscribe((result: any) => {
          if (result) {
              this.onScan(result);
          }
      });
  }

  onScan(event: any) {
    if (typeof event === 'string' && event.includes('voluntariadolgtbapp.es')) {
      try {
        const url = new URL(event);
        const pass = url.searchParams.get('pass');
        const type = url.searchParams.get('type');
        if (pass && type) {
          this.password = pass;
          this.selectZone = type;
          this.login();
        }
      } catch (e) {
        console.error('Invalid URL scanned:', event);
      }
    }
  }
}

@Component({
  selector: 'modal-scanner',
  templateUrl: 'modal-scanner.component.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatButtonToggleModule, ZXingScannerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalScannerComponent {
    formats = [BarcodeFormat.QR_CODE];

    constructor(
        public dialogRef: MatDialogRef<ModalStatusComponent>
    ) {}

    onScan(event: any): void {
        this.dialogRef.close(event);
    }

    onClose(): void {
        this.dialogRef.close();
    }

}