import * as L from 'leaflet';
import { CarrozasService } from '../../services/carrozas.service';
import { Carroza } from '../../models/carroza.model';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { CommonModule } from '@angular/common';

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
  encapsulation: ViewEncapsulation.None,
  templateUrl: './list-carrozas.component.html',
  styleUrls: ['./list-carrozas.component.scss']
})
export class ListCarrozasComponent implements OnInit {
  carrozas: Carroza[] = [];
  filteredCarrozas: Carroza[] = [];
  map!: L.Map;
  searchText = '';
  observer!: IntersectionObserver;
  markerMap: { [id: number]: L.Marker } = {};
  marker: L.Marker | null = null;
  activeCarrozaId: number | null = null;

  constructor(private carrozasService: CarrozasService) {}

  ngOnInit(): void {
    this.carrozasService.getCarrozas().subscribe(data => {
      this.carrozas = data
        .map(a => ({ ...a, lat: a.lat, lng: a.lng }))
        .sort((a, b) => a.position - b.position);

      this.filteredCarrozas = [...this.carrozas];
      setTimeout(() => this.initMap(), 0);
    });
  }

  ngAfterViewInit(): void {
    this.initObserver();
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
    this.map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        this.map.removeLayer(layer);
      }
    });
    this.markerMap = {};
  }

  initMap(): void {
    if (!this.map) {
      this.map = L.map('map-carrozas').setView([40.412, -3.692], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 20
      }).addTo(this.map);
    } else {
      this.clearMapLayers();
    }

    const path: [number, number][] = [];

    this.filteredCarrozas.forEach(a => {
      path.push([a.lat, a.lng]);
    });

    for (let i = 1; i < this.filteredCarrozas.length; i++) {
      const prev = this.filteredCarrozas[i - 1];
      const curr = this.filteredCarrozas[i];
      const color = this.getZoneColor(curr.zona);

      L.polyline(
        [
          [prev.lat, prev.lng],
          [curr.lat, curr.lng]
        ],
        { color, weight: 6 }
      ).addTo(this.map);
    }

    if (this.filteredCarrozas.length > 0) {
      this.setMapItem(this.filteredCarrozas[0]);
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
        const a = this.filteredCarrozas.find(a => a.id === id);
        if (a) this.setMapItem(a);
      }
    });
  }

  onSearchChange(): void {
    const term = this.searchText.toLowerCase();
    this.filteredCarrozas = this.carrozas.filter(a =>
      a.name.toLowerCase().includes(term)
    );

    if (this.map) {
      this.clearMapLayers();
      this.initMap();
    }
    if (this.observer) this.observer.disconnect();
    this.initObserver();
  }

  setMapItem(a: Carroza): void {
    if (a && this.map) {
      const customIcon = L.icon({
        iconUrl: '/icons/marker.svg',
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
      this.map.setView([a.lat, a.lng], 19, { animate: true });
    }
  }
}
