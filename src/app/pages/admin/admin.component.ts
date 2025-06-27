import { CommonModule, isPlatformBrowser } from "@angular/common";
import { AfterViewInit, ChangeDetectionStrategy, Component, Inject, NO_ERRORS_SCHEMA, OnInit, PLATFORM_ID } from "@angular/core";
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
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { NgxSpinnerService } from "ngx-spinner";
import { ErrorModalService } from "../../components/error-modal/error-modal.service";

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        MatButtonModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule
    ],
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    schemas: [NO_ERRORS_SCHEMA]
})
export class AdminComponent implements OnInit, AfterViewInit {
    tab = 0;
    asociaciones: Asociacion[] = [];
    carrozas: Carroza[] = [];
    telefonos: Telefono[] = [];
    map!: any;
    markerMap: Record<number, any> = {};
    marker: any = null;
    activeAsociacionId: number | null = null;
    activeCarrozaId: number | null = null;
    private _leaflet: any;
    private _observerCleanup: (() => void) | null = null;
    private _observerType: string | null = null;
    mapType = 'map-asociaciones';
    searchText = '';
    showMap = true;

    constructor(
        private asociacionesService: AsociacionesService,
        private carrozasService: CarrozasService,
        private telefonosService: TelefonosService,
        private mapService: MapService,
        private dialog: MatDialog,
        private spinner: NgxSpinnerService,
        private _errorModal: ErrorModalService,
        @Inject(PLATFORM_ID) private platformId: Object,
    ) {}

    async ngOnInit(): Promise<void> {
    }

    async ngAfterViewInit(): Promise<void> {
        if (isPlatformBrowser(this.platformId)) {
            await this.waitForMapDiv();
            this._leaflet = await import('leaflet');
            this.createMap();
            this.createMapHide();
            this.loadAsociaciones();
        }
    }

    private loadAsociaciones(): void {
        this.spinner.show();
        this.asociacionesService.getAsociaciones().subscribe({
            next: asociaciones => {
                this.asociaciones = [...asociaciones]
                    .map(a => ({ ...a, type: 'asociación' }))
                    .sort((a, b) => a.sheet_row - b.sheet_row);
                console.log(this.asociaciones);
                    this.setMapAsociaciones();
                this.initObserver('asociaciones');
                this.mapType = 'map-asociaciones';
                this.spinner.hide();
            },
            error: error => {
                this._errorModal.openDialog(error);
                console.error('Error al obtener asociaciones:', error);
                this.spinner.hide();
            }
        });
    }

    private loadCarrozas(): void {
        this.spinner.show();
        this.carrozasService.getCarrozas().subscribe({
            next: carrozas => {
                this.carrozas = (carrozas ?? [])
                    .map(a => ({ ...a, type: 'carroza' }))
                    .sort((a, b) => a.sheet_row - b.sheet_row);
                this.setMapCarrozas();
                this.initObserver('carrozas');
                this.mapType = 'map-carrozas';
                this.spinner.hide();
            },
            error: error => {
                this._errorModal.openDialog(error);
                console.error('Error al obtener carrozas:', error);
                this.spinner.hide();
            }
        });
    }

    private loadTelefonos(): void {
        this.spinner.show();
        this.telefonosService.getTelefonos().subscribe({
            next: telefonos => {
                this.telefonos = telefonos ?? [];
                this.spinner.hide();
            },
            error: error => {
                this._errorModal.openDialog(error);
                console.error('Error al obtener teléfonos:', error);
                this.spinner.hide();
            }
        });
    }

    onTabChange(event: any): void {
        this.tab = event.index;
        this.searchText = '';
        switch (event.index) {
            case 0:
                this.showMap = true;
                this.loadAsociaciones();
                break;
            case 1:
                this.showMap = true;
                this.loadCarrozas();
                break;
            case 2:
                this.showMap = false;
                this.loadTelefonos();
                break;
        }
    }

    // Mapa

    private clearMapLayers(): void {
        this.map.eachLayer((layer: any) => {
            if (layer instanceof this._leaflet.Marker || layer instanceof this._leaflet.Polyline) {
                this.map.removeLayer(layer);
            }
        });
        this.markerMap = {};
    }

