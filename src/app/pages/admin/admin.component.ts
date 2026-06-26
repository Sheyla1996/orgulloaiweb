import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ChangeDetectionStrategy, Component, Inject, NO_ERRORS_SCHEMA, OnInit, PLATFORM_ID } from "@angular/core";
import { MatTabsModule } from '@angular/material/tabs';
import { AsociacionesService } from "../../services/asociaciones.service";
import { CarrozasService } from "../../services/carrozas.service";
import { TelefonosService } from "../../services/telefonos.service";
import { Asociacion } from "../../models/asociacion.model";
import { Carroza } from "../../models/carroza.model";
import { Telefono } from "../../models/telefono.model";
import { MatButtonModule } from "@angular/material/button";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { NgxSpinnerService } from "ngx-spinner";
import { ErrorModalService } from "../../components/error-modal/error-modal.service";
import { WhatsappService } from "../../services/whatsapp.service";
import { Whatsapp } from "../../models/whatsapp.model";
import { Pulsera, QrService } from "../../services/qr.service";
import { ActivatedRoute, Router } from "@angular/router";
import { SettingsService } from "../../services/settings.service";
import { c } from "../../../../node_modules/@angular/cdk/a11y-module.d-DBHGyKoh";

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        MatButtonModule,
        FormsModule,
        MatIconModule
    ],
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    schemas: [NO_ERRORS_SCHEMA]
})
export class AdminComponent implements OnInit {
    tab = 0;
    searchText = '';
    useTestTables = false;
    testSettingId: string | null = null;
    loadingSettings = false;
    savingSettings = false;

    asociaciones: Asociacion[] = [];
    carrozas: Carroza[] = [];
    telefonos: Telefono[] = [];
    whatsapp: Whatsapp[] = [];
    pulseras: Pulsera[] = [];

    asociacionForm: Partial<Asociacion> = { name: '', shortName: '', logo: '', zona: '', isBatucada: false };
    carrozaForm: Partial<Carroza> = { name: '', logo: '', zona: '', status: 'pendiente', size: '' };
    telefonoForm: Partial<Telefono> = { name: '', telefono: '', zona: '' };
    whatsappForm: Partial<Whatsapp> = { zona: '', link: '' };
    pulseraForm: { uuid: string; zona: string; type: string } = { uuid: '', zona: '', type: '' };

    editingAsociacionId: number | null = null;
    editingCarrozaId: number | null = null;
    editingTelefonoId: number | null = null;
    editingWhatsappId: number | null = null;
    editingPulseraUuid: string | null = null;

