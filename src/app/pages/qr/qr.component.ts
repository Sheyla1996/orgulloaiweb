import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Whatsapp } from '../../models/whatsapp.model';
import { QrService } from '../../services/qr.service';
import { WhatsappService } from '../../services/whatsapp.service';
import { ModalComponent } from '../../components/modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FcmService } from '../../services/fcm.service';
import { FormsModule } from '@angular/forms';
import { LocationSharingService } from '../../services/location-sharing.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-qr',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './qr.component.html',
  styleUrls: ['./qr.component.scss']
})
export class QrComponent implements OnInit, OnDestroy {
  uuid = '';
  extraParam = '';

  zona = '';
  coor_zona = '';
  availableZones: string[] = [];
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
  readonly allowedSharingTypes = ['coor', 'boss', 'coor_manana'];
  readonly zoneSelectionTypes = ['coor', 'boss', 'coor_manana'];
  notificationPermission: NotificationPermission | 'unsupported' = 'default';
  notificationStatusMessage = '';
  sharingLocation = false;
  sharingStatusMessage = '';
  sharingIntervalMinutes = 3;

  private sharingStateSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private qrService: QrService,
    private whatsappService: WhatsappService,
    private dialog: MatDialog,
    private fcmService: FcmService,
    private locationSharingService: LocationSharingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    
    const qp = this.route.snapshot.queryParamMap;

    this.uuid = (qp.get('uuid') || '').trim();
    this.extraParam = (qp.get('extra') || '').trim();

    this.sharingStateSub = this.locationSharingService.state$.subscribe(state => {
      this.sharingLocation = state.active;
      this.sharingIntervalMinutes = state.intervalMinutes || this.sharingIntervalMinutes;
      this.sharingStatusMessage = state.statusMessage;
    });

    if (isPlatformBrowser(this.platformId)) {
      this.isAndroid = /android/i.test(navigator.userAgent);
      this.playStoreUrl = this.buildPlayStoreUrl(this.uuid);
      this.setupPwaPrompt();
      this.syncNotificationPermission();
    }

    // If we received validated data via navigation state from Login, use it
    const navState: any = (history && (history.state as any)) || {};
    if (navState && navState.prevalidated) {
      this.uuid = (navState.uuid || this.uuid).trim();
      this.zona = navState.zona || this.zona;
      this.type = (navState.type || this.type || '').toLowerCase();
      this.year = navState.year || this.year;
      this.isValid = true;
      this.loading = false;
      this.loadWhatsappLinks();
      return;
    } else {
      localStorage.removeItem('userType');
      localStorage.removeItem('zone');
      localStorage.removeItem('year');
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
    const navigate = ['coor', 'coor_manana','boss'].includes(this.type) && isMorning ? '/carrozas' : '/asociaciones';

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

  async toggleLocationSharing(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.isValid || !this.isAndroid || !this.canShareLocation()) {
      return;
    }

    if (this.sharingLocation) {
      this.locationSharingService.stopSharing();
      return;
    }

    this.locationSharingService.startSharing({
      uuid: this.uuid,
      zona: this.zona,
      userType: this.type,
      intervalMinutes: this.sharingIntervalMinutes,
      displayName: this.type || this.uuid,
      source: 'android'
    });
  }

  ngOnDestroy(): void {
    this.sharingStateSub?.unsubscribe();
  }

  get shouldShowLocationSharingStep(): boolean {
    return this.isAndroid && this.canShareLocation();
  }

  get shouldShowZoneSelectionStep(): boolean {
    return this.zoneSelectionTypes.includes(this.type) || (this.type === 'test' && this.zona === 'coor');
  }

  get totalSteps(): number {
    let base = this.shouldShowLocationSharingStep ? 6 : 5;
    if (this.shouldShowZoneSelectionStep) base += 1;
    return base;
  }

  private validateUuid(): void {
    if (this.uuid === 'test') {
      const now = new Date();
      const date = new Date(now.getFullYear(), 6, 4, 1, 0, 0);
      if (now < date) {
        localStorage.setItem('userType', 'test');
        localStorage.setItem('zone', this.zona || 'coor');
        localStorage.setItem('year', now.getFullYear().toString());
        this.isValid = true;

        this.loadWhatsappLinks();
        return;
      }
    }

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
        // populate available zones for selectors
        this.availableZones = data
          .filter(item => !['comunidad', 'grupo'].includes((item.zona || '').toLocaleLowerCase()))
          .map(item => this.normalizeZone((item.zona || '').toLocaleLowerCase()))
          .filter((v, i, a) => v && a.indexOf(v) === i)
          .sort();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onZoneChanged(): void {
    if (this.coor_zona) localStorage.setItem('coor_zone', this.coor_zona || '');
  }

  private canShareLocation(): boolean {
    return this.allowedSharingTypes.includes(this.type) || (this.type === 'test' && this.zona === 'coor');
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
