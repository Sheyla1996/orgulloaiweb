import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { TelefonosService } from '../../services/telefonos.service';
import { Telefono } from '../../models/telefono.model';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { VersionService } from '../../services/version.service';
import { MatButtonModule } from '@angular/material/button';
import { NgxSpinnerService } from 'ngx-spinner';
import { ErrorModalService } from '../../components/error-modal/error-modal.service';
import { WhatsappService } from '../../services/whatsapp.service';
import { Whatsapp } from '../../models/whatsapp.model';


@Component({
  selector: 'app-list-telefonos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './list-telefonos.component.html',
  styleUrls: ['./list-telefonos.component.scss']
})
export class ListTelefonosComponent implements OnInit {
  telefonos: Telefono[] = [];
  filteredTelefonos: Telefono[] = [];
  searchText = '';
  version = '';
  userZone: string | null = null;

  linkComunidad = ""
  linkGrupo = ""
  listZonas: Whatsapp[] = [];

  get whatsappSvg(): string {
    return `<svg class="whatsapp" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12.04,2C6.58,2 2.13,6.45 2.13,11.91C2.13,13.66 2.59,15.36 3.45,16.86L2.05,22L7.3,20.62C8.75,21.41 10.38,21.83 12.04,21.83C17.5,21.83 21.95,17.38 21.95,11.92C21.95,9.27 20.92,6.78 19.05,4.91C17.18,3.03 14.69,2 12.04,2ZM12.05,3.67C14.25,3.67 16.31,4.53 17.87,6.09C19.42,7.65 20.28,9.72 20.28,11.92C20.28,16.46 16.58,20.15 12.04,20.15C10.56,20.15 9.11,19.76 7.85,19L7.55,18.83L4.43,19.65L5.26,16.61L5.06,16.29C4.24,15 3.8,13.47 3.8,11.91C3.81,7.37 7.5,3.67 12.05,3.67ZM8.53,7.33C8.37,7.33 8.1,7.39 7.87,7.64C7.65,7.89 7,8.5 7,9.71C7,10.93 7.89,12.1 8,12.27C8.14,12.44 9.76,14.94 12.25,16C12.84,16.27 13.3,16.42 13.66,16.53C14.25,16.72 14.79,16.69 15.22,16.63C15.7,16.56 16.68,16.03 16.89,15.45C17.1,14.87 17.1,14.38 17.04,14.27C16.97,14.17 16.81,14.11 16.56,14C16.31,13.86 15.09,13.26 14.87,13.18C14.64,13.1 14.5,13.06 14.31,13.3C14.15,13.55 13.67,14.11 13.53,14.27C13.38,14.44 13.24,14.46 13,14.34C12.74,14.21 11.94,13.95 11,13.11C10.26,12.45 9.77,11.64 9.62,11.39C9.5,11.15 9.61,11 9.73,10.89C9.84,10.78 10,10.6 10.1,10.45C10.23,10.31 10.27,10.2 10.35,10.04C10.43,9.87 10.39,9.73 10.33,9.61C10.27,9.5 9.77,8.26 9.56,7.77C9.36,7.29 9.16,7.35 9,7.34C8.86,7.34 8.7,7.33 8.53,7.33Z"></path>
    </svg>`;
  }

  constructor(
    private telefonosService: TelefonosService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private spinner: NgxSpinnerService,
    private versionService: VersionService,
    private errorModal: ErrorModalService,
    private whatsappService: WhatsappService
  ) {}

  ngOnInit(): void {
    this.versionService.getVersion().subscribe(v => this.version = v);

    if (!isPlatformBrowser(this.platformId)) return;

    this.userZone = localStorage.getItem('zone');
    const cached = localStorage.getItem('telefonos');
    const shouldUseCache = this.shouldUseCache();

    if (shouldUseCache && cached) {
      this.setTelefonos(JSON.parse(cached));
      const whatsappRaw = localStorage.getItem('whatsapp');
      const whatsapp = whatsappRaw ? JSON.parse(whatsappRaw) : null;
      whatsapp?.filter((item: Whatsapp) => !['comunidad', 'grupo'].includes(item.zona.toLocaleLowerCase())).forEach((item: Whatsapp) => {
        this.listZonas.push({
            zona: item.zona.toLocaleLowerCase(),
            link: item.link,
            sheet_row: item.sheet_row,
            id: item.id
          });
        });
    } else {
      this.fetchTelefonos();
      this.getWhatsapp();
    }
  }

  private shouldUseCache(): boolean {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const slowTypes = ['slow-2g', '2g', '3g'];
      if (connection.saveData || slowTypes.includes(connection.effectiveType)) {
        return true;
      }
    } else if (!navigator.onLine) {
      return true;
    }
    return false;
  }

  private setTelefonos(data: Telefono[]): void {
    this.telefonos = data;
    this.filteredTelefonos = data;
  }

  private fetchTelefonos(): void {
    this.spinner.show();
    this.telefonosService.getTelefonos().subscribe({
      next: data => {
        this.setTelefonos(data);
        localStorage.setItem('telefonos', JSON.stringify(data));
        this.spinner.hide();
      },
      error: error => {
        this.errorModal.openDialog(error);
        console.error('Error fetching telefonos:', error);
        this.spinner.hide();
      }
    });
  }

  private getWhatsapp(): void {
    this.spinner.show();
    this.whatsappService.getWhatsapp().subscribe({
      next: data => {
        data.filter(item => !['comunidad', 'grupo'].includes(item.zona.toLocaleLowerCase())).forEach(item => {
          this.listZonas.push({
            zona: item.zona.toLocaleLowerCase(),
            link: item.link,
            sheet_row: item.sheet_row,
            id: item.id
          });
        });
        localStorage.setItem('whatsapp', JSON.stringify(data));
        this.spinner.hide();
      },
      error: error => {
        this.errorModal.openDialog(error);
        console.error('Error fetching telefonos:', error);
        this.spinner.hide();
      }
    });
  }

  onSearchChange(): void {
    const term = this.searchText.trim().toLowerCase();
    this.filteredTelefonos = this.telefonos.filter(t =>
      t.name.toLowerCase().includes(term) || t.zona.toLowerCase().includes(term)
    );
  }

  clearPwaCache(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    }
    window.location.reload();
  }

  onShortClick(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.removeItem('userType');
    localStorage.removeItem('zone');
    window.location.reload();
  }
}