    readonly zonas = ['blanca', 'azul', 'verde', 'roja', 'naranja', 'amarilla'];
    readonly carrozaStatusOptions = ['pendiente', 'aparcando', 'situado'];
    readonly carrozaSizeOptions = ['pequena', 'mediana', 'grande'];

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private asociacionesService: AsociacionesService,
        private carrozasService: CarrozasService,
        private telefonosService: TelefonosService,
        private whatsappService: WhatsappService,
        private qrService: QrService,
        private settingsService: SettingsService,
        private spinner: NgxSpinnerService,
        private errorModal: ErrorModalService,
        @Inject(PLATFORM_ID) private platformId: Object,
    ) {}

    ngOnInit(): void {
        const tabParam = this.route.snapshot.queryParamMap.get('tab');
        const parsed = Number(tabParam);
        this.tab = Number.isInteger(parsed) && parsed >= 0 && parsed <= 5 ? parsed : 0;
        this.loadDataForCurrentTab();
    }

    onTabChange(event: any): void {
        this.tab = event.index;
        this.searchText = '';
        this.loadDataForCurrentTab();
    }

    openCreateForm(): void {
        const type = this.tab === 0 ? 'asociacion' : this.tab === 1 ? 'carroza' : this.tab === 2 ? 'telefono' : this.tab === 3 ? 'whatsapp' : 'pulsera';
        this.router.navigate(['/admin/editor'], { queryParams: { type, tab: this.tab } });
    }

    goToEditor(type: 'asociacion' | 'carroza' | 'telefono' | 'whatsapp' | 'pulsera', id: number | string): void {
        this.router.navigate(['/admin/editor'], { queryParams: { type, id, tab: this.tab } });
    }

    private loadDataForCurrentTab(): void {
        if (this.tab === 0) this.loadAsociaciones();
        if (this.tab === 1) this.loadCarrozas();
        if (this.tab === 2) this.loadTelefonos();
        if (this.tab === 3) this.loadWhatsapp();
        if (this.tab === 4) this.loadPulseras();
        if (this.tab === 5) this.loadSettingsTab();
    }

    getSearchPlaceholder(): string {
        if (this.tab === 1) return 'Buscar carroza';
        if (this.tab === 2) return 'Buscar telefono';
        if (this.tab === 3) return 'Buscar whatsapp';
        if (this.tab === 4) return 'Buscar pulsera';
        if (this.tab === 5) return 'Ajustes';
        return 'Buscar asociacion';
    }

    private loadSettingsTab(): void {
        this.loadingSettings = true;
        this.settingsService.getSettings().subscribe({
            next: settings => {
                const setting = (settings ?? []).find(s => String(s.key || '').toLowerCase() === 'test');
                this.testSettingId = setting?.id != null ? String(setting.id) : null;
                this.useTestTables = this.parseBooleanSetting(setting?.value);
                localStorage.setItem('test', this.useTestTables ? 'true' : 'false');
                this.loadingSettings = false;
            },
            error: error => {
                this.loadingSettings = false;
                this.handleError('Error al cargar ajustes', error);
            }
        });
    }

    saveTestSetting(): void {
        const value = this.useTestTables ? 'true' : 'false';
        const payload = { key: 'test', value };
        this.savingSettings = true;

        const request$ = this.testSettingId
            ? this.settingsService.updateSetting(this.testSettingId, payload)
            : this.settingsService.createSetting(payload);

        request$.subscribe({
            next: () => {
                localStorage.setItem('test', value);
                this.savingSettings = false;
                this.loadSettingsTab();
            },
            error: error => {
                this.savingSettings = false;
                this.handleError('Error al guardar ajuste de tablas test', error);
            }
        });
    }

    private parseBooleanSetting(value: unknown): boolean {
        const normalized = String(value ?? '').trim().toLowerCase();
        return ['true', '1', 'si', 'sí', 'yes', 'on'].includes(normalized);
    }

    getAsociacionesView(): Asociacion[] {
        return [...this.asociaciones].sort((a, b) => (a.sheet_row ?? 0) - (b.sheet_row ?? 0));
    }

    getCarrozasView(): Carroza[] {
        return [...this.carrozas].sort((a, b) => (a.sheet_row ?? 0) - (b.sheet_row ?? 0));
    }

    getTelefonosView(): Telefono[] {
        return this.telefonos;
    }

    getPulserasView(): Pulsera[] {
        return [...this.pulseras];
    }

    getWhatsappView(): Whatsapp[] {
        return this.whatsapp;
    }

    onSearchChange(): void {
        const term = this.searchText.trim().toLowerCase();
        if (!term) return;

        const configs: { listId: string; matches: (i: number) => boolean }[] = [
            {
                listId: 'admin-list-asoc',
                matches: i => {
                    const a = this.getAsociacionesView()[i];
                    return `${a.position}`.includes(term) ||
                        (a.name || '').toLowerCase().includes(term) ||
                        (a.shortName || '').toLowerCase().includes(term) ||
                        (a.zona || '').toLowerCase().includes(term);
                }
            },
            {
                listId: 'admin-list-carr',
                matches: i => {
                    const c = this.getCarrozasView()[i];
                    return `${c.position}`.includes(term) ||
                        (c.name || '').toLowerCase().includes(term) ||
                        (c.zona || '').toLowerCase().includes(term) ||
                        (c.status || '').toLowerCase().includes(term);
                }
            },
            {
                listId: 'admin-list-tel',
                matches: i => {
                    const t = this.telefonos[i];
                    return (t.name || '').toLowerCase().includes(term) ||
                        (t.telefono || '').toLowerCase().includes(term) ||
                        (t.zona || '').toLowerCase().includes(term);
                }
            },
            {
                listId: 'admin-list-wa',
                matches: i => {
                    const w = this.getWhatsappView()[i];
                    return (w.zona || '').toLowerCase().includes(term) ||
                        (w.link || '').toLowerCase().includes(term);
                }
            },
            {
                listId: 'admin-list-puls',
                matches: i => {
                    const p = this.getPulserasView()[i];
                    return (p.uuid || '').toLowerCase().includes(term) ||
                        (p.zona || '').toLowerCase().includes(term) ||
                        (p.type || '').toLowerCase().includes(term);
                }
            },
        ];

        const cfg = configs[this.tab];
        if (!cfg) return;

        const container = document.getElementById(cfg.listId);
        if (!container) return;

        const items = Array.from(container.querySelectorAll<HTMLElement>('.item-card'));
        const lists = [this.getAsociacionesView(), this.getCarrozasView(), this.telefonos, this.getWhatsappView(), this.getPulserasView()];
        const currentList = lists[this.tab];

        const idx = currentList.findIndex((_, i) => cfg.matches(i));
        if (idx !== -1 && items[idx]) {
            items[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    private loadAsociaciones(): void {
        this.spinner.show();
        this.asociacionesService.getAsociaciones().subscribe({
            next: list => {
                this.asociaciones = (list ?? []).map(a => ({ ...a, type: 'asociacion' })).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                this.spinner.hide();
            },
            error: error => this.handleError('Error al cargar asociaciones', error)
        });
    }

    private loadCarrozas(): void {
        this.spinner.show();
        this.carrozasService.getCarrozas().subscribe({
            next: list => {
                this.carrozas = (list ?? []).map(c => ({ ...c, type: 'carroza' })).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                this.spinner.hide();
            },
            error: error => this.handleError('Error al cargar carrozas', error)
        });
    }

    private loadTelefonos(): void {
        this.spinner.show();
        this.telefonosService.getTelefonos().subscribe({
            next: list => {
                this.telefonos = (list ?? []).sort((a, b) => (a.sheet_row ?? 0) - (b.sheet_row ?? 0));
                this.spinner.hide();
            },
            error: error => this.handleError('Error al cargar telefonos', error)
        });
    }

    private loadPulseras(): void {
        this.spinner.show();
        this.qrService.getPulseras().subscribe({
            next: list => {
                this.pulseras = list ?? [];
                this.spinner.hide();
            },
            error: error => this.handleError('Error al cargar pulseras', error)
        });
    }

    private loadWhatsapp(): void {
        this.spinner.show();
        this.whatsappService.getWhatsapp().subscribe({
            next: list => {
                this.whatsapp = (list ?? []).sort((a, b) => (a.sheet_row ?? 0) - (b.sheet_row ?? 0));
                this.spinner.hide();
            },
            error: error => this.handleError('Error al cargar whatsapp', error)
        });
    }

    getListFromSheet(): void {
        this.spinner.show();
        if (this.tab === 0) {
            this.asociacionesService.getAsociacionesFromSheet().subscribe({
                next: list => {
                    this.asociaciones = list ?? [];
                    this.spinner.hide();
                },
                error: error => this.handleError('Error al obtener asociaciones desde Sheet', error)
            });
            return;
        }

        if (this.tab === 1) {
            this.carrozasService.getCarrozasFromSheet().subscribe({
                next: list => {
                    this.carrozas = list ?? [];
                    this.spinner.hide();
                },
                error: error => this.handleError('Error al obtener carrozas desde Sheet', error)
            });
            return;
        }

        if (this.tab === 2) {
            this.telefonosService.getTelefonosFromSheet().subscribe({
                next: list => {
                    this.telefonos = list ?? [];
                    this.spinner.hide();
                },
                error: error => this.handleError('Error al obtener telefonos desde Sheet', error)
            });
            return;
        }

        if (this.tab === 3) {
            this.whatsappService.getWhatsappFromSheet().subscribe({
                next: list => {
                    this.whatsapp = list ?? [];
                    this.spinner.hide();
                },
                error: error => this.handleError('Error al obtener whatsapp desde Sheet', error)
            });
        }
    }

    startEditAsociacion(a: Asociacion): void {
        this.editingAsociacionId = a.id;
        this.asociacionForm = { ...a };
    }

    cancelEditAsociacion(): void {
        this.editingAsociacionId = null;
        this.asociacionForm = { name: '', shortName: '', logo: '', zona: '', isBatucada: false, showPosition: 0 };
    }

    saveAsociacion(): void {
        const payload = {
            name: (this.asociacionForm.name || '').trim(),
            shortName: (this.asociacionForm.shortName || '').trim(),
            logo: (this.asociacionForm.logo || '').trim(),
            zona: (this.asociacionForm.zona || '').trim().toLowerCase(),
            isBatucada: !!this.asociacionForm.isBatucada,
            sheet_row: this.asociacionForm.sheet_row,
            showPosition: this.asociacionForm.showPosition ?? 0
        };

        if (!payload.name || !payload.zona) {
            this.errorModal.openDialog('Nombre y zona son obligatorios');
            return;
        }

        this.spinner.show();
        if (this.editingAsociacionId) {
            this.asociacionesService.updateAsociacion(this.editingAsociacionId, payload).subscribe({
                next: () => {
                    this.cancelEditAsociacion();
                    this.loadAsociaciones();
                },
                error: error => this.handleError('Error al editar asociacion', error)
            });
            return;
        }

        this.asociacionesService.createAsociacion(payload).subscribe({
            next: () => {
                this.cancelEditAsociacion();
                this.loadAsociaciones();
            },
            error: error => this.handleError('Error al crear asociacion', error)
        });
    }

    deleteAsociacion(id: number): void {
        if (!confirm('¿Seguro que quieres borrar esta asociacion?')) return;
        this.spinner.show();
        this.asociacionesService.deleteAsociacion(id).subscribe({
            next: () => this.loadAsociaciones(),
            error: error => this.handleError('Error al borrar asociacion', error)
        });
    }

    moveAsociacion(item: Asociacion, direction: -1 | 1): void {
        const sorted = this.getAsociacionesView();
        const idx = sorted.findIndex(a => a.id === item.id);
        const neighbour = sorted[idx + direction];
        if (!neighbour) return;
        this.spinner.show();
        this.asociacionesService.changePosicion(item.id, neighbour.position).subscribe({
            next: () => this.loadAsociaciones(),
            error: error => this.handleError('Error al reordenar asociacion', error)
        });
    }

    startEditCarroza(c: Carroza): void {
        this.editingCarrozaId = c.id;
        this.carrozaForm = { ...c };
    }

    cancelEditCarroza(): void {
        this.editingCarrozaId = null;
        this.carrozaForm = { name: '', logo: '', zona: '', status: 'pendiente', size: '' };
    }

    saveCarroza(): void {
        const name = (this.carrozaForm.name || '').trim();
        const zona = (this.carrozaForm.zona || '').trim().toLowerCase();
        const status = (this.carrozaForm.status || 'pendiente').trim().toLowerCase();
        const size = (this.carrozaForm.size || '').trim().toLowerCase();
        const logo = (this.carrozaForm.logo || '').trim();

        if (!name || !zona) {
            this.errorModal.openDialog('Nombre y zona son obligatorios');
            return;
        }

        this.spinner.show();

        if (this.editingCarrozaId) {
            this.carrozasService.updateCarroza(this.editingCarrozaId, {
                nombre: name,
                zona,
                status,
                size,
                logo
            }).subscribe({
                next: () => {
                    this.cancelEditCarroza();
                    this.loadCarrozas();
                },
                error: error => this.handleError('Error al editar carroza', error)
            });
            return;
        }

        this.carrozasService.createCarroza({
            nombre: name,
            zona,
            status,
            size,
            logo
        }).subscribe({
            next: () => {
                this.cancelEditCarroza();
                this.loadCarrozas();
            },
            error: error => this.handleError('Error al crear carroza', error)
        });
    }

    deleteCarroza(id: number): void {
        if (!confirm('¿Seguro que quieres borrar esta carroza?')) return;
        this.spinner.show();
        this.carrozasService.deleteCarroza(id).subscribe({
            next: () => this.loadCarrozas(),
            error: error => this.handleError('Error al borrar carroza', error)
        });
    }

    moveCarroza(item: Carroza, direction: -1 | 1): void {
        const sorted = this.getCarrozasView();
        const idx = sorted.findIndex(c => c.id === item.id);
        const neighbour = sorted[idx + direction];
        if (!neighbour) return;
        this.spinner.show();
        this.carrozasService.changePosicion(item.id, neighbour.position).subscribe({
            next: () => this.loadCarrozas(),
            error: error => this.handleError('Error al reordenar carroza', error)
        });
    }

    startEditTelefono(t: Telefono): void {
        this.editingTelefonoId = t.id;
        this.telefonoForm = { ...t };
    }

    cancelEditTelefono(): void {
        this.editingTelefonoId = null;
        this.telefonoForm = { name: '', telefono: '', zona: '' };
    }

    saveTelefono(): void {
        const payload = {
            name: (this.telefonoForm.name || '').trim(),
            telefono: (this.telefonoForm.telefono || '').trim(),
            zona: (this.telefonoForm.zona || '').trim().toLowerCase(),
        };

        if (!payload.name || !payload.zona) {
            this.errorModal.openDialog('Nombre y zona son obligatorios');
            return;
        }

        this.spinner.show();
        if (this.editingTelefonoId) {
            this.telefonosService.updateTelefono(this.editingTelefonoId, payload).subscribe({
                next: () => {
                    this.cancelEditTelefono();
                    this.loadTelefonos();
                },
                error: error => this.handleError('Error al editar telefono', error)
            });
            return;
        }

        const nextSheetRow = this.telefonos.length + 2;
        this.telefonosService.createTelefono({ ...payload, sheet_row: nextSheetRow }).subscribe({
            next: () => {
                this.cancelEditTelefono();
                this.loadTelefonos();
            },
            error: error => this.handleError('Error al crear telefono', error)
        });
    }

    deleteTelefono(id: number): void {
        if (!confirm('¿Seguro que quieres borrar este telefono?')) return;
        this.spinner.show();
        this.telefonosService.deleteTelefono(id).subscribe({
            next: () => this.loadTelefonos(),
            error: error => this.handleError('Error al borrar telefono', error)
        });
    }

    moveTelefono(index: number, direction: -1 | 1): void {
        const target = index + direction;
        if (target < 0 || target >= this.telefonos.length) return;
        const copy = [...this.telefonos];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        copy.forEach((t, i) => { t.sheet_row = i + 2; });
        this.telefonos = copy;
    }

    deleteWhatsapp(id: number): void {
        if (!confirm('¿Seguro que quieres borrar este enlace de whatsapp?')) return;
        this.spinner.show();
        this.whatsappService.deleteWhatsapp(id).subscribe({
            next: () => this.loadWhatsapp(),
            error: error => this.handleError('Error al borrar whatsapp', error)
        });
    }

    startEditPulsera(p: Pulsera): void {
        this.editingPulseraUuid = p.uuid;
        this.pulseraForm = { uuid: p.uuid, zona: p.zona, type: p.type };
    }

    cancelEditPulsera(): void {
        this.editingPulseraUuid = null;
        this.pulseraForm = { uuid: '', zona: '', type: '' };
    }

    savePulsera(): void {
        const zona = this.pulseraForm.zona.trim().toLowerCase();
        const type = this.pulseraForm.type.trim().toLowerCase();
        const uuid = this.pulseraForm.uuid.trim();
        if (!zona || !type) {
            this.errorModal.openDialog('Zona y tipo son obligatorios');
            return;
        }

        this.spinner.show();
        if (this.editingPulseraUuid) {
            this.qrService.updatePulsera(this.editingPulseraUuid, { zona, type }).subscribe({
                next: () => {
                    this.cancelEditPulsera();
                    this.loadPulseras();
                },
                error: error => this.handleError('Error al editar pulsera', error)
            });
            return;
        }

        this.qrService.createPulsera(uuid ? { uuid, zona, type } : { zona, type }).subscribe({
            next: () => {
                this.cancelEditPulsera();
                this.loadPulseras();
            },
            error: error => this.handleError('Error al crear pulsera', error)
        });
    }

    deletePulsera(uuid: string): void {
        if (!confirm('¿Seguro que quieres borrar esta pulsera?')) return;
        this.spinner.show();
        this.qrService.deletePulsera(uuid).subscribe({
            next: () => {
                if (this.editingPulseraUuid === uuid) this.cancelEditPulsera();
                this.loadPulseras();
            },
            error: error => this.handleError('Error al borrar pulsera', error)
        });
    }

    movePulsera(index: number, direction: -1 | 1): void {
        const target = index + direction;
        if (target < 0 || target >= this.pulseras.length) return;
        const copy = [...this.pulseras];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        this.pulseras = copy;
    }

    getQrImageUrl(uuid: string): string {
        return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(this.buildAccessUrl(uuid))}`;
    }

    openQr(uuid: string): void {
        if (!isPlatformBrowser(this.platformId)) return;
        window.open(this.getQrImageUrl(uuid), '_blank');
    }

    async writeNfc(uuid: string): Promise<void> {
        if (!isPlatformBrowser(this.platformId)) return;
        const NDEF = (window as any).NDEFReader;
        if (!NDEF) {
            this.errorModal.openDialog('NFC no soportado en este dispositivo/navegador. Usa Android + Chrome.');
            return;
        }

        try {
            const ndef = new NDEF();
            await ndef.write({ records: [{ recordType: 'url', data: this.buildAccessUrl(uuid) }] });
            alert('Etiqueta NFC escrita correctamente');
        } catch (error) {
            this.handleError('No se pudo escribir la etiqueta NFC', error);
        }
    }

    private buildAccessUrl(uuid: string): string {
        return `https://voluntariadolgtbapp.es/qr?uuid=${encodeURIComponent(uuid)}`;
    }

    private handleError(message: string, error: any): void {
        console.error(message, error);
        this.errorModal.openDialog(typeof error === 'string' ? error : (error?.error?.message || message));
        this.spinner.hide();
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
