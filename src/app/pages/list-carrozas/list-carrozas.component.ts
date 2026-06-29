import { CarrozasService } from '../../services/carrozas.service';
import { Carroza } from '../../models/carroza.model';
import { Component, Inject, NO_ERRORS_SCHEMA, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';
import { ModalStatusComponent } from '../admin/admin.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ErrorModalService } from '../../components/error-modal/error-modal.service';
import { SearchComponent } from '../../components/search/search.component';

@Component({
  selector: 'app-list-carrozas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    SearchComponent,
    NgxSpinnerModule
  ],
  templateUrl: './list-carrozas.component.html',
  styleUrls: ['./list-carrozas.component.scss'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ListCarrozasComponent implements OnInit, OnDestroy {
  carrozas: Carroza[] = [];
  map: any = null;
  searchText = '';
  observer!: IntersectionObserver;
  markerMap: { [id: number]: any } = {};
  marker: any = null;
  activeCarrozaId: number | null = null;
  private leaflet: any;
  showMap = true;
  showKeyboard = true;
  isIos = false;
  private scrollContainer: HTMLElement | null = null;
  private scrollHandler?: () => void;

  get pending() {
    return this.carrozas.filter(a => a.status?.toLocaleLowerCase() === 'pendiente').length;
  }

  get aparcando() {
    return this.carrozas.filter(a => a.status?.toLocaleLowerCase() === 'aparcando').length;
  }

  get situadas() {
    return this.carrozas.filter(a => a.status?.toLocaleLowerCase() === 'situado').length;
  }

  get total() {
    return this.carrozas.length;
  }

  constructor(
    private _carrozasService: CarrozasService,
    private _wsService: WebSocketService,
    private dialog: MatDialog,
    private spinner: NgxSpinnerService,
    private _errorModal: ErrorModalService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isIos = this.checkIsIos();

    this.leaflet = await import('leaflet');
    this.setupViewportListener();
    const cached = localStorage.getItem('carrozas');
    const shouldUseCache = this.shouldUseCache()


    if (shouldUseCache && cached) {
      this.carrozas = JSON.parse(cached);
      await this.waitForMapDiv();
      this.initMap();
      this.initScrollSync();
    } else {
      this.getCarrozas(cached);
    }
    this._wsService.messages$.subscribe((msg) => {
      if (msg.type === 'actualizar_listado_carr') {
        this.getCarrozas(cached);
      }
    });

  }

  getCarrozas(cached: any): void {
    this.spinner.show();
    this._carrozasService.getCarrozas().subscribe({
      next: async data => {
        this.carrozas = data
          .map(a => ({ ...a, lat: a.lat, lng: a.lng }))
          .sort((a, b) => a.position - b.position);

        localStorage.setItem('carrozas', JSON.stringify(this.carrozas));
        await this.waitForMapDiv();
        this.initMap();
        this.initScrollSync();
        this.spinner.hide();
      },
      error: async error => {
        console.error('Error fetching carrozas:', error);
        this._errorModal.openDialog(error);
        // Optionally, you can handle the error by showing a message to the user
        if (cached) {
          this.carrozas = JSON.parse(cached);
          await this.waitForMapDiv();
          this.initMap();
          this.initScrollSync();
        }
        this.spinner.hide();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    if (typeof window !== 'undefined' && (window as any).visualViewport) {
      (window as any).visualViewport.removeEventListener('resize', this.handleViewportResize);
    }
    this.detachScrollSync();
    this.destroyMap();
  }

  private handleViewportResize = () => {
    if (!this.showMap || !this.map) return;
    if (this.activeCarrozaId && this.map) {
      const activeCarroza = this.carrozas.find(a => a.id === this.activeCarrozaId);
      if (activeCarroza) {
        this.repositionMap(activeCarroza);
      }
    }
  }

  private setupViewportListener(): void {
    if (typeof window !== 'undefined' && (window as any).visualViewport) {
      (window as any).visualViewport.addEventListener('resize', this.handleViewportResize);
    }
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
      rosa: 'hotpink'
    };
    return colors[zona] || 'purple';
  }

  private clearMapLayers(): void {
    if (!this.map) return;
    this.map.eachLayer((layer: any) => {
      if (layer instanceof this.leaflet.Marker || layer instanceof this.leaflet.Polyline) {
        this.map.removeLayer(layer);
      }
    });
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

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private async waitForMapDiv(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (document.getElementById('map-carrozas')) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  initMap(): void {
    if (!this.showMap) return;
    if (!this.map) {
      const bounds = this.leaflet.latLngBounds(
          [40.394212, -3.697794], // Suroeste
          [40.408085, -3.675236]  // Noreste
      );
      this.map = this.leaflet.map('map-carrozas', {
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        preferCanvas: this.isIos
      }).setView([40.412, -3.692], 18);
      this.leaflet.tileLayer('/assets/map/{z}/{x}/{y}.webp', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
        minZoom: 15,
      }).addTo(this.map);
    } else {
      this.clearMapLayers();
    }

    const path: [number, number][] = [];

    this.carrozas.forEach(a => {
      path.push([a.lat, a.lng]);
    });

    this.drawPolylines();

    if (this.carrozas.length > 0) {
      this.setMapItem(this.carrozas[0]);
    }
  }

  private drawPolylines(): void {
    for (let i = 1; i < this.carrozas.length; i++) {
      const prev = this.carrozas[i - 1];
      const curr = this.carrozas[i];
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
      for (let item of Array.from(items)) {
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
        const id = parseInt(firstVisible.id.replace('carr-', ''), 10);
        if (id === this.activeCarrozaId) return;
        this.marker?.remove();
        this.activeCarrozaId = id;
        const a = this.carrozas.find(a => a.id === id);
        if (a) this.setMapItem(a);
      }
    };
    container.addEventListener('scroll', this.scrollHandler);
  }

  onSearchChange(searchText: string): void {
    const term = searchText.toLowerCase();
    const index = this.carrozas.findIndex(a =>
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
        container.scrollTo({ top: item.offsetTop, behavior: 'smooth' });
      }
      }, 10);
    }
  }

  setMapItem(a: Carroza): void {
    if (a && this.map) {
      const customIcon = this.leaflet.icon({
        iconUrl: '/assets/icons/marker.svg',
        iconSize: [60, 60],
        iconAnchor: [30, 60],
        popupAnchor: [0, -60],
      });
      const popupContent = a.logo
        ? `<img src="https://laalisedadetormes.com/orgullo/${a.logo}.webp" alt="${a.name}" style="max-width:100px;max-height:100px;display:block;padding-top:8px;">`
        : `<b style="max-width:100px;max-height:100px;display:block;">${a.name}</b>`;
      this.marker = this.leaflet.marker([a.lat, a.lng], { icon: customIcon })
        .addTo(this.map)
        /*.bindPopup(popupContent)
        .openPopup();*/
      this.repositionMap(a);
    }
  }

  private repositionMap(a: Carroza): void {
    if (!this.showMap || !this.map) return;

    setTimeout(() => {
      const mapDiv = document.getElementById('map-carrozas');
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

  updateStatus(id: number, status: string, sheet_row: number) {
    this.spinner.show();
    this._carrozasService.updateState(id, {
        status: status,
        sheet_row: sheet_row
    }).subscribe({
        next: () => {
            this.getCarrozas(null);
        },
        error: (error) => {
          this._errorModal.openDialog(error);
          console.error(`Error updating Carroza ${id}`, error)
          this.spinner.hide();
        }
    });
  }

  openDialog(carroza: Carroza): void {
      const dialogRef = this.dialog.open(ModalStatusComponent, {
          data: { carroza }
      });

      dialogRef.afterClosed().subscribe(result => {
          if (result && result !== status) {
              this.updateStatus(carroza.id, result, carroza.sheet_row);
          }
      });
  }

  clear() {
    this.searchText = '';
    this.onSearchChange('');
  }

  changeShowKeyboard() {
    this.clear();
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

  /**
   * En iPhone/iPad, todos los navegadores usan WebKit, no solo Safari.
   * Por eso aquí desactivamos gradientes/animaciones SVG en cualquier iOS.
   */
  private checkIsIos(): boolean {
    try {
      const ua = navigator.userAgent || '';
      const platform = navigator.platform || '';
      const maxTouchPoints = navigator.maxTouchPoints || 0;

      return /iP(hone|od|ad)/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
    } catch (e) {
      return false;
    }
  }
}
