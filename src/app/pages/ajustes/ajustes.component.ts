import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FcmService } from '../../services/fcm.service';
import { LocationSharingService } from '../../services/location-sharing.service';
import { WhatsappService } from '../../services/whatsapp.service';
import { ModalComponent } from '../../components/modal.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './ajustes.component.html',
  styleUrls: ['./ajustes.component.scss']
})
export class AjustesComponent implements OnInit {
  notificationPermission: NotificationPermission | 'unsupported' = 'default';
  notificationStatusMessage = '';
  isAndroid = false;
  playStoreUrl = '';
  installPromptEvent: any = null;

  sharingLocation = false;
  sharingIntervalMinutes = 3;

  zona = '';
  userType = '';
  availableZones: string[] = [];

  readonly zoneSelectionTypes = ['coor', 'coor_manana', 'boss'];

  constructor(
    private fcmService: FcmService,
    private locationSharingService: LocationSharingService,
    private whatsappService: WhatsappService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.setupPwaPrompt();
    this.zona = localStorage.getItem('coor_zone') || '';
    this.userType = (localStorage.getItem('userType') || '').toLowerCase();

    this.isAndroid = /android/i.test(navigator.userAgent);
    this.playStoreUrl = `https://voluntariadolgtbapp.es/app.apk`;
    this.syncNotificationPermission();

    this.locationSharingService.state$.subscribe(state => {
      this.sharingLocation = !!state.active;
      this.sharingIntervalMinutes = state.intervalMinutes || this.sharingIntervalMinutes;
    });

    this.whatsappService.getWhatsapp().subscribe({
      next: data => {
        this.availableZones = data
          .filter(item => !['comunidad', 'grupo'].includes((item.zona || '').toLocaleLowerCase()))
          .map(item => (item.zona || '').toLocaleLowerCase())
          .filter((v, i, a) => v && a.indexOf(v) === i)
          .sort();
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

  requestNotifications(): void {
    if (!isPlatformBrowser(this.platformId) || !('Notification' in window)) {
      this.notificationPermission = 'unsupported';
      this.notificationStatusMessage = 'Tu navegador no permite activar notificaciones aqui.';
      return;
    }

    this.fcmService.requestPermission();
  }


  toggleLocationSharing(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isAndroid) return;

    const allowed = ['coor', 'boss', 'coor_manana'];
    if (!allowed.includes(this.userType)) return;

    if (this.sharingLocation) {
      this.locationSharingService.stopSharing();
      return;
    }

    this.locationSharingService.startSharing({
      uuid: localStorage.getItem('uuid') || '',
      zona: this.zona,
      userType: this.userType,
      intervalMinutes: this.sharingIntervalMinutes,
      displayName: this.userType || 'usuario',
      source: 'web'
    });
  }

  onZoneChanged(): void {
    localStorage.setItem('coor_zone', this.zona || '');
  }

  get canChangeZone(): boolean {
    return this.zoneSelectionTypes.includes(this.userType);
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
}
