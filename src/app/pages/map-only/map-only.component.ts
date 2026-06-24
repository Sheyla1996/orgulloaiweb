import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  private gradientAnimId: number | null = null;
  private gradientStartTime = 0;
  private readonly gradientLength = 220; // tile height in px (e.g. 6 stripes x 20px)
  private readonly gradientSpeed = 20; // px per second (controls speed)
  private isIosSafari = false;
  private lastGradientUpdate = 0;
  private readonly gradientFps = 30;
  private liveLocationsTimer: ReturnType<typeof setInterval> | null = null;
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
    this.isIosSafari = this.checkIsIosSafari();
    this.leaflet = await import('leaflet');
    // determine whether to show force-share button based on userType
    try {
      const ut = (localStorage.getItem('userType') || localStorage.getItem('shareLocationUserType') || '').toLowerCase();
      const zona = (localStorage.getItem('zona') || '').toLowerCase();
      this.showForceShareButton = ['coor', 'coor_manana', 'boss', 'test'].includes(ut) || (ut === 'test' && zona === 'coor');
    } catch (e) {
      this.showForceShareButton = false;
    }
    
    // Add lightweight client-side error capture to help diagnose crashes
    try {
      window.addEventListener('error', (ev: ErrorEvent) => {
        try {
          const info = {
            type: 'error',
            message: ev.message,
            filename: ev.filename,
            lineno: ev.lineno,
            colno: ev.colno,
            stack: (ev.error && ev.error.stack) ? ev.error.stack : null,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            asociacionesCount: this.asociaciones?.length ?? 0,
          };
          localStorage.setItem('lastClientError', JSON.stringify(info));
        } catch (e) {}
      });
      window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
        try {
          const info = {
            type: 'unhandledrejection',
            reason: ev.reason,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            asociacionesCount: this.asociaciones?.length ?? 0,
          };
          localStorage.setItem('lastClientError', JSON.stringify(info));
        } catch (e) {}
      });
    } catch (e) {}
    await this.loadDataAndInitMap();
    this.liveLocationsTimer = setInterval(() => this.loadLiveLocations(true), 30000);
  }

  private checkIsIosSafari(): boolean {
    try {
      const ua = navigator.userAgent || '';
      const isIphoneOrIpodOrIpad = /iP(hone|od|ad)/i.test(ua);
      const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|Edg|OPiOS|Chrome/i.test(ua);
      return isIphoneOrIpodOrIpad && isSafari;
    } catch (e) {
      return false;
    }
  }

  ngOnDestroy(): void {
    if (this.liveLocationsTimer) {
      clearInterval(this.liveLocationsTimer);
      this.liveLocationsTimer = null;
    }
    this.destroyMap();
    this.stopGradientAnimation();
  }

  private async loadDataAndInitMap(): Promise<void> {
    this.spinner.show();
    this.asociacionesService.getAsociaciones().subscribe({
      next: async data => {
        this.asociaciones = data.map(a => ({ ...a, lat: a.lat, lng: a.lng })).sort((a, b) => a.position - b.position);
        await this.waitForMapDiv();
        this.spinner.hide();
          this.initMap();
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
      this.map = this.leaflet.map('map-mapa').setView([/*40.416511, -3.691149*/40.346750, -3.695119], 15);
      this.leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 15,
        minZoom: 15,
      }).addTo(this.map);
      this.map.dragging.disable();
      this.map.touchZoom.disable();
      this.map.doubleClickZoom.disable();
      this.map.scrollWheelZoom.disable();
      this.map.boxZoom.disable();
      this.map.keyboard.disable();
      this.map.zoomControl.remove();
      if (this.map.tap) this.map.tap.disable();
      this.liveLocationsLayer = this.leaflet.layerGroup().addTo(this.map);
    } else {
      this.clearMapLayers();
    }

    // ensure the animated rainbow SVG gradient is available
    this.ensureRainbowPattern();

    // draw main polylines (asociaciones) with gradient
    this.drawPolylines();

    this.drawExtraLine();
    this.drawLiveLocations();
  }

  private drawPolylines(): void {
    if (!this.map || !this.asociaciones) return;
    for (let i = 1; i < this.asociaciones.length; i++) {
      const prev = this.asociaciones[i - 1];
      const curr = this.asociaciones[i];
      const pl = this.leaflet.polyline([[prev.lat, prev.lng], [curr.lat, curr.lng]], { weight: 6, renderer: this.leaflet.svg() }).addTo(this.map);
      try {
        const path = (pl as any)._path as SVGElement | null;
        if (path) {
          // ensure gradient exists in this SVG
          try {
            const ownerSvg = (path as any).ownerSVGElement as SVGSVGElement | null;
            if (!this.isIosSafari && ownerSvg) this.ensureRainbowPatternOnSvg(ownerSvg);
          } catch (err) {}
          if (this.isIosSafari) {
            path.setAttribute('stroke', '#7c3aed');
          } else {
            path.setAttribute('stroke', 'url(#rainbowGradient)');
          }
          path.setAttribute('stroke-width', '6');
          path.setAttribute('stroke-linecap', 'round');
          try {
            if (this.isIosSafari) {
              (path as any).style.stroke = '#7c3aed';
            } else {
              (path as any).style.stroke = 'url(#rainbowGradient)';
            }
            (path as any).style.strokeWidth = '6px';
            (path as any).style.strokeLinecap = 'round';
          } catch (e) {}
        }
      } catch (err) {
        // ignore
      }
    }
  }

  // Inject an SVG <pattern> with horizontal rainbow stripes and an animation
  // that translates the pattern from bottom to top. The pattern is referenced
  // from polylines by setting their `stroke` attribute to `url(#rainbowPattern)`.
  private ensureRainbowPattern(): void {
    if (!this.map) return;
    if (this.isIosSafari) return; // avoid injecting patterns on iOS Safari
    try {
      const overlayPane = this.map.getPanes().overlayPane as HTMLElement;
      const svg = overlayPane.querySelector('svg');
      if (svg) {
        this.ensureRainbowPatternOnSvg(svg as unknown as SVGSVGElement);
      }
    } catch (err) {
      console.error('Error creating rainbow pattern:', err);
    }
  }

  // Ensure the rainbow pattern exists inside the given SVG element. This helps
  // when the global overlay SVG isn't yet present — we can inject into the
  // specific SVG that contains the polyline path (path.ownerSVGElement).
  private ensureRainbowPatternOnSvg(svg: SVGSVGElement | null): void {
    if (!svg) return;
    if (this.isIosSafari) return; // skip SVG defs/gradients on iOS Safari
    const SVG_NS = 'http://www.w3.org/2000/svg';
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(SVG_NS, 'defs');
      svg.insertBefore(defs, svg.firstChild || null);
    }
    if (defs.querySelector('#rainbowGradient')) return; // already present

    // create a vertical linearGradient and animate its transform to move upward
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', 'rainbowGradient');
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    // start and end Y values cover the stripe block height
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', String(this.gradientLength));
    grad.setAttribute('spreadMethod', 'repeat');

    // Define a short tile with 6 color stops and duplicate first color at the end
    // so the repeat doesn't show a hard seam (last = first)
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

    // We animate the gradient via JavaScript (requestAnimationFrame)
    // to avoid visible SMIL reset jumps; see startGradientAnimation().

    defs.appendChild(grad);
    // If iOS Safari, avoid continuous RAF animation (heavy on CPU/mem).
    if (this.isIosSafari) {
      // keep gradient static (or very slow) to prevent repeated crashes
      try {
        grad.setAttribute('gradientTransform', `translate(0 0)`);
      } catch (e) {}
    } else {
      // start JS animation loop if not already running
      this.startGradientAnimation();
    }
  }

  private startGradientAnimation(): void {
    if (this.gradientAnimId !== null) return; // already running
    this.gradientStartTime = performance.now();
    const step = (ts: number) => {
      // throttle to ~gradientFps and skip when page hidden
      if (document.hidden) {
        this.gradientStartTime = ts;
        this.gradientAnimId = requestAnimationFrame(step);
        return;
      }
      const elapsed = (ts - this.gradientStartTime) / 1000; // seconds
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
    this.ubicacionesVivas.forEach((location: UbicacionCompartida) => {
      const color = this.getZonaColor(location.zona);
      const circle = this.leaflet.circleMarker([location.lat, location.lng], {
        radius: 12,
        color: '#ffffff',
        weight: 3,
        fillColor: color,
        fillOpacity: 1,
      });

      const label = location.displayName || `UUID ${location.uuid?.slice(0, 6)}`;
      const updatedAt = location.updatedAt ? new Date(location.updatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'reciente';
      circle.bindPopup(`<div class="live-location-popup"><strong>${label}</strong><br>Zona: ${location.zona}<br>Última actualización: ${updatedAt}</div>`);
      circle.addTo(this.liveLocationsLayer);
    });
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
    const pl = this.leaflet.polyline(coords, { weight: 6, opacity: 0.9, renderer: this.leaflet.svg() }).addTo(this.map);
    try {
      const path = (pl as any)._path as SVGElement | null;
      if (path) {
        // ensure the pattern exists in the SVG that contains this path
        try {
          const ownerSvg = (path as any).ownerSVGElement as SVGSVGElement | null;
          if (!this.isIosSafari && ownerSvg) this.ensureRainbowPatternOnSvg(ownerSvg);
        } catch (err) {
          // ignore
        }
        // set both presentation attributes and inline style to override Leaflet
        if (this.isIosSafari) {
          path.setAttribute('stroke', '#c4a3ff');
        } else {
          path.setAttribute('stroke', 'url(#rainbowGradient)');
        }
        path.setAttribute('stroke-width', '6');
        path.setAttribute('stroke-linecap', 'round');
        try {
          if (this.isIosSafari) {
            (path as any).style.stroke = '#c4a3ff';
          } else {
            (path as any).style.stroke = 'url(#rainbowGradient)';
          }
          (path as any).style.strokeWidth = '6px';
          (path as any).style.strokeLinecap = 'round';
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      // ignore
    }
  }

  forceShareNow(): void {
    try {
      void this.locationSharingService.forceShareNow();
    } catch (e) {
      // ignore
    }
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
