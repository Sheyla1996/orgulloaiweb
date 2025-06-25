import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA, PLATFORM_ID, Inject } from '@angular/core';
import { AsociacionesService } from '../../services/asociaciones.service';
import { Asociacion } from '../../models/asociacion.model';
import { FormsModule } from '@angular/forms';

import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { min } from 'rxjs';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import { ModalComponent } from '../../components/modal.component';
import { PushService } from '../../services/push.service';



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
  observer!: IntersectionObserver;
  markerMap: { [id: number]: any } = {};
  marker: any = null;
  activeAsociacionId: number | null = null;
  private leaflet: any;
  installPromptEvent: any = null;

  constructor(
    private asociacionesService: AsociacionesService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private push: PushService,
    private _dialog: MatDialog
  ) {}

  // ...existing code...
  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      this.leaflet = await import('leaflet');
      const hideModal = localStorage.getItem('hideModal');
      if (typeof window !== 'undefined' && hideModal !== 'hide') {
        window.addEventListener('beforeinstallprompt', (event: any) => {
          event.preventDefault();
          this.installPromptEvent = event;
          const dialogRef = this._dialog.open(ModalComponent);

          dialogRef.afterClosed().subscribe(result => {
            if (result === 'install') {
              this.onInstallPwa();
            } else {
              console.log('The dialog was closed');
              localStorage.setItem('hideModal', 'hide');
            }
          });
        });
      }

      const cached = localStorage.getItem('asociaciones');
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
        this.asociaciones = JSON.parse(cached);
        await this.waitForMapDiv();
        this.initMap();
        this.initObserver();
      } else {
        this.asociacionesService.getAsociaciones().subscribe({
          next: async data => {
            this.asociaciones = data
              .map(a => ({ ...a, lat: a.lat, lng: a.lng }))
              .sort((a, b) => a.position - b.position);

            localStorage.setItem('asociaciones', JSON.stringify(this.asociaciones));
            await this.waitForMapDiv();
            this.initMap();
            this.initObserver();
          },
          error: err => {
            console.error('Error fetching asociaciones:', err);
            // Si falla la petición, intenta cargar del caché
            if (cached) {
              this.asociaciones = JSON.parse(cached);
              this.waitForMapDiv().then(() => {
                this.initMap();
                this.initObserver();
              });
            }
          }
        });
      }
    }
  }
  // ...existing code...


  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
  }

  onInstallPwa() {
    if (this.installPromptEvent) {
      this.installPromptEvent.prompt();
      this.installPromptEvent.userChoice.then((choiceResult: any) => {
        console.log('User choice:', choiceResult);
        // Puedes ocultar el botón si el usuario acepta o rechaza
        this.installPromptEvent = null;
      });
    }
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
      this.map = this.leaflet.map('map-asociaciones').setView([40.412, -3.692], 18);
      this.leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
        minZoom: 15,
      }).addTo(this.map);
    } else {
      this.clearMapLayers();
    }

    const path: [number, number][] = [];

    this.asociaciones.forEach(a => {
      path.push([a.lat, a.lng]);
    });

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

    if (this.asociaciones.length > 0) {
      this.setMapItem(this.asociaciones[0]);
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
        const a = this.asociaciones.find(a => a.id === id);
        if (a) this.setMapItem(a);
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

  setMapItem(a: Asociacion): void {
      if (a && this.map) {
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
        // Centra el marcador, ajustando el desplazamiento según el tamaño del mapa
        setTimeout(() => {
          const mapDiv = document.getElementById('map-asociaciones');
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
        }, 100);
      }
    }

    onImgError(event: Event) {
      const target = event.target as HTMLImageElement;
      target.src = './../../../assets/icons/lgbt.png'; // Ruta a tu imagen por defecto
    }

}