    private createMap(): void {
        if (!this.map) {
            this.map = this._leaflet.map('map').setView([40.412, -3.692], 18);
            this._leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
                attribution: '© OpenStreetMap',
                maxZoom: 18,
                minZoom: 15,
            }).addTo(this.map);
        } else {
            this.clearMapLayers();
        }
    }

    setMapItem(item: any): void {
        if (!item || !this.map) return;
        const customIcon = this._leaflet.icon({
            iconUrl: '/assets/icons/marker.svg',
            iconSize: [60, 60],
            iconAnchor: [30, 60],
            popupAnchor: [0, -60],
        });
        let popupContent = `<b>${item.name}</b>`;
        if (item.type === 'carroza') {
            popupContent = item.logo
                ? `<img src="https://laalisedadetormes.com/orgullo/${item.logo}.webp" alt="${item.name}" style="max-width:100px;max-height:100px;display:block;padding-top:8px;">`
                : `<b style="max-width:100px;max-height:100px;display:block;">${item.name}</b>`;
        }
        this.marker = this._leaflet.marker([item.lat, item.lng], { icon: customIcon })
            .addTo(this.map)
            .bindPopup(popupContent)
            .openPopup();

        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            const mapHeight = mapDiv.clientHeight;
            const offsetY = mapHeight > 0 ? (mapHeight / 6) : 0;
            const targetPoint = this.map.project([item.lat, item.lng], this.map.getZoom()).subtract([0, offsetY]);
            const targetLatLng = this.map.unproject(targetPoint, this.map.getZoom());
            this.map.setView(targetLatLng, 18, { animate: true });
        } else {
            this.map.setView([item.lat, item.lng], 18, { animate: true });
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
        this._observerCleanup = () => container.removeEventListener('scroll', onScroll);
        setTimeout(onScroll, 0);
    }

    private setMapAsociaciones(): void {
        this.clearMapLayers();
        this.asociaciones.forEach((a, i) => {
            if (i > 0) {
                const prev = this.asociaciones[i - 1];
                const color = this.getZonaColor(a.zona);
                this._leaflet.polyline(
                    [
                        [prev.lat, prev.lng],
                        [a.lat, a.lng]
                    ],
                    { color, weight: 6 }
                ).addTo(this.map);
            }
        });
        if (this.asociaciones.length > 0) {
            this.setMapItem(this.asociaciones[0]);
        }
    }

    private setMapCarrozas(): void {
        this.clearMapLayers();
        this.carrozas.forEach((a, i) => {
            if (i > 0) {
                const prev = this.carrozas[i - 1];
                const color = this.getZonaColor(a.zona);
                this._leaflet.polyline(
                    [
                        [prev.lat, prev.lng],
                        [a.lat, a.lng]
                    ],
                    { color, weight: 6 }
                ).addTo(this.map);
            }
        });
        if (this.carrozas.length > 0) {
            this.setMapItem(this.carrozas[0]);
        }
    }

    // Utils

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

    createMapHide(): void {
        this.mapService.initializeMap('map-hide', {
            center: [40.412, -3.692],
            zoom: 18
        });
        setTimeout(() => {
            this._leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
                attribution: '© OpenStreetMap',
                maxZoom: 18,
                minZoom: 15,
            }).addTo(this.mapService['map']);
        }, 100);
    }

    async getListPosition(type: string): Promise<any[]> {
        this.mapService.clearMapLayers();
        if (type === 'asociaciones') {
            const recorrido = [
                this._leaflet.latLng(40.412416, -3.692842),
                this._leaflet.latLng(40.409798, -3.692232),
                this._leaflet.latLng(40.409486, -3.692095),
                this._leaflet.latLng(40.408929, -3.691708),
                this._leaflet.latLng(40.408795, -3.691358)
            ];
            return this.mapService.getAsocMarkers(this.mapService.map, recorrido, this.asociaciones.length, true);
        } else if (type === 'carrozas') {
            const lines = [
                [new this._leaflet.LatLng(40.407099, -3.692758), new this._leaflet.LatLng(40.406359, -3.691967)],
                [new this._leaflet.LatLng(40.405928, -3.691514), new this._leaflet.LatLng(40.405662, -3.691192)],
                [new this._leaflet.LatLng(40.405567, -3.691090), new this._leaflet.LatLng(40.404914, -3.690375)],
                [new this._leaflet.LatLng(40.404832, -3.690295), new this._leaflet.LatLng(40.403159, -3.688455)],
                [new this._leaflet.LatLng(40.402966, -3.688234), new this._leaflet.LatLng(40.401832, -3.686979)],
                [new this._leaflet.LatLng(40.401751, -3.686896), new this._leaflet.LatLng(40.401666, -3.686790)],
                [new this._leaflet.LatLng(40.401390, -3.686665), new this._leaflet.LatLng(40.400735, -3.685780)],
                [new this._leaflet.LatLng(40.400656, -3.685687), new this._leaflet.LatLng(40.400068, -3.685120)],
                [new this._leaflet.LatLng(40.399837, -3.684794), new this._leaflet.LatLng(40.399596, -3.684513)]
            ];
            return this.mapService.getCarrMarkers(this.mapService.map, lines, this.carrozas.length, true);
        }
        return [];
    }

    async updateAsociacionesPosition(): Promise<void> {
        this.spinner.show();
        const markers = await this.getListPosition('asociaciones');
        const asocs = this.asociaciones.map((asoc, index) => {
            const marker = markers[index];
            if (marker) {
                return { ...asoc, lat: marker.getLatLng().lat, lng: marker.getLatLng().lng };
            }
            return asoc;
        });
        this.asociacionesService.updatePosition(asocs).subscribe({
            next: () => {
                this.asociaciones = [...asocs];
                this.setMapAsociaciones();
                this.initObserver('asociaciones');
                this.mapType = 'map-asociaciones';
                this.spinner.hide();
            },
            error: error => {
                this._errorModal.openDialog(error);
                console.error('Error updating Asociaciónes', error);
                this.spinner.hide();
            }
        });
    }

    async updateCarrozasPosition(): Promise<void> {
        this.spinner.show();
        const markers = await this.getListPosition('carrozas');
        const carrs = this.carrozas.map((carr, index) => {
            const marker = markers[index];
            if (marker) {
                return { ...carr, lat: marker.getLatLng().lat, lng: marker.getLatLng().lng };
            }
            return carr;
        });
        this.carrozasService.updatePosition(carrs).subscribe({
            next: () => {
                this.carrozas = carrs
                    .map(a => ({ ...a, type: 'carroza' }))
                    .sort((a, b) => a.sheet_row - b.sheet_row);
                this.setMapCarrozas();
                this.initObserver('carrozas');
                this.mapType = 'map-carrozas';
                this.spinner.hide();
            },
            error: error => {
                this._errorModal.openDialog(error);
                console.error('Error updating Carrozas', error);
                this.spinner.hide();
            }
        });
    }

    getListFromSheet(): void {
        this.spinner.show();
        switch (this.tab) {
            case 0:
                this.asociacionesService.getAsociacionesFromSheet().subscribe({
                    next: async asociaciones => {
                        this.asociaciones = asociaciones;
                        await this.updateAsociacionesPosition();
                    },
                    error: error => {
                        this._errorModal.openDialog(error);
                        console.error('Error obteniendo asociaciones desde la hoja de cálculo', error);
                        this.spinner.hide();
                    }
                });
                break;
            case 1:
                this.carrozasService.getCarrozasFromSheet().subscribe({
                    next: async carrozas => {
                        this.carrozas = carrozas;
                        await this.updateCarrozasPosition();
                    },
                    error: error => {
                        this._errorModal.openDialog(error);
                        console.error('Error obteniendo carrozas desde la hoja de cálculo', error);
                        this.spinner.hide();
                    }
                });
                break;
            case 2:
                this.telefonosService.getTelefonosFromSheet().subscribe({
                    next: telefonos => {
                        this.telefonos = telefonos;
                        this.spinner.hide();
                    },
                    error: error => {
                        this._errorModal.openDialog(error);
                        console.error('Error obteniendo teléfonos desde la hoja de cálculo', error);
                        this.spinner.hide();
                    }
                });
                break;
            default:
                console.log('Tab no reconocida');
                break;
        }
    }

    getPosition(): void {
        switch (this.tab) {
            case 0:
                this.updateAsociacionesPosition();
                break;
            case 1:
                this.updateCarrozasPosition();
                break;
            default:
                console.log('Tab no reconocida');
                break;
        }
    }

    updateStatus(id: number, status: string, sheet_row: number): void {
        this.spinner.show();
        this.carrozasService.updateState(id, { status, sheet_row }).subscribe({
            next: () => this.loadCarrozas(),
            error: error => {
                this._errorModal.openDialog(error);
                console.error(`Error updating Carroza ${id}`, error);
                this.spinner.hide();
            }
        });
    }

    openDialog(carroza: Carroza): void {
        const dialogRef = this.dialog.open(ModalStatusComponent, {
            data: { carroza }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result && result !== carroza.status) {
                this.updateStatus(carroza.id, result, carroza.sheet_row);
            }
        });
    }

    onSearchChange(): void {
        const term = this.searchText.toLowerCase();
        let index = -1;
        let containerName = '';
        let itemName = '';
        if (this.tab === 0) {
            index = this.asociaciones.findIndex(a =>
                a.name.toLowerCase().includes(term) ||
                a.position?.toString().includes(term)
            );
            containerName = 'list-container-asoc';
            itemName = '.list-asociaciones-item';
        } else if (this.tab === 1) {
            index = this.carrozas.findIndex(a =>
                a.name.toLowerCase().includes(term) ||
                a.position?.toString().includes(term)
            );
            containerName = 'list-container-carr';
            itemName = '.list-carrozas-item';
        }
        if (index !== -1) {
            setTimeout(() => {
                const container = document.getElementById(containerName);
                if (!container) return;
                const items = container.querySelectorAll(itemName);
                if (items[index]) {
                    const item = items[index] as HTMLElement;
                    container.scrollTo({
                        top: item.offsetTop - container.offsetTop,
                        behavior: 'smooth'
                    });
                }
            }, 10);
        }
    }

    onImgError(event: Event): void {
        const target = event.target as HTMLImageElement;
        target.src = './../../../assets/icons/lgbt.png';
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
        @Inject(MAT_DIALOG_DATA) public data: { carroza: Carroza }
    ) {
        this.selected = this.data.carroza.status?.toLocaleLowerCase() || 'pendiente';
    }

    onSelectChange(event: any): void {
        this.selected = event.value;
    }

    onSave(): void {
        this.dialogRef.close(this.selected);
    }

    onClose(): void {
        this.dialogRef.close();
    }
}
