import { CarrozasService } from '../../services/carrozas.service';
import { Carroza } from '../../models/carroza.model';
import { Component, Inject, OnInit, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SseService } from '../../services/sse.service';

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

  constructor(
    private carrozasService: CarrozasService,
    private _sseService: SseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
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
      this._sseService.getEventSource('https://apiorgullo.sheylamartinez.es/sse').subscribe({
        next: (data) => {
          console.log('Actualización recibida:', data);
          this.getCarrozas(cached); // o actualizar solo el elemento
        }
      });
    }
  }

  getCarrozas(cached: any): void {
    this.carrozasService.getCarrozas().subscribe({
      next: async data => {
        this.carrozas = data
          .map(a => ({ ...a, lat: a.lat, lng: a.lng }))
          .sort((a, b) => a.position - b.position);

        localStorage.setItem('carrozas', JSON.stringify(this.carrozas));
        await this.waitForMapDiv();
        this.initMap();
        this.initObserver();
      },
      error: err => {
        console.error('Error fetching carrozas:', err);
        // Optionally, you can handle the error by showing a message to the user
        if (cached) {
          this.carrozas = JSON.parse(cached);
          this.waitForMapDiv().then(() => {
            this.initMap();
            this.initObserver();
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
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        this.map.removeLayer(layer);
      }
    });
    this.markerMap = {};
  }

  initMap(): void {
    if (!this.map) {
      this.map = L.map('map-carrozas').setView([40.412, -3.692], 17);
      L.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
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

      L.polyline(
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
        (items[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      }, 10);
    }
  }

  setMapItem(a: Carroza): void {
    if (a && this.map) {
      const customIcon = L.icon({
        iconUrl: '/assets/icons/marker.svg',
        iconSize: [60, 60],
        iconAnchor: [30, 60],
        popupAnchor: [0, -60],
      });
      const popupContent = a.logo
        ? `<img src="https://laalisedadetormes.com/orgullo/${a.logo}.webp" alt="${a.name}" style="max-width:100px;max-height:100px;display:block;padding-top:8px;">`
        : `<b style="max-width:100px;max-height:100px;display:block;">${a.name}</b>`;
      this.marker = L.marker([a.lat, a.lng], { icon: customIcon })
        .addTo(this.map)
        .bindPopup(popupContent)
        .openPopup();
      this.map.setView([a.lat, a.lng], 18, { animate: true });
    }
  }
}
