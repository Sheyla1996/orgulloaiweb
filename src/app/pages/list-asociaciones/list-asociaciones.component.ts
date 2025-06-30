import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA, PLATFORM_ID, Inject } from '@angular/core';
import { AsociacionesService } from '../../services/asociaciones.service';
import { Asociacion } from '../../models/asociacion.model';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ModalComponent } from '../../components/modal.component';
import { NgxSpinnerService } from 'ngx-spinner';
import { ErrorModalService } from '../../components/error-modal/error-modal.service';

@Component({
  selector: 'app-list-asociaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './list-asociaciones.component.html',
  styleUrls: ['./list-asociaciones.component.scss'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ListAsociacionesComponent implements OnInit, OnDestroy {
  asociaciones: Asociacion[] = [];
  map!: any;
  searchText = '';
  marker: any = null;
  activeAsociacionId: number | null = null;
  private leaflet: any;
  private installPromptEvent: any = null;

  constructor(
    private asociacionesService: AsociacionesService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private spinner: NgxSpinnerService,
    private dialog: MatDialog,
    private errorModal: ErrorModalService
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.leaflet = await import('leaflet');
    this.handlePwaPrompt();
    const cached = localStorage.getItem('asociaciones');
    const shouldUseCache = this.shouldUseCache();

    if (shouldUseCache && cached) {
      this.asociaciones = JSON.parse(cached);
      await this.waitForMapDiv();
      this.initMap();
      this.initScrollSync();
    } else {
      this.spinner.show();
      this.asociacionesService.getAsociaciones().subscribe({
        next: async data => {
          this.asociaciones = data
            .map(a => ({ ...a, lat: a.lat, lng: a.lng }))
            .sort((a, b) => a.position - b.position);
          localStorage.setItem('asociaciones', JSON.stringify(this.asociaciones));
          await this.waitForMapDiv();
          this.initMap();
          this.initScrollSync();
          this.spinner.hide();
        },
        error: async error => {
          console.error('Error fetching asociaciones:', error);
          this.errorModal.openDialog(error);
          if (cached) {
            this.asociaciones = JSON.parse(cached);
            await this.waitForMapDiv();
            this.initMap();
            this.initScrollSync();
          }
          this.spinner.hide();
        }
      });
    }
  }

  ngOnDestroy(): void {}

  private handlePwaPrompt(): void {
    const hideModal = localStorage.getItem('hideModal');
    if (typeof window === 'undefined' || hideModal === 'hide') return;

    window.addEventListener('beforeinstallprompt', (event: any) => {
      event.preventDefault();
      this.installPromptEvent = event;
      const dialogRef = this.dialog.open(ModalComponent);

      dialogRef.afterClosed().subscribe(result => {
        if (result === 'install') {
          this.onInstallPwa();
        } else {
          localStorage.setItem('hideModal', 'hide');
        }
      });
    });
  }

  private shouldUseCache(): boolean {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const slowTypes = ['slow-2g', '2g', '3g'];
      if (connection.saveData || slowTypes.includes(connection.effectiveType)) {
        return true;
      }
    }
    return !navigator.onLine;
  }

  private getZonaColor(zona: string): string {
    const colors: Record<string, string> = {
      blanca: 'white',
      azul: 'blue',
      verde: 'green',
      roja: 'red',
      naranja: 'orange',
      amarilla: 'yellow'
    };
    return colors[zona] || 'purple';
  }

  private clearMapLayers(): void {
    this.map.eachLayer((layer: any) => {
      if (layer instanceof this.leaflet.Marker || layer instanceof this.leaflet.Polyline) {
        this.map.removeLayer(layer);
      }
    });
  }

  private async waitForMapDiv(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (document.getElementById('map-asociaciones')) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  private initMap(): void {
    if (!this.map) {
      this.map = this.leaflet.map('map-asociaciones').setView([40.412, -3.692], 18);
      this.leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
        minZoom: 15,
      }).addTo(this.map);
    } else {
      this.clearMapLayers();
    }

    this.drawPolylines();
    if (this.asociaciones.length > 0) {
      this.setMapItem(this.asociaciones[0]);
    }
  }

  private drawPolylines(): void {
    for (let i = 1; i < this.asociaciones.length; i++) {
      const prev = this.asociaciones[i - 1];
      const curr = this.asociaciones[i];
      const color = this.getZonaColor(curr.zona);

      this.leaflet.polyline(
        [
          [prev.lat, prev.lng],
          [curr.lat, curr.lng]
        ],
        { color, weight: 6 }
      ).addTo(this.map);
    }
  }

  private initScrollSync(): void {
    const container = document.getElementById('list-container');
    if (!container) return;

    container.addEventListener('scroll', () => {
      const items = container.querySelectorAll('.list-item');
      let firstVisible: Element | null = null;
      items.forEach(item => item.classList.remove('active'));
      for (const item of Array.from(items)) {
        const rect = item.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top);
        if (visibleHeight > 0 && visibleHeight >= rect.height * 0.25) {
          firstVisible = item;
          break;
        }
      }

      if (firstVisible) {
        firstVisible.classList.add('active');
        const id = parseInt(firstVisible.id.replace('asoc-', ''), 10);
        if (id !== this.activeAsociacionId) {
          this.marker?.remove();
          this.activeAsociacionId = id;
          const a = this.asociaciones.find(a => a.id === id);
          if (a) this.setMapItem(a);
        }
      }
    });
  }

  onSearchChange(): void {
    const term = this.searchText.toLowerCase();
    const index = this.asociaciones.findIndex(a =>
      a.name.toLowerCase().includes(term) ||
      a.position.toString().includes(term)
    );
    if (index !== -1) {
      setTimeout(() => {
        const container = document.getElementById('list-container');
        if (!container) return;
        const items = container.querySelectorAll('.list-item');
        if (items[index]) {
          const item = items[index] as HTMLElement;
          const itemOffsetTop = item.offsetTop - container.offsetTop;
          container.scrollTo({ top: itemOffsetTop, behavior: 'smooth' });
        }
      }, 10);
    }
  }

  setMapItem(a: Asociacion): void {
    if (!a || !this.map) return;
    const customIcon = this.leaflet.icon({
      iconUrl: '/assets/icons/marker.svg',
      iconSize: [60, 60],
      iconAnchor: [30, 60],
      popupAnchor: [0, -60],
    });
    this.marker = this.leaflet.marker([a.lat, a.lng], { icon: customIcon })
      .addTo(this.map)
      .bindPopup(`<b>${a.name}</b>`)
      .openPopup();

    setTimeout(() => {
      const mapDiv = document.getElementById('map-asociaciones');
      if (mapDiv) {
        const mapHeight = mapDiv.clientHeight;
        const offsetY = mapHeight > 0 ? (mapHeight / 6) : 0;
        const targetPoint = this.map.project([a.lat, a.lng], this.map.getZoom()).subtract([0, offsetY]);
        const targetLatLng = this.map.unproject(targetPoint, this.map.getZoom());
        this.map.setView(targetLatLng, 18, { animate: true });
      } else {
        this.map.setView([a.lat, a.lng], 18, { animate: true });
      }
    }, 100);
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = './../../../assets/icons/lgbt.png';
  }

  onInstallPwa(): void {
    if (this.installPromptEvent) {
      this.installPromptEvent.prompt();
      this.installPromptEvent.userChoice.then(() => {
        this.installPromptEvent = null;
      });
    }
  }

  clear() {
    this.searchText = '';
    this.onSearchChange();
  }
}
