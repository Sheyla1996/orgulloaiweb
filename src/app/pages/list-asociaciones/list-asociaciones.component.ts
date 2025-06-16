import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA, PLATFORM_ID, Inject } from '@angular/core';
import { AsociacionesService } from '../../services/asociaciones.service';
import { Asociacion } from '../../models/asociacion.model';
import { FormsModule } from '@angular/forms';

import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { CommonModule, isPlatformBrowser } from '@angular/common';




@Component({
  selector: 'app-list-asociaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './list-asociaciones.component.html',
  styleUrls: ['./list-asociaciones.component.scss'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ListAsociacionesComponent implements OnInit, OnDestroy {
  asociaciones: Asociacion[] = [];
  filteredAsociaciones: Asociacion[] = [];
  map!: any;
  searchText = '';
  observer!: IntersectionObserver;
  markerMap: { [id: number]: any } = {};
  marker: any = null;
  activeAsociacionId: number | null = null;
  private leaflet: any;

  constructor(
    private asociacionesService: AsociacionesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      this.leaflet = await import('leaflet');
      this.asociacionesService.getAsociaciones().subscribe(data => {
        this.asociaciones = data
          .map(a => ({ ...a, lat: a.lat, lng: a.lng }))
          .sort((a, b) => a.position - b.position);

        this.filteredAsociaciones = [...this.asociaciones];
        setTimeout(() => {
          this.initMap();
          this.initObserver();
        }, 0);
      });
    }
  }


  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
  }

  private getZonaColor(zona: string): string {
    switch (zona) {
      case 'blanca': return 'white';
      case 'azul': return 'blue';
      case 'verde': return 'green';
      case 'roja': return 'red';
      case 'naranja': return 'orange';
      case 'amarilla': return 'yellow';
      default: return 'purple';
    }
  }

  private createCustomIcon(): any {
    return this.leaflet.icon({
      iconUrl: '/icons/marker.svg',
      iconSize: [60, 60],
      iconAnchor: [30, 60],
      popupAnchor: [0, -60],
    });
  }

  initMap(): void {
    this.map = this.leaflet.map('map-asociaciones').setView([40.412, -3.692], 17);

    this.leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 20
    }).addTo(this.map);

    this.asociaciones.forEach((a, i, arr) => {
      if (i > 0) {
        const prev = arr[i - 1];
        const color = this.getZonaColor(a.zona);
        this.leaflet.polyline(
          [
            [prev.lat, prev.lng],
            [a.lat, a.lng]
          ],
          { color, weight: 6 }
        ).addTo(this.map);
      }
    });

    const first = this.filteredAsociaciones[0];
    if (first) {
      this.marker = this.leaflet.marker([first.lat, first.lng], { icon: this.createCustomIcon() })
        .addTo(this.map)
        .bindPopup(`<b>${first.name}</b>`)
        .openPopup();
      this.map.setView([first.lat, first.lng], 19, { animate: true });
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
        const id = parseInt(firstVisible.id.replace('asoc-', ''), 10);
        if (id === this.activeAsociacionId) return;
        this.marker?.remove();
        this.activeAsociacionId = id;
        const a = this.filteredAsociaciones.find(a => a.id === id);
        if (a && this.map) {
          this.marker = this.leaflet.marker([a.lat, a.lng], { icon: this.createCustomIcon() })
            .addTo(this.map)
            .bindPopup(`<b>${a.name}</b>`)
            .openPopup();
          this.map.setView([a.lat, a.lng], 19, { animate: true });
        }
      }
    });
  }

  onSearchChange(): void {
    const term = this.searchText.toLowerCase();
    this.filteredAsociaciones = this.asociaciones.filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.lema?.toLowerCase().includes(term)
    );

    this.map.eachLayer((layer: any) => {
      if (layer instanceof this.leaflet.Marker || layer instanceof this.leaflet.Polyline) {
        this.map.removeLayer(layer);
      }
    });
    this.markerMap = {};
    this.initMap();
    this.observer.disconnect();
    this.initObserver();
  }
}
