import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AsociacionesService, UbicacionCompartida } from '../../services/asociaciones.service';
import { LocationSharingService } from '../../services/location-sharing.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-map-only',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-only.component.html',
  styleUrls: ['./map-only.component.scss']
})
export class MapOnlyComponent implements OnInit, OnDestroy {
  map: any = null;
  leaflet: any;
  asociaciones: any[] = [];
  liveLocationsLayer: any = null;
  ubicacionesVivas: UbicacionCompartida[] = [];
  private liveLocationsTimer: ReturnType<typeof setInterval> | null = null;
  private readonly liveLocationsTtlMinutes = 10;

  constructor(
    private asociacionesService: AsociacionesService,
    private locationSharingService: LocationSharingService,
    private spinner: NgxSpinnerService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.leaflet = await import('leaflet');
    await this.loadDataAndInitMap();
    this.liveLocationsTimer = setInterval(() => this.loadLiveLocations(false), 60000);
  }

  ngOnDestroy(): void {
    if (this.liveLocationsTimer) {
      clearInterval(this.liveLocationsTimer);
      this.liveLocationsTimer = null;
    }
    this.destroyMap();
  }

  private async loadDataAndInitMap(): Promise<void> {
    this.spinner.show();
    this.asociacionesService.getAsociaciones().subscribe({
      next: async data => {
        this.asociaciones = data.map(a => ({ ...a, lat: a.lat, lng: a.lng })).sort((a, b) => a.position - b.position);
        await this.waitForMapDiv();
        this.initMap();
        this.spinner.hide();
      },
      error: () => {
        this.spinner.hide();
      }
    });

    this.loadLiveLocations();
  }

  private waitForMapDiv(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (document.getElementById('map-mapa')) resolve(); else setTimeout(check, 50);
      };
      check();
    });
  }

  private initMap(): void {
    if (!this.map) {
      this.map = this.leaflet.map('map-mapa').setView([40.416511, -3.691149], 15);
      this.leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
        minZoom: 15
      }).addTo(this.map);
      this.liveLocationsLayer = this.leaflet.layerGroup().addTo(this.map);
    } else {
      this.clearMapLayers();
    }

    this.drawPolylines();
    this.drawExtraLine();
    this.drawLiveLocations();
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

  private destroyMap(): void {
    this.liveLocationsLayer?.remove();
    this.liveLocationsLayer = null;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private loadLiveLocations(refreshMap = true): void {
    this.asociacionesService.getUbicacionesCompartidas(this.liveLocationsTtlMinutes).subscribe({
      next: ubicaciones => {
        this.ubicacionesVivas = ubicaciones ?? [];
        if (refreshMap) this.drawLiveLocations();
      },
      error: error => console.error('Error fetching live locations:', error)
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

      const label = location.displayName || `UUID ${location.uuid?.slice(0, 6)}`;
      const updatedAt = location.updatedAt ? new Date(location.updatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'reciente';
      circle.bindPopup(`<div class="live-location-popup"><strong>${label}</strong><br>Zona: ${location.zona}<br>Última actualización: ${updatedAt}</div>`);
      circle.addTo(this.liveLocationsLayer);
    });
  }

  private drawPolylines(): void {
    if (!this.map || !this.asociaciones) return;
    for (let i = 1; i < this.asociaciones.length; i++) {
      const prev = this.asociaciones[i - 1];
      const curr = this.asociaciones[i];
      const color = this.getZonaColor(curr.zona);
      this.leaflet.polyline([[prev.lat, prev.lng], [curr.lat, curr.lng]], { color, weight: 6 }).addTo(this.map);
    }
  }

  private drawExtraLine(): void {
    if (!this.map) return;
    const coords = [
      [40.425149, -3.690248],
      [40.419327, -3.692865],
      [40.415985, -3.693674],
      [40.412416, -3.692842]
    ];
    // color violeta claro
    const color = '#d8b4fe';
    this.leaflet.polyline(coords, { color, weight: 6, opacity: 0.9 }).addTo(this.map);
  }

  private getZonaColor(zona: string): string {
    const colors: Record<string, string> = {
      blanca: 'white', azul: 'blue', verde: 'green', roja: 'red', naranja: 'orange', amarilla: 'yellow', violeta: 'purple', rosa: 'hotpink', coor: 'black'
    };
    return colors[zona] || 'purple';
  }

  private getCircleBorderColor(zona: string): string {
    const colors: Record<string, string> = { blanca: '#a0a0a0', azul: '#0d6efd', verde: '#16a34a', roja: '#dc2626', naranja: '#ea580c', amarilla: '#ca8a04', violeta: '#7c3aed', rosa: '#db2777', coor: '#111827' };
    return colors[zona] || '#6d28d9';
  }
}
