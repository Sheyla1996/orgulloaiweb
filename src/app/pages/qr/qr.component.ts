import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Whatsapp } from '../../models/whatsapp.model';
import { QrService } from '../../services/qr.service';
import { WhatsappService } from '../../services/whatsapp.service';
import { ModalComponent } from '../../components/modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FcmService } from '../../services/fcm.service';

@Component({
  selector: 'app-qr',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './qr.component.html',
  styleUrls: ['./qr.component.scss']
})
export class QrComponent implements OnInit {
  uuid = '';
  extraParam = '';

  zona = '';
  type = '';
  year = 0;

  isAndroid = false;
  loading = true;
  isValid = false;
  errorMessage = '';

  playStoreUrl = '';
  generalWhatsappLink = '';
  zoneWhatsappLink = '';
  installPromptEvent: any = null;
  currentStep = 1;
  readonly totalSteps = 5;
  notificationPermission: NotificationPermission | 'unsupported' = 'default';
  notificationStatusMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private qrService: QrService,
    private whatsappService: WhatsappService,
    private dialog: MatDialog,
    private fcmService: FcmService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    localStorage.removeItem('userType');
    localStorage.removeItem('zone');
    localStorage.removeItem('year');
    const qp = this.route.snapshot.queryParamMap;

    this.uuid = (qp.get('uuid') || '').trim();
    this.extraParam = (qp.get('extra') || '').trim();

    if (isPlatformBrowser(this.platformId)) {
      this.isAndroid = /android/i.test(navigator.userAgent);
      this.playStoreUrl = this.buildPlayStoreUrl(this.uuid);
      this.setupPwaPrompt();
      this.syncNotificationPermission();
    }

    if (!this.uuid) {
      this.router.navigate(['/login']);
      this.loading = false;
      this.isValid = false;
      this.errorMessage = 'No tienes permisos para acceder.';
      return;
    }

    this.validateUuid();
  }

  goToWeb(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isValid) return;

    localStorage.setItem('userType', this.type || 'normal');
    localStorage.setItem('zone', this.zona || '');
    localStorage.setItem('year', this.year.toString() || '0');

    const isMorning = new Date().getHours() < 12;
    const navigate = ['coor', 'boss', 'willy', 'test_coor'].includes(this.type) && isMorning ? '/carrozas' : '/asociaciones';

    this.router.navigate([navigate]);
  }

  nextStep(): void {
    if (!this.isValid || this.currentStep >= this.totalSteps) return;
    this.currentStep += 1;
  }

  prevStep(): void {
    if (!this.isValid || this.currentStep <= 1) return;
    this.currentStep -= 1;
  }

  goToStep(step: number): void {
    if (!this.isValid) return;
    this.currentStep = Math.min(this.totalSteps, Math.max(1, step));
  }

  async requestNotifications(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !('Notification' in window)) {
      this.notificationPermission = 'unsupported';
      this.notificationStatusMessage = 'Tu navegador no permite activar notificaciones aqui.';
      return;
    }

    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
      this.notificationStatusMessage = 'Las notificaciones ya estaban activadas.';
      return;
    }

    try {
      this.fcmService.requestPermission();
    } catch (error) {
      console.error('Error in FCM requestPermission:', error);
    }
  }

  private validateUuid(): void {
    this.qrService.validateUuid(this.uuid).subscribe({
      next: response => {
        const ok = response?.ok && response?.result === 'ok' && !!response?.zona && !!response?.type;
        const actualYear = new Date().getFullYear();

        if (!ok || response.year !== actualYear) {
          this.isValid = false;
          this.loading = false;
          localStorage.removeItem('userType');
          localStorage.removeItem('zone');
          localStorage.removeItem('year');
          this.errorMessage = 'No tienes permisos para acceder.';
          return;
        }

        this.zona = this.normalizeZone(response.zona || '');
        this.type = (response.type || '').toLowerCase();
        this.year = response.year || 0;
        this.isValid = true;

        this.loadWhatsappLinks();
      },
      error: () => {
        localStorage.removeItem('userType');
        localStorage.removeItem('zone');
        localStorage.removeItem('year');
        this.isValid = false;
        this.loading = false;
        this.errorMessage = 'No tienes permisos para acceder.';
      }
    });
  }

  private loadWhatsappLinks(): void {
    this.whatsappService.getWhatsapp().subscribe({
      next: data => {
        this.generalWhatsappLink = this.getGeneralWhatsappLink(data);
        this.zoneWhatsappLink = this.getZoneWhatsappLink(data, this.zona);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private getGeneralWhatsappLink(list: Whatsapp[]): string {
    const preferredZones = ['grupo', 'general', 'comunidad'];

    for (const zoneName of preferredZones) {
      const item = list.find(w => this.normalizeZone(w.zona.toLocaleLowerCase()) === zoneName);
      if (item?.link) return this.buildWhatsappUrl(item.link);
    }

    return '';
  }

  private getZoneWhatsappLink(list: Whatsapp[], zone: string): string {
    const item = list.find(w => this.normalizeZone(w.zona.toLocaleLowerCase()) === this.normalizeZone(zone.toLocaleLowerCase()));
    return item?.link ? this.buildWhatsappUrl(item.link) : '';
  }

  private buildWhatsappUrl(link: string): string {
    const raw = (link || '').trim();
    if (!raw) return '';

    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        if (url.hostname.toLowerCase().includes('chat.whatsapp.com') && !url.searchParams.has('mode')) {
          url.searchParams.set('mode', 'ac_t');
        }
        return url.toString();
      } catch {
        return raw;
      }
    }

    return `https://chat.whatsapp.com/${raw}?mode=ac_t`;
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

  private buildPlayStoreUrl(uuid: string): string {
    return `https://voluntariadolgtbapp.es/app.apk`;
  }

  private setupPwaPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event: any) => {
      event.preventDefault();
      this.installPromptEvent = event;
    });
  }

  onInstallPwa(): void {
    if (!isPlatformBrowser(this.platformId) || !this.installPromptEvent) return;

    const dialogRef = this.dialog.open(ModalComponent);
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result === 'install') {
        this.installPromptEvent.prompt();
        this.installPromptEvent.userChoice.then(() => {
          this.installPromptEvent = null;
        });
      } 
    });
  }

  private syncNotificationPermission(): void {
    if (!isPlatformBrowser(this.platformId) || !('Notification' in window)) {
      this.notificationPermission = 'unsupported';
      return;
    }

    this.notificationPermission = Notification.permission;
  }
}
