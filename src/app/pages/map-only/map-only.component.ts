import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { AsociacionesService, UbicacionCompartida } from '../../services/asociaciones.service';
import { LocationSharingService } from '../../services/location-sharing.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-map-only',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './map-only.component.html',
  styleUrls: ['./map-only.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MapOnlyComponent implements OnInit, OnDestroy {
  map: any = null;
  leaflet: any;
  ubicacionesVivas: UbicacionCompartida[] = [];
  liveLocationsLayer: any = null;
  private offscreenLayer: any = null;

  private svgRenderer: any = null;
  private extraPolyline: any = null;

  private gradientAnimId: number | null = null;
  private gradientStartTime = 0;
  private readonly gradientLength = 220;
  private readonly gradientSpeed = 20;
  private isIos = false;
  private lastGradientUpdate = 0;
  private readonly gradientFps = 30;

  private liveLocationsTimer: ReturnType<typeof setInterval> | null = null;
  private liveLocationsSub: Subscription | null = null;
  private scheduleDrawOnMoveBound: any = null;
  private mapMoveScheduled = false;

  private readonly liveLocationsTtlMinutes = 5;
  showForceShareButton = false;

  constructor(
    private asociacionesService: AsociacionesService,
    private locationSharingService: LocationSharingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isIos = this.checkIsIos();

    this.leaflet = await import('leaflet');

    try {
      const ut = (localStorage.getItem('userType') || localStorage.getItem('shareLocationUserType') || '').toLowerCase();
      const zona = (localStorage.getItem('zona') || '').toLowerCase();
      this.showForceShareButton = ['coor', 'coor_manana', 'boss', 'test'].includes(ut) || (ut === 'test' && zona === 'coor');
    } catch (e) {
      this.showForceShareButton = false;
    }

    await this.loadDataAndInitMap();

    this.liveLocationsTimer = setInterval(() => {
      if (document.hidden) return;
      this.loadLiveLocations(true);
    }, 30000);
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

  private safeStringify(value: unknown): string {
    try {
      if (typeof value === 'string') return value;
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  ngOnDestroy(): void {
    if (this.liveLocationsTimer) {
      clearInterval(this.liveLocationsTimer);
      this.liveLocationsTimer = null;
    }

    this.liveLocationsSub?.unsubscribe();
    this.liveLocationsSub = null;

    this.stopGradientAnimation();
    this.destroyMap();
  }

  private async loadDataAndInitMap(): Promise<void> {
    await this.waitForMapDiv();
    this.initMap();
    this.loadLiveLocations(true);
  }

  private waitForMapDiv(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (document.getElementById('map-mapa')) {
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
      this.svgRenderer = this.leaflet.svg();

      this.map = this.leaflet.map('map-mapa', {
        /*zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,*/
        preferCanvas: this.isIos
      }).setView([40.414911, -3.691149], 14);

      this.leaflet.tileLayer('/assets/map/{z}/{x}/{y}.webp', {
        attribution: '© OpenStreetMap',
        maxZoom: 17,
        minZoom: 15,
        updateWhenIdle: true,
        keepBuffer: this.isIos ? 1 : 2,
      }).addTo(this.map);

      if (this.map.tap) this.map.tap.disable();

      this.liveLocationsLayer = this.leaflet.layerGroup().addTo(this.map);
      this.offscreenLayer = this.leaflet.layerGroup().addTo(this.map);

      // bind throttled redraw on map interactions so arrows/dots follow
      this.scheduleDrawOnMoveBound = this.scheduleDrawOnMove.bind(this);
      this.map.on('move', this.scheduleDrawOnMoveBound);
      this.map.on('zoom', this.scheduleDrawOnMoveBound);
      this.map.on('resize', this.scheduleDrawOnMoveBound);
    } else {
      this.clearMapLayers();
    }

    this.ensureRainbowPattern();
    this.drawExtraLine();
    this.drawLiveLocations();
    this.centerMapOnRoute();
  }

  centerMapOnRoute(): void {
    try {
      if (!this.map) return;
      if (this.extraPolyline) {
        try {
          const latlngs = (this.extraPolyline.getLatLngs && this.extraPolyline.getLatLngs()) || [];
          if (Array.isArray(latlngs) && latlngs.length >= 2) {
            const bounds = this.extraPolyline.getBounds();
            if (bounds && bounds.isValid && bounds.isValid()) {
              this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  private applyRouteStroke(polyline: any, fallbackColor: string): void {
    try {
      const path = polyline?._path as SVGElement | null;
      if (!path) return;

      const ownerSvg = path.ownerSVGElement as SVGSVGElement | null;
      if (!this.isIos && ownerSvg) this.ensureRainbowPatternOnSvg(ownerSvg);

      const stroke = this.isIos ? fallbackColor : 'url(#rainbowGradient)';

      path.setAttribute('stroke', stroke);
      path.setAttribute('stroke-width', '6');
      path.setAttribute('stroke-linecap', 'round');
      path.style.stroke = stroke;
      path.style.strokeWidth = '6px';
      path.style.strokeLinecap = 'round';
    } catch (e) {}
  }

  private ensureRainbowPattern(): void {
    if (!this.map || this.isIos) return;

    const overlayPane = this.map.getPanes().overlayPane as HTMLElement;
    const svg = overlayPane.querySelector('svg');
    if (svg) this.ensureRainbowPatternOnSvg(svg as unknown as SVGSVGElement);
    
  }

  private ensureRainbowPatternOnSvg(svg: SVGSVGElement | null): void {
    if (!svg || this.isIos) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    let defs = svg.querySelector('defs');

    if (!defs) {
      defs = document.createElementNS(SVG_NS, 'defs');
      svg.insertBefore(defs, svg.firstChild || null);
    }

    if (defs.querySelector('#rainbowGradient')) return;

    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', 'rainbowGradient');
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', String(this.gradientLength));
    grad.setAttribute('spreadMethod', 'repeat');

    const colors = [
      { offset: '0%', color: '#e40303' },
      { offset: '16.66%', color: '#ff8c00' },
      { offset: '33.33%', color: '#ffed00' },
      { offset: '50%', color: '#008026' },
      { offset: '66.66%', color: '#004dff' },
      { offset: '83.33%', color: '#750787' },
      { offset: '100%', color: '#e40303' }
    ];

    colors.forEach(s => {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', s.offset);
      stop.setAttribute('stop-color', s.color);
      grad.appendChild(stop);
    });

    defs.appendChild(grad);
    this.startGradientAnimation();
  }

  private startGradientAnimation(): void {
    if (this.isIos) return;
    if (this.gradientAnimId !== null) return;

    this.gradientStartTime = performance.now();

    const step = (ts: number) => {
      if (document.hidden) {
        this.gradientStartTime = ts;
        this.gradientAnimId = requestAnimationFrame(step);
        return;
      }

      const elapsed = (ts - this.gradientStartTime) / 1000;
      const offset = (elapsed * this.gradientSpeed) % this.gradientLength;
      const minDelta = 1000 / this.gradientFps;

      if (ts - this.lastGradientUpdate >= minDelta) {
        try {
          const grads = document.querySelectorAll('linearGradient#rainbowGradient');
          grads.forEach(g => g.setAttribute('gradientTransform', `translate(0 ${-offset})`));
        } catch (e) {}

        this.lastGradientUpdate = ts;
      }

      this.gradientAnimId = requestAnimationFrame(step);
    };

    this.gradientAnimId = requestAnimationFrame(step);
  }

  private stopGradientAnimation(): void {
    if (this.gradientAnimId !== null) {
      cancelAnimationFrame(this.gradientAnimId);
      this.gradientAnimId = null;
    }

  }

  private clearMapLayers(): void {
    if (!this.map) return;

    if (this.extraPolyline) {
      this.map.removeLayer(this.extraPolyline);
      this.extraPolyline = null;
    }

    //this.liveLocationsLayer?.clearLayers();
    //this.offscreenLayer?.clearLayers();
  }

  private destroyMap(): void {
    this.liveLocationsLayer?.clearLayers();
    this.liveLocationsLayer?.remove();
    this.liveLocationsLayer = null;
    this.offscreenLayer?.clearLayers();
    this.offscreenLayer?.remove();
    this.offscreenLayer = null;

    this.extraPolyline = null;
    this.svgRenderer = null;

    if (this.map) {
      try {
        if (this.scheduleDrawOnMoveBound) {
          this.map.off('move', this.scheduleDrawOnMoveBound);
          this.map.off('zoom', this.scheduleDrawOnMoveBound);
          this.map.off('resize', this.scheduleDrawOnMoveBound);
          this.scheduleDrawOnMoveBound = null;
        }
      } catch (e) {}

      this.map.remove();
      this.map = null;
    }
  }

  private scheduleDrawOnMove(): void {
    if (this.mapMoveScheduled) return;
    this.mapMoveScheduled = true;
    requestAnimationFrame(() => {
      try {
        this.drawLiveLocations();
      } catch (e) {}
      this.mapMoveScheduled = false;
    });
  }

  private loadLiveLocations(refreshMap = true): void {
    this.liveLocationsSub?.unsubscribe();
    this.liveLocationsSub = this.asociacionesService.getUbicacionesCompartidas(this.liveLocationsTtlMinutes).subscribe({
      next: ubicaciones => {
        this.ubicacionesVivas = (ubicaciones ?? [])
          .map(u => ({ ...u, lat: Number(u.lat), lng: Number(u.lng) }))
          .filter(u => Number.isFinite(u.lat) && Number.isFinite(u.lng));
          localStorage.setItem('lastLiveLocations', JSON.stringify(this.ubicacionesVivas));

        if (refreshMap) this.drawLiveLocations();
      },
      error: () => {
        const cached = localStorage.getItem('lastLiveLocations');
        if (cached) {
          this.ubicacionesVivas = JSON.parse(cached);
          this.drawLiveLocations();
        }
      }
    });
  }

  private drawLiveLocations(): void {
    if (!this.map ) return;

    this.liveLocationsLayer.clearLayers();
    this.offscreenLayer?.clearLayers();

    this.ubicacionesVivas.forEach((location: UbicacionCompartida) => {
      const color = this.getZonaColor(location.zona);
      const borderColor = this.getCircleBorderColor(location.zona);

      const circle = this.leaflet.circleMarker([location.lat, location.lng], {
        radius: this.isIos ? 9 : 12,
        color: borderColor,
        weight: this.isIos ? 2 : 3,
        fillColor: color,
        fillOpacity: 1,
        renderer: this.svgRenderer
      });

      const label = this.escapeHtml(location.displayName || `UUID ${location.uuid?.slice(0, 6)}`);
      const zona = this.escapeHtml(location.zona || '');
      const updatedAt = location.updatedAt
        ? new Date(location.updatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : 'reciente';

      circle.bindPopup(`<div class="live-location-popup"><strong>${label}</strong><br>Zona: ${zona}<br>Última actualización: ${updatedAt}</div>`);
      const latlng = this.leaflet.latLng(location.lat, location.lng);
      const mapBounds = this.map.getBounds();

      if (mapBounds.contains(latlng)) {
        circle.addTo(this.liveLocationsLayer);
      } else {
        // fuera de vista: dibujar flecha en el borde
        const colorForDot = this.getZonaColor(location.zona);
        const arrow = this.createOffscreenArrow(latlng, colorForDot);
        if (arrow) arrow.addTo(this.offscreenLayer);
      }
    });
  }

  private createOffscreenArrow(latlng: any, dotColor = '#7c3aed'): any | null {
    try {
      const mapSize = this.map.getSize();
      const point = this.map.latLngToContainerPoint(latlng);

      // calcular punto clamped dentro del padding del borde
      const pad = 20; // px padding from edge
      const x = Math.max(pad, Math.min(mapSize.x - pad, point.x));
      const y = Math.max(pad, Math.min(mapSize.y - pad, point.y));

      // si está dentro del rect, no es offscreen
      if (x === point.x && y === point.y) return null;

      const center = this.map.getSize().divideBy(2);
      const angle = Math.atan2(y - center.y, x - center.x);

      const safeColor = this.escapeHtml(dotColor || '#7c3aed');
      const html = `
        <div class="offscreen-arrow-inner" style="transform: rotate(${angle}rad);">
          <div class="offscreen-dot" style="background:${safeColor}"></div>
          <div class="offscreen-arrow-symbol">▶</div>
        </div>
      `;

      const icon = this.leaflet.divIcon({
        className: 'offscreen-arrow',
        html,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      const containerPoint = this.leaflet.point(x, y);
      const markerLatLng = this.map.containerPointToLatLng(containerPoint);

      const marker = this.leaflet.marker(markerLatLng, { icon, interactive: false });
      return marker;
    } catch (e) {
      return null;
    }
  }

  private drawExtraLine(): void {
    if (!this.map) return;

    if (this.extraPolyline) {
      this.map.removeLayer(this.extraPolyline);
      this.extraPolyline = null;
    }

    const coords = [
      [40.425149, -3.690248],
      [40.419327, -3.692865],
      [40.415985, -3.693674],
      [40.412416, -3.692842],
      [40.409568, -3.692149],
      [40.408794, -3.691347]
    ];

    this.extraPolyline = this.leaflet.polyline(coords, {
      weight: 6,
      opacity: 0.9,
      renderer: this.svgRenderer,
      color: this.isIos ? '#c4a3ff' : '#7c3aed'
    }).addTo(this.map);

    this.applyRouteStroke(this.extraPolyline, '#c4a3ff');
  }

  forceShareNow(): void {
    try {
      void this.locationSharingService.forceShareNow();
    } catch (e) {}
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

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

}
