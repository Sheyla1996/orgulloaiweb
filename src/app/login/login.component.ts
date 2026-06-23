import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ModalStatusComponent } from '../pages/admin/admin.component';
import { MatIconModule } from '@angular/material/icon';
import { QrService } from '../services/qr.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
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
  selectZone?: string;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: Object,
    private qrService: QrService
  ) {}

  ngOnInit(): void {
    localStorage.removeItem('userType');
    localStorage.removeItem('zona');
    localStorage.removeItem('year');
    if (!isPlatformBrowser(this.platformId)) return;
    const params = new URLSearchParams(window.location.search);
    const pass = params.get('uuid');
    const type = params.get('type');
    if (pass && type) {
      this.password = pass;
      this.selectZone = type;
      this.login();
    }
  }

  login(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.password) {
      this.handleLoginError();
      return;
    }

    // Test mode: password 'test' before July 4th at 1 AM
    if (this.password === 'test') {
      const now = new Date();
      const date = new Date(now.getFullYear(), 6, 4, 1, 0, 0);
      if (now < date) {
        localStorage.setItem('userType', 'test');
        localStorage.setItem('zona', this.selectZone || 'coor');
        localStorage.setItem('year', now.getFullYear().toString());
        this.router.navigate(['/asociaciones']);
        return;
      }
    }
    
    this.qrService.validateUuid(this.password).subscribe({
      next: (response: any) => {
        const ok = response?.ok && response?.result === 'ok' && !!response?.zona && !!response?.type;
        const actualYear = new Date().getFullYear();
        const zona = this.normalizeZone(response.zona || '');
        const isSelectedZoneValid = this.selectZone ? this.normalizeZone(this.selectZone) !== zona : true;

        if (!ok || response.year !== actualYear || !isSelectedZoneValid) {
          this.handleLoginError();
          return;
        }

        localStorage.setItem('userType', response.type || 'normal');
        localStorage.setItem('zona', zona);
        localStorage.setItem('year', response.year?.toString() || '0');

        const isMorning = new Date().getHours() < 12;
        const navigate = ['coor', 'boss'].includes(response.type) && isMorning ? '/carrozas' : '/asociaciones';

        this.router.navigate([navigate]);

      },
      error: () => this.handleLoginError()
    });
  }

  /**
   * Validate here in login and navigate to the QR flow carrying the validated
   * data in history.state so `QrComponent` can skip its own validation.
   */
  goToQr(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.password) {
      this.handleLoginError();
      return;
    }

    // Test shortcut
    if (this.password === 'test') {
      const now = new Date();
      const date = new Date(now.getFullYear(), 6, 4, 1, 0, 0);
      if (now < date) {
        const zona = this.selectZone || 'coor';
        const type = 'test';
        const year = now.getFullYear();
        this.router.navigate(['/qr'], { state: { prevalidated: true, uuid: this.password, zona, type, year } });
        return;
      }
    }

    this.qrService.validateUuid(this.password).subscribe({
      next: (response: any) => {
        const ok = response?.ok && response?.result === 'ok' && !!response?.zona && !!response?.type;
        const actualYear = new Date().getFullYear();
        const zona = this.normalizeZone(response.zona || '');

        if (!ok || response.year !== actualYear) {
          this.handleLoginError();
          return;
        }

        const type = (response.type || 'normal').toLowerCase();
        const year = response.year || actualYear;

        // Navigate to QR passing validated data in navigation state
        this.router.navigate(['/qr'], { state: { prevalidated: true, uuid: this.password, zona, type, year } });
      },
      error: () => this.handleLoginError()
    });
  }

  private handleLoginError(): void {
    localStorage.removeItem('userType');
    localStorage.removeItem('zona');
    localStorage.removeItem('year');
    this.error = true;
  }

  openDialogQr(): void {
    const dialogRef = this.dialog.open(ModalScannerComponent);
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) this.onScan(result);
    });
  }

  private normalizeZone(zone: string): string {
    const normalized = zone
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const aliasMap: Record<string, string> = {
      rojo: 'roja',
      amarillo: 'amarilla',
      blanco: 'blanca'
    };

    return aliasMap[normalized] || normalized;
  }

  onScan(event: any): void {
    if (typeof event !== 'string' || !event.includes('voluntariadolgtbapp.es')) return;
    try {
      const url = new URL(event);
      const pass = url.searchParams.get('uuid');
      const type = url.searchParams.get('type');
      if (pass) {
        this.password = pass;
        this.selectZone = type || undefined;
        this.login();
      }
    } catch {
      console.error('Invalid URL scanned:', event);
    }
  }
}

@Component({
  selector: 'modal-scanner',
  templateUrl: 'modal-scanner.component.html',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    ZXingScannerModule
  ],
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
