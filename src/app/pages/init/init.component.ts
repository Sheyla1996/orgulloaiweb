import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Whatsapp } from '../../models/whatsapp.model';
import { WhatsappService } from '../../services/whatsapp.service';
import { ModalComponent } from '../../components/modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-init',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './init.component.html',
  styleUrls: ['./init.component.scss']
})
export class InitComponent implements OnInit {

  isAndroid = false;
  playStoreUrl = '';
  generalWhatsappLink = '';
  installPromptEvent: any = null;

  constructor(
    private whatsappService: WhatsappService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isAndroid = /android/i.test(navigator.userAgent);
      this.playStoreUrl = this.buildPlayStoreUrl();
      this.setupPwaPrompt();
    }

    this.loadWhatsappLinks();
  }

  private loadWhatsappLinks(): void {
    this.whatsappService.getWhatsapp().subscribe({
      next: data => {
        this.generalWhatsappLink = this.getGeneralWhatsappLink(data);
      },
      error: () => {
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

  private buildPlayStoreUrl(): string {
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
        });
      } 
    });
  }

}
