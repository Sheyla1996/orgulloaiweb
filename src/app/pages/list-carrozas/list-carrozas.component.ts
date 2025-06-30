import { CarrozasService } from '../../services/carrozas.service';
import { Carroza } from '../../models/carroza.model';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';
import { ModalStatusComponent } from '../admin/admin.component';
import { MatDialog } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import { ErrorModalService } from '../../components/error-modal/error-modal.service';

@Component({
  selector: 'app-list-carrozas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './list-carrozas.component.html',
  styleUrls: ['./list-carrozas.component.scss']
})
export class ListCarrozasComponent implements OnInit {
  carrozas: Carroza[] = [];
  map!: any;
  searchText = '';
  observer!: IntersectionObserver;
  markerMap: { [id: number]: any } = {};
  marker: any = null;
  activeCarrozaId: number | null = null;
  private leaflet: any;

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
    if (isPlatformBrowser(this.platformId)) {
      this.leaflet = await import('leaflet');
      const cached = localStorage.getItem('carrozas');
      let shouldUseCache = false;

      // Detectar calidad de conexión
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        // Puedes ajustar los valores según tus necesidades
        const slowTypes = ['slow-2g', '2g', '3g'];
        if (connection.saveData || slowTypes.includes(connection.effectiveType)) {
          shouldUseCache = true;
        }
      } else if (!navigator.onLine) {
        shouldUseCache = true;
      }

      if (shouldUseCache && cached) {
        this.carrozas = JSON.parse(cached);
        await this.waitForMapDiv();
        this.initMap();
        this.initObserver();
      } else {
        this.getCarrozas(cached);
      }
      this._wsService.messages$.subscribe((msg) => {
        if (msg.type === 'actualizar_listado_carr') {
          this.getCarrozas(cached);
        }
      });
    }
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
        this.initObserver();
        this.spinner.hide();
      },
      error: error => {
        console.error('Error fetching carrozas:', error);
        this._errorModal.openDialog(error);
        // Optionally, you can handle the error by showing a message to the user
        if (cached) {
          this.carrozas = JSON.parse(cached);
          this.waitForMapDiv().then(() => {
            this.initMap();
            this.initObserver();
            this.spinner.hide();
          });
        }
      }
    });
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

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
  }

  private getZoneColor(zona: string): string {
    switch (zona) {
      case 'azul': return 'blue';
      case 'verde': return 'green';
      case 'roja': return 'red';
      case 'naranja': return 'orange';
      case 'amarilla': return 'yellow';
      default: return 'purple';
    }
  }

  private clearMapLayers(): void {
    this.map.eachLayer((layer: any) => {
      if (layer instanceof this.leaflet.Marker || layer instanceof this.leaflet.Polyline) {
        this.map.removeLayer(layer);
      }
    });
    this.markerMap = {};
  }

  initMap(): void {
    if (!this.map) {
      this.map = this.leaflet.map('map-carrozas').setView([40.412, -3.692], 18);
      this.leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
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

    for (let i = 1; i < this.carrozas.length; i++) {
      const prev = this.carrozas[i - 1];
      const curr = this.carrozas[i];
      const color = this.getZoneColor(curr.zona);

      this.leaflet.polyline(
        [
          [prev.lat, prev.lng],
          [curr.lat, curr.lng]
        ],
        { color, weight: 6 }
      ).addTo(this.map);
    }

    if (this.carrozas.length > 0) {
      this.setMapItem(this.carrozas[0]);
    }
  }

  initObserver(): void {
    const container = document.getElementById('list-container');
    if (!container) return;

    container.addEventListener('scroll', () => {
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
    });
  }

  onSearchChange(): void {
    const term = this.searchText.toLowerCase();
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
        const containerTop = container.scrollTop;
        const itemOffsetTop = item.offsetTop - container.offsetTop;

        container.scrollTo({
          top: itemOffsetTop,
          behavior: 'smooth'
        });
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
        .bindPopup(popupContent)
        .openPopup();
      const mapDiv = document.getElementById('map-carrozas');
        if (mapDiv) {
          const mapHeight = mapDiv.clientHeight;
          // Desplaza el centro hacia arriba para que el popup no tape el marcador
          const offsetY = mapHeight > 0 ? (mapHeight / 6) : 0;
          const targetPoint = this.map.project([a.lat, a.lng], this.map.getZoom()).subtract([0, offsetY]);
          const targetLatLng = this.map.unproject(targetPoint, this.map.getZoom());
          this.map.setView(targetLatLng, 18, { animate: true });
        } else {
          this.map.setView([a.lat, a.lng], 18, { animate: true });
        }
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

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = './../../../assets/icons/lgbt.png'; // Ruta a tu imagen por defecto
  }
  
  clear() {
    this.searchText = '';
    this.onSearchChange();
  }
}
