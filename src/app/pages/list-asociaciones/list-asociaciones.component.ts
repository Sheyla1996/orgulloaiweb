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
import { SearchComponent } from '../../components/search/search.component';
import { UbicacionCompartida } from '../../services/asociaciones.service';



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
    MatDialogModule,
    SearchComponent
  ],
  templateUrl: './list-asociaciones.component.html',
  styleUrls: ['./list-asociaciones.component.scss'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ListAsociacionesComponent implements OnInit, OnDestroy {
  asociaciones: Asociacion[] = [];
  map: any = null;
  searchText = '';
  marker: any = null;
  liveLocationsLayer: any = null;
  ubicacionesVivas: UbicacionCompartida[] = [];
  activeAsociacionId: number | null = null;
  private leaflet: any;
  private installPromptEvent: any = null;
  showMap = true;
  showKeyboard = true;
  private liveLocationsTimer: ReturnType<typeof setInterval> | null = null;
  private readonly liveLocationsTtlMinutes = 10;
  private scrollContainer: HTMLElement | null = null;
  private scrollHandler?: () => void;
  

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
    this.setupViewportListener();
    this.loadLiveLocations();
    this.liveLocationsTimer = setInterval(() => this.loadLiveLocations(false), 60000);
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

  

  ngOnDestroy(): void {
    if (typeof window !== 'undefined' && (window as any).visualViewport) {
      (window as any).visualViewport.removeEventListener('resize', this.handleViewportResize);
    }
    this.detachScrollSync();
    if (this.liveLocationsTimer) {
      clearInterval(this.liveLocationsTimer);
      this.liveLocationsTimer = null;
    }
    this.destroyMap();
  }

  private handleViewportResize = () => {
    if (!this.showMap || !this.map) return;
    
    if (this.activeAsociacionId && this.map) {
      const activeAsoc = this.asociaciones.find(a => a.id === this.activeAsociacionId);
      if (activeAsoc) {
        this.repositionMap(activeAsoc);
      }
    }
  }

  private setupViewportListener(): void {
    if (typeof window !== 'undefined' && (window as any).visualViewport) {
      (window as any).visualViewport.addEventListener('resize', this.handleViewportResize);
    }
  }

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
      amarilla: 'yellow',
      violeta: 'purple',
      rosa: 'hotpink',
      coor: 'black'
    };
    return colors[zona] || 'purple';
  }

  private getCircleBorderColor(zona: string): string {
    const colors: Record<string, string> = {
      blanca: '#a0a0a0',
      azul: '#0d6efd',
      verde: '#16a34a',
      roja: '#dc2626',
      naranja: '#ea580c',
      amarilla: '#ca8a04',
      violeta: '#7c3aed',
      rosa: '#db2777',
      coor: '#111827'
    };

    return colors[zona] || '#6d28d9';
  }

  private clearMapLayers(): void {
    if (!this.map) return;

    this.map.eachLayer((layer: any) => {
      if (layer instanceof this.leaflet.Marker || layer instanceof this.leaflet.Polyline || layer instanceof this.leaflet.Circle || layer instanceof this.leaflet.CircleMarker) {
        this.map.removeLayer(layer);
      }
    });

    this.liveLocationsLayer?.clearLayers();
  }

  private detachScrollSync(): void {
    if (this.scrollContainer && this.scrollHandler) {
      this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
    }

    this.scrollContainer = null;
    this.scrollHandler = undefined;
  }

  private destroyMap(): void {
    this.marker?.remove();
    this.marker = null;

    this.liveLocationsLayer?.remove();
    this.liveLocationsLayer = null;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
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
    if (!this.showMap) return;

    if (!this.map) {
      this.map = this.leaflet.map('map-asociaciones').setView([40.412, -3.692], 18);
      this.leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
        minZoom: 15,
      }).addTo(this.map);
      this.liveLocationsLayer = this.leaflet.layerGroup().addTo(this.map);
    } else {
      this.clearMapLayers();
    }

    this.drawPolylines();
    this.drawLiveLocations();
    if (this.asociaciones.length > 0) {
      this.setMapItem(this.asociaciones[0]);
    }
  }

  private loadLiveLocations(refreshMap = true): void {
    this.asociacionesService.getUbicacionesCompartidas(this.liveLocationsTtlMinutes).subscribe({
      next: ubicaciones => {
        this.ubicacionesVivas = ubicaciones ?? [];
        if (refreshMap) {
          this.drawLiveLocations();
        }
      },
      error: error => {
        console.error('Error fetching live locations:', error);
      }
    });
  }

  private drawLiveLocations(): void {
    if (!this.map || !this.liveLocationsLayer) return;

    this.liveLocationsLayer.clearLayers();

    this.ubicacionesVivas.forEach(location => {
      const color = this.getZonaColor(location.zona);
      const circle = this.leaflet.circleMarker([location.lat, location.lng], {
        radius: 12,
        color: this.getCircleBorderColor(location.zona),
        weight: 2,
        fillColor: color,
        fillOpacity: 0.42,
      });

      const label = location.displayName || `UUID ${location.uuid.slice(0, 6)}`;
      const updatedAt = location.updatedAt ? new Date(location.updatedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      }) : 'reciente';

      circle.bindPopup(`
        <div class="live-location-popup">
          <strong>${label}</strong><br>
          Zona: ${location.zona}<br>
          Última actualización: ${updatedAt}
        </div>
      `);

      circle.addTo(this.liveLocationsLayer);
    });
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
    this.detachScrollSync();

    const container = document.getElementById('list-container');
    if (!container) return;

    this.scrollContainer = container;
    this.scrollHandler = () => {
      if (!this.showMap || !this.map) return;

      const items = container.querySelectorAll('.list-item');
      let firstVisible: Element | null = null;
      items.forEach(item => item.classList.remove('active'));
      for (const item of Array.from(items)) {
        const rect = item.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top);
        if (visibleHeight > 0 && visibleHeight >= rect.height * 0.65) {
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
    };

    container.addEventListener('scroll', this.scrollHandler);
  }

  onSearchChange(searchText: string): void {
    const term = searchText.toLowerCase();
    const index = this.asociaciones.findIndex(a =>
      a.name.toLowerCase().includes(term) ||
      //a.shortName.toLowerCase().includes(term) ||
      a.position.toString().includes(term)
    );
    if (index !== -1) {
      setTimeout(() => {
        const container = document.getElementById('list-container');
        if (!container) return;
        const items = container.querySelectorAll('.list-item');
        if (items[index]) {
          const item = items[index] as HTMLElement;
          container.scrollTo({ top: item.offsetTop, behavior: 'smooth' });
        }
      }, 10);
    }
  }

  setMapItem(a: Asociacion): void {
    if (!a || !this.map || !this.showMap) return;
    const customIcon = this.leaflet.icon({
      iconUrl: '/assets/icons/marker.svg',
      iconSize: [60, 60],
      iconAnchor: [30, 60],
      popupAnchor: [0, -60],
    });
    this.marker = this.leaflet.marker([a.lat, a.lng], { icon: customIcon })
      .addTo(this.map)
      /*.bindPopup(`<div class="marker-content">
        <img class="map-img" src="${a.isBatucada ? '/assets/icons/batucada.svg' : 'https://laalisedadetormes.com/orgullo/' + a.logo + '.webp'}" alt="${a.name}" onerror="this.src='./../../../assets/icons/lgbt.png'">
        <b>${a.name}</b></div>`)*/
      //.openPopup();

    this.repositionMap(a);
  }

  private repositionMap(a: Asociacion): void {
    if (!this.showMap || !this.map) return;

    setTimeout(() => {
      const mapDiv = document.getElementById('map-asociaciones');
      if (mapDiv) {
        const mapHeight = mapDiv.clientHeight;
        const offsetY = mapHeight > 0 ? -60 : 0;
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
    this.onSearchChange('');
  }

  changeShowMap() {
    this.showMap = !this.showMap;

    if (!this.showMap) {
      //this.detachScrollSync();
      this.destroyMap();
      const container = document.getElementById('list-container');
      if (container) {
        container.querySelectorAll('.list-item').forEach(item => item.classList.remove('active'));
      }
      return;
    }

    if (this.showMap) {
      setTimeout(async () => {
        await this.waitForMapDiv();
        this.initMap();
        this.initScrollSync();
      }, 100);
    }
  }

  changeShowKeyboard() {
    this.showKeyboard = !this.showKeyboard;
    if (this.showMap) {
      this.destroyMap();
      setTimeout(async () => {
        await this.waitForMapDiv();
        this.initMap();
        this.initScrollSync();
      }, 100);
    }
  }
}
