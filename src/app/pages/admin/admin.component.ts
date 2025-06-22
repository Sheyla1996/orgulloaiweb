import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ChangeDetectionStrategy, Component, Inject, NO_ERRORS_SCHEMA, OnInit, PLATFORM_ID } from "@angular/core";
import {MatTabsModule} from '@angular/material/tabs';
import { AsociacionesService } from "../../services/asociaciones.service";
import { CarrozasService } from "../../services/carrozas.service";
import { TelefonosService } from "../../services/telefonos.service";
import { Asociacion } from "../../models/asociacion.model";
import { Carroza } from "../../models/carroza.model";
import { Telefono } from "../../models/telefono.model";
import { MapService } from "../../services/map.service";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { assert } from "console";


@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AdminComponent implements OnInit {

    tab: number = 0;
    asociaciones: Asociacion[] = [];
    carrozas: Carroza[] = [];
    telefonos: Telefono[] = [];
    map!: any;
    markerMap: { [id: number]: any } = {};
    marker: any = null;
    activeAsociacionId: number | null = null;
    activeCarrozaId: number | null = null;
    private _leaflet: any;
    private _observerCleanup: (() => void) | null = null;
    private _observerType: string | null = null;
    mapType = 'map-asociaciones';

    constructor(
        private _asociacionesService: AsociacionesService,
        private _carrozasService: CarrozasService,
        private _telefonosService: TelefonosService,
        private _mapService: MapService,
        private dialog: MatDialog,
        @Inject(PLATFORM_ID) private platformId: Object,
    ) {}

    async ngOnInit(): Promise<void> {
        if (isPlatformBrowser(this.platformId)) {
            this._leaflet = await import('leaflet');
            this.waitForMapDiv().then(() => {
                this._createMap();
                this.createMapHide();
                this.getAsociaciones();
            });
        }
    }

    getAsociaciones(): void {
        this._asociacionesService.getAsociaciones().subscribe(asociaciones => {
            this.asociaciones = asociaciones
            ?.map(a => ({ ...a, type: 'asociación' }))
            .sort((a, b) => a.sheet_row - b.sheet_row);
            this._setMapAsociaciones();
            this.initObserver('asociaciones');
            this.mapType = 'map-asociaciones';
        });
    }

    getCarrozas(): void {
        this._carrozasService.getCarrozas().subscribe(carrozas => {
            this.carrozas = carrozas
            ?.map(a => ({ ...a, type: 'carroza' }))
            .sort((a, b) => a.sheet_row - b.sheet_row);
            this._setMapCarrozas();
            this.initObserver('carrozas');
            this.mapType = 'map-carrozas';
        });
    }

    getTelefonos(): void {
        this._telefonosService.getTelefonos().subscribe(telefonos => {
            this.telefonos = telefonos;
        });
    }


    onTabChange(event: any): void {
        this.tab = event.index;
        switch (event.index) {
            case 0:
                this.getAsociaciones();
                break;
            case 1:
                this.getCarrozas();
                break;
            case 2:
                this.getTelefonos();
                break;
            default:
                break;
        }
    }



    //Mapa

    private _clearMapLayers(): void {
        this.map.eachLayer((layer: any) => {
        if (layer instanceof this._leaflet.Marker || layer instanceof this._leaflet.Polyline) {
            this.map.removeLayer(layer);
        }
        });
        this.markerMap = {};
    }

    private _createMap(): void {
        if (!this.map) {
            this.map = this._leaflet.map('map').setView([40.412, -3.692], 17);
            this._leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
                attribution: '© OpenStreetMap',
                maxZoom: 18,
                minZoom: 15,
            }).addTo(this.map);
        } else {
            this._clearMapLayers();
        }
    }

    setMapItem(a: any): void {
      if (a && this.map) {
        const customIcon = this._leaflet.icon({
          iconUrl: '/assets/icons/marker.svg',
          iconSize: [60, 60],
          iconAnchor: [30, 60],
          popupAnchor: [0, -60],
        });
        let popupContent = `<b>${a.name}</b>`;
        if (a.type === 'carroza') {
            popupContent = a.logo
                ? `<img src="https://laalisedadetormes.com/orgullo/${a.logo}.webp" alt="${a.name}" style="max-width:100px;max-height:100px;display:block;padding-top:8px;">`
                : `<b style="max-width:100px;max-height:100px;display:block;">${a.name}</b>`;
        }
        this.marker = this._leaflet.marker([a.lat, a.lng], { icon: customIcon })
          .addTo(this.map)
          .bindPopup(popupContent)
          .openPopup();
        this.map.setView([a.lat, a.lng], 18, { animate: true });
      }
    }

    private async waitForMapDiv(): Promise<void> {
        return new Promise(resolve => {
        const check = () => {
            if (document.getElementById('map')) {
            resolve();
            } else {
            setTimeout(check, 50);
            }
        };
        check();
        });
    }

    initObserver(type: string): void {
        // Limpia el listener anterior si existe
        if (this._observerCleanup) {
            this._observerCleanup();
            this._observerCleanup = null;
        }

        const container = document.getElementById(type === 'asociaciones' ? 'list-container-asoc' : 'list-container-carr');
        if (!container) return;

        let lastActiveId: number | null = null;
        this._observerType = type;

        const onScroll = () => {
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
                let id: number | null = null;
                let item: any = null;

                if (type === 'carrozas') {
                    id = parseInt(firstVisible.id.replace('carr-', ''), 10);
                    if (id === lastActiveId) return;
                    this.marker?.remove();
                    this.activeCarrozaId = id;
                    lastActiveId = id;
                    item = this.carrozas.find(a => a.id === id);
                } else if (type === 'asociaciones') {
                    id = parseInt(firstVisible.id.replace('asoc-', ''), 10);
                    if (id === lastActiveId) return;
                    this.marker?.remove();
                    this.activeAsociacionId = id;
                    lastActiveId = id;
                    item = this.asociaciones.find(a => a.id === id);
                }

                if (item) this.setMapItem(item);
            }
        };

        container.addEventListener('scroll', onScroll);

        // Limpieza para evitar listeners duplicados
        this._observerCleanup = () => {
            container.removeEventListener('scroll', onScroll);
        };

        // Llama una vez al cargar para sincronizar el marcador
        setTimeout(onScroll, 0);
    }


    private _setMapAsociaciones(): void {
        this._clearMapLayers();
        const path: [number, number][] = [];

        this.asociaciones.forEach(a => {
            path.push([a.lat, a.lng]);
        });

        for (let i = 1; i < this.asociaciones.length; i++) {
            const prev = this.asociaciones[i - 1];
            const curr = this.asociaciones[i];
            const color = this._getZonaColor(curr.zona);

            this._leaflet.polyline(
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

    private _setMapCarrozas(): void {
        this._clearMapLayers();
        const path: [number, number][] = [];

        this.carrozas.forEach(a => {
            path.push([a.lat, a.lng]);
        });

        for (let i = 1; i < this.carrozas.length; i++) {
            const prev = this.carrozas[i - 1];
            const curr = this.carrozas[i];
            const color = this._getZonaColor(curr.zona);

            this._leaflet.polyline(
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







    // Utils
    private _getZonaColor(zona: string): string {
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


    createMapHide(): void {
        this._mapService.initializeMap('map-hide', {
        center: [40.4094783, -3.69111],
        zoom: 16
        });

        this._leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
            attribution: '© OpenStreetMap',
            maxZoom: 18,
            minZoom: 15,
        }).addTo(this._mapService['map']);
    }

    getListPosition(type: string): any {
        let markers;
        this._mapService.clearMapLayers();
        if (type === 'asociaciones') {
            const recorrido = [
                this._leaflet.latLng(40.412416, -3.692842), //Inicio
                this._leaflet.latLng(40.409798, -3.692232),//Semaforo
                this._leaflet.latLng(40.409486, -3.692095), //Moyano
                this._leaflet.latLng(40.408929, -3.691708), //Glorieta
                this._leaflet.latLng(40.408045, -3.690157) //Final
            ];
            markers = this._mapService.getAsocMarkers(this._mapService.map, recorrido, this.asociaciones.length, true);
        } else if (type === 'carrozas') {
            const lines = [];
            lines.push([new this._leaflet.LatLng(40.407099, -3.692758), new this._leaflet.LatLng(40.406359, -3.691967) ]);
            lines.push([new this._leaflet.LatLng(40.405928, -3.691514), new this._leaflet.LatLng(40.405662, -3.691192) ]);
            lines.push([new this._leaflet.LatLng(40.405567, -3.691090), new this._leaflet.LatLng(40.404914, -3.690375) ]);
            lines.push([new this._leaflet.LatLng(40.404832, -3.690295), new this._leaflet.LatLng(40.403159, -3.688455) ]);
            lines.push([new this._leaflet.LatLng(40.402966, -3.688234), new this._leaflet.LatLng(40.401832, -3.686979) ]);
            lines.push([new this._leaflet.LatLng(40.401751, -3.686896), new this._leaflet.LatLng(40.401666, -3.686790) ]);
            lines.push([new this._leaflet.LatLng(40.401390, -3.686665), new this._leaflet.LatLng(40.400735, -3.685780) ]);
            lines.push([new this._leaflet.LatLng(40.400656, -3.685687), new this._leaflet.LatLng(40.400068, -3.685120) ]);
            lines.push([new this._leaflet.LatLng(40.399837, -3.684794), new this._leaflet.LatLng(40.399596, -3.684513) ]);
            markers = this._mapService.getCarrMarkers(this._mapService.map, lines, this.carrozas.length, true);
        }
        return markers;
    }

    getListAscociaciones(): void {
        const markers = this.getListPosition('asociaciones');
        console.log('Markers Asociaciones:', markers);
        const asocs = this.asociaciones.map((asoc, index) => {
            const marker = markers[index];
            if (marker) {
                asoc.lat = marker.getLatLng().lat;
                asoc.lng = marker.getLatLng().lng;
                return asoc;
            }
            return asoc;
        });
        console.log(asocs);
        this._asociacionesService.updatePosition(asocs).subscribe({
            next: () => {
                console.log('Actualizadas', asocs);
                this.asociaciones = {...asocs};
                this._setMapAsociaciones();
                this.initObserver('asociaciones');
                this.mapType = 'map-asociaciones';
            },
            error: (error) => console.error(`Error updating Asociaciónes`, error)
        });
    }

    getListCarrozas(): void {
        const markers = this.getListPosition('carrozas');
        console.log('Markers carrozas:', markers);
        const carrs = this.carrozas.map((carr, index) => {
            const marker = markers[index];
            if (marker) {
                carr.lat = marker.getLatLng().lat;
                carr.lng = marker.getLatLng().lng;
                return carr;
            }
            return carr;
        });
        console.log(carrs);
        this._carrozasService.updatePosition(carrs).subscribe({
            next: () => {
                console.log(`Actualizadas`);
                this.carrozas = carrs
                    ?.map(a => ({ ...a, type: 'carroza' }))
                    .sort((a, b) => a.sheet_row - b.sheet_row);
                this._setMapCarrozas();
                this.initObserver('carrozas');
                this.mapType = 'map-carrozas';
            },
            error: (error) => console.error(`Error updating Carrozas`, error)
        });
    }

    getListFromSheet() {
        switch(this.tab) {
            case 0: // Asociaciones
                this._asociacionesService.getAsociacionesFromSheet().subscribe(asociaciones => {
                    this.asociaciones = asociaciones;
                    this.getListAscociaciones();
                });
                break;
            case 1: // Carrozas
                this._carrozasService.getCarrozasFromSheet().subscribe(carrozas => {
                    this.carrozas = carrozas;
                    this.getListCarrozas();
                });
                break;
            default:
                console.log('Tab no reconocida');
                break;
        }
    }

    getPosition(): void {
        switch(this.tab) {
            case 0: // Asociaciones
                this.getListAscociaciones();
                break;
            case 1: // Carrozas
                this.getListCarrozas();
                break;
            default:
                console.log('Tab no reconocida');
                break;
        }
    }


    updateStatus(id: number, status: string, sheet_row: number) {
        this._carrozasService.updateState(id, {
            status: status,
            sheet_row: sheet_row
        }).subscribe({
            next: () => {
                console.log(`Carroza ${id} updated to ${status}`);
                this.getCarrozas();
            },
            error: (error) => console.error(`Error updating Carroza ${id}`, error)
        });
    }

    openDialog(id: number, sheet_row: number, status?: string): void {
        const dialogRef = this.dialog.open(ModalStatusComponent, {
            data: { id, sheet_row, status }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && result !== status) {
                this.updateStatus(id, result, sheet_row);
            }
        });
    }



}

@Component({
  selector: 'modal-status',
  templateUrl: 'modal-status.component.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalStatusComponent {

    selected = 'pendiente';

    constructor(
        public dialogRef: MatDialogRef<ModalStatusComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { id: number, sheet_row: number, status: string }
    ) {
        this.selected = this.data.status.toLocaleLowerCase() || 'pendiente';
    }

    onSelectChange(event: any): void {
        console.log('Selected value:', event.value);
        this.selected = event.value;
    }

    onSave(): void {
        this.dialogRef.close(this.selected);
    }

    onClose(): void {
        this.dialogRef.close();
    }
}