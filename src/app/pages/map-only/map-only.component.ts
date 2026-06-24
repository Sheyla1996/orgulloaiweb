import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { AsociacionesService, UbicacionCompartida } from '../../services/asociaciones.service';
import { LocationSharingService } from '../../services/location-sharing.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-map-only',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './map-only.component.html',
  styleUrls: ['./map-only.component.scss']
})
export class MapOnlyComponent implements OnInit, OnDestroy {
  map: any = null;
  leaflet: any;
  asociaciones: any[] = [];
  ubicacionesVivas: UbicacionCompartida[] = [];
  liveLocationsLayer: any = null;

  private svgRenderer: any = null;
  private routePolyline: any = null;
  private extraPolyline: any = null;

  private gradientAnimId: number | null = null;
  private gradientStartTime = 0;
  private readonly gradientLength = 220;
  private readonly gradientSpeed = 20;
  private isIos = false;
  private lastGradientUpdate = 0;
  private readonly gradientFps = 30;

  private liveLocationsTimer: ReturnType<typeof setInterval> | null = null;
  private asociacionesSub: Subscription | null = null;
  private liveLocationsSub: Subscription | null = null;

  private readonly liveLocationsTtlMinutes = 5;
  showForceShareButton = false;

  constructor(
    private asociacionesService: AsociacionesService,
    private locationSharingService: LocationSharingService,
    private spinner: NgxSpinnerService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isIos = this.checkIsIos();

    try { localStorage.setItem('mapInitInProgress', '1'); } catch (e) {}

    this.leaflet = await import('leaflet');

    try {
      const ut = (localStorage.getItem('userType') || localStorage.getItem('shareLocationUserType') || '').toLowerCase();
      const zona = (localStorage.getItem('zona') || '').toLowerCase();
      this.showForceShareButton = ['coor', 'coor_manana', 'boss', 'test'].includes(ut) || (ut === 'test' && zona === 'coor');
    } catch (e) {
      this.showForceShareButton = false;
    }

    this.installClientErrorLogger();

    await this.loadDataAndInitMap();

    this.liveLocationsTimer = setInterval(() => this.loadLiveLocations(true), 30000);
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

  private installClientErrorLogger(): void {
    try {
      window.addEventListener('error', (ev: ErrorEvent) => {
        try {
          const info = {
            type: 'error',
            message: ev.message,
            filename: ev.filename,
            lineno: ev.lineno,
            colno: ev.colno,
            stack: ev.error?.stack ?? null,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            asociacionesCount: this.asociaciones?.length ?? 0,
            mapInitInProgress: localStorage.getItem('mapInitInProgress') || null,
            mapGradientActive: localStorage.getItem('mapGradientActive') || null,
          };
          localStorage.setItem('lastClientError', JSON.stringify(info));
        } catch (e) {}
      });

      window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
        try {
          const info = {
            type: 'unhandledrejection',
            reason: this.safeStringify(ev.reason),
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            asociacionesCount: this.asociaciones?.length ?? 0,
            mapInitInProgress: localStorage.getItem('mapInitInProgress') || null,
            mapGradientActive: localStorage.getItem('mapGradientActive') || null,
          };
          localStorage.setItem('lastClientError', JSON.stringify(info));
        } catch (e) {}
      });
    } catch (e) {}
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

    this.asociacionesSub?.unsubscribe();
    this.asociacionesSub = null;

    this.liveLocationsSub?.unsubscribe();
    this.liveLocationsSub = null;

    this.stopGradientAnimation();
    this.destroyMap();

    try { localStorage.setItem('mapInitInProgress', '0'); } catch (e) {}
  }

  private async loadDataAndInitMap(): Promise<void> {
    this.spinner.show();

    this.asociacionesSub?.unsubscribe();
    this.asociacionesSub = this.asociacionesService.getAsociaciones().subscribe({
      next: async data => {
        this.asociaciones = (data ?? [])
          .map(a => ({ ...a, lat: Number(a.lat), lng: Number(a.lng) }))
          .filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lng))
          .sort((a, b) => a.position - b.position);

        await this.waitForMapDiv();
        this.spinner.hide();
        this.initMap();
      },
      error: error => {
        this.spinner.hide();
        this.saveClientStageError('getAsociacionesError', error);
      }
    });

    this.loadLiveLocations(false);
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
      try { localStorage.setItem('mapStep', 'creatingMap'); } catch (e) {}

      this.svgRenderer = this.leaflet.svg();

      this.map = this.leaflet.map('map-mapa', {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        preferCanvas: this.isIos
      }).setView([40.346750, -3.695119], 15);

      try {
        this.leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 15,
          minZoom: 15,
          updateWhenIdle: true,
          keepBuffer: this.isIos ? 1 : 2,
        }).addTo(this.map);
        try { localStorage.setItem('mapStep', 'tileLayerAdded'); } catch (e) {}
      } catch (err) {
        this.saveClientStageError('tileLayerError', err);
      }

      if (this.map.tap) this.map.tap.disable();

      this.liveLocationsLayer = this.leaflet.layerGroup().addTo(this.map);
      try { localStorage.setItem('mapStep', 'layerGroupAdded'); } catch (e) {}
    } else {
      this.clearMapLayers();
    }

    this.ensureRainbowPattern();

    try {
      this.drawPolylines();
      try { localStorage.setItem('mapStep', 'polylinesDrawn'); } catch (e) {}
    } catch (err) {
      this.saveClientStageError('drawPolylines', err);
    }

    try {
      this.drawExtraLine();
      try { localStorage.setItem('mapStep', 'extraLineDrawn'); } catch (e) {}
    } catch (err) {
      this.saveClientStageError('drawExtraLine', err);
    }

    try {
      this.drawLiveLocations();
      try { localStorage.setItem('mapStep', 'liveLocationsDrawn'); } catch (e) {}
    } catch (err) {
      this.saveClientStageError('drawLiveLocations', err);
    }
  }

  /**
   * Antes se creaba una polyline por cada tramo y un renderer SVG por tramo.
   * En iOS eso puede consumir mucha memoria. Ahora se crea una sola polyline.
   */
  private drawPolylines(): void {
    if (!this.map || !this.asociaciones?.length) return;

    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }

    const coords = this.asociaciones
      .map(a => [a.lat, a.lng])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (coords.length < 2) return;

    this.routePolyline = this.leaflet.polyline(coords, {
      weight: 6,
      renderer: this.svgRenderer,
      color: this.isIos ? '#7c3aed' : '#7c3aed'
    }).addTo(this.map);

    this.applyRouteStroke(this.routePolyline, '#7c3aed');
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

    try {
      const overlayPane = this.map.getPanes().overlayPane as HTMLElement;
      const svg = overlayPane.querySelector('svg');
      if (svg) this.ensureRainbowPatternOnSvg(svg as unknown as SVGSVGElement);
    } catch (err) {
      this.saveClientStageError('ensureRainbowPattern', err);
    }
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
    try { localStorage.setItem('mapGradientActive', '1'); } catch (e) {}

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

    try {
      localStorage.setItem('mapGradientActive', '0');
      localStorage.setItem('lastGradientStopped', String(Date.now()));
    } catch (e) {}
  }

  private clearMapLayers(): void {
    if (!this.map) return;

    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }

    if (this.extraPolyline) {
      this.map.removeLayer(this.extraPolyline);
      this.extraPolyline = null;
    }

    this.liveLocationsLayer?.clearLayers();
  }

  private destroyMap(): void {
    this.liveLocationsLayer?.clearLayers();
    this.liveLocationsLayer?.remove();
    this.liveLocationsLayer = null;

    this.routePolyline = null;
    this.extraPolyline = null;
    this.svgRenderer = null;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private loadLiveLocations(refreshMap = true): void {
    this.liveLocationsSub?.unsubscribe();
    this.liveLocationsSub = this.asociacionesService.getUbicacionesCompartidas(this.liveLocationsTtlMinutes).subscribe({
      next: ubicaciones => {
        this.ubicacionesVivas = (ubicaciones ?? [])
          .map(u => ({ ...u, lat: Number(u.lat), lng: Number(u.lng) }))
          .filter(u => Number.isFinite(u.lat) && Number.isFinite(u.lng));

        if (refreshMap) this.drawLiveLocations();
      },
      error: error => this.saveClientStageError('loadLiveLocations', error)
    });
  }

  private drawLiveLocations(): void {
    if (!this.map || !this.liveLocationsLayer) return;

    this.liveLocationsLayer.clearLayers();

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
      circle.addTo(this.liveLocationsLayer);
    });
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
      [40.412416, -3.692842]
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

  private saveClientStageError(stage: string, error: unknown): void {
    try {
      localStorage.setItem('mapStep', `${stage}Error`);
      localStorage.setItem('lastClientError', JSON.stringify({
        stage,
        message: this.safeStringify(error),
        ts: Date.now(),
        userAgent: navigator.userAgent,
        asociacionesCount: this.asociaciones?.length ?? 0,
        ubicacionesVivasCount: this.ubicacionesVivas?.length ?? 0
      }));
    } catch (e) {}
  }
}
