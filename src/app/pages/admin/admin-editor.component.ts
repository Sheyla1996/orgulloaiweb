import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { Asociacion } from '../../models/asociacion.model';
import { Carroza } from '../../models/carroza.model';
import { Telefono } from '../../models/telefono.model';
import { ErrorModalService } from '../../components/error-modal/error-modal.service';
import { AsociacionesService } from '../../services/asociaciones.service';
import { CarrozasService } from '../../services/carrozas.service';
import { TelefonosService } from '../../services/telefonos.service';
import { Pulsera, QrService } from '../../services/qr.service';
import { Whatsapp } from '../../models/whatsapp.model';
import { WhatsappService } from '../../services/whatsapp.service';

@Component({
  selector: 'app-admin-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, NgxSpinnerModule],
  templateUrl: './admin-editor.component.html',
  styleUrls: ['./admin-editor.component.scss']
})
export class AdminEditorComponent implements OnInit {
  type: 'asociacion' | 'carroza' | 'telefono' | 'whatsapp' | 'pulsera' = 'asociacion';
  tab = 0;
  idParam = '';

  asociacionForm: Partial<Asociacion> = { name: '', shortName: '', logo: '', zona: '', isBatucada: false, showPosition: 0 };
  carrozaForm: Partial<Carroza> = { name: '', logo: '', zona: '', status: 'pendiente', size: '' };
  telefonoForm: Partial<Telefono> = { name: '', telefono: '', zona: '' };
  whatsappForm: Partial<Whatsapp> = { zona: '', link: '' };
  pulseraForm: { uuid: string; zona: string; type: string; description?: string; year?: number } = { uuid: '', zona: '', type: '' };

  readonly zonas = ['blanca', 'roja', 'naranja', 'amarilla', 'verde', 'azul', 'violeta', 'rosa', 'coor', 'grupo'];
  readonly carrozaStatusOptions = ['pendiente', 'aparcando', 'situado'];
  readonly carrozaSizeOptions = [
    {
      label: 'Autobús',
      value: 'm'
    },
    {
      label: 'Trailer',
      value: 'l'
    }
  ];
  readonly typeOptions = ['normal', 'coor', 'coor_manana', 'boss'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private spinner: NgxSpinnerService,
    private errorModal: ErrorModalService,
    private asociacionesService: AsociacionesService,
    private carrozasService: CarrozasService,
    private telefonosService: TelefonosService,
    private whatsappService: WhatsappService,
    private qrService: QrService
  ) {}

  ngOnInit(): void {
    this.type = (this.route.snapshot.queryParamMap.get('type') as any) || 'asociacion';
    this.idParam = this.route.snapshot.queryParamMap.get('id') || '';
    const tabParam = Number(this.route.snapshot.queryParamMap.get('tab'));
    this.tab = Number.isInteger(tabParam) ? tabParam : 0;

    if (this.idParam) {
      this.loadItem();
    }
  }

  get title(): string {
    const action = this.idParam ? 'Editar' : 'Nuevo';
    if (this.type === 'carroza') return `${action} carroza`;
    if (this.type === 'telefono') return `${action} telefono`;
    if (this.type === 'whatsapp') return `${action} whatsapp`;
    if (this.type === 'pulsera') return `${action} pulsera`;
    return `${action} asociacion`;
  }

  goBack(): void {
    this.router.navigate(['/admin'], { queryParams: { tab: this.tab } });
  }

  save(): void {
    if (this.type === 'asociacion') {
      this.saveAsociacion();
      return;
    }
    if (this.type === 'carroza') {
      this.saveCarroza();
      return;
    }
    if (this.type === 'telefono') {
      this.saveTelefono();
      return;
    }
    if (this.type === 'whatsapp') {
      this.saveWhatsapp();
      return;
    }
    this.savePulsera();
  }

  private loadItem(): void {
    this.spinner.show();

    if (this.type === 'asociacion') {
      const id = Number(this.idParam);
      this.asociacionesService.getAsociaciones().subscribe({
        next: list => {
          const item = (list || []).find(a => a.id === id);
          if (item) this.asociacionForm = { ...item };
          this.spinner.hide();
        },
        error: error => this.handleError('No se pudo cargar la asociacion', error)
      });
      return;
    }

    if (this.type === 'carroza') {
      const id = Number(this.idParam);
      this.carrozasService.getCarrozas().subscribe({
        next: list => {
          const item = (list || []).find(c => c.id === id);
          if (item) this.carrozaForm = { ...item };
          this.spinner.hide();
        },
        error: error => this.handleError('No se pudo cargar la carroza', error)
      });
      return;
    }

    if (this.type === 'telefono') {
      const id = Number(this.idParam);
      this.telefonosService.getTelefonos().subscribe({
        next: list => {
          const item = (list || []).find(t => t.id === id);
          if (item) this.telefonoForm = { ...item };
          this.spinner.hide();
        },
        error: error => this.handleError('No se pudo cargar el telefono', error)
      });
      return;
    }

    if (this.type === 'whatsapp') {
      const id = Number(this.idParam);
      this.whatsappService.getWhatsapp().subscribe({
        next: list => {
          const item = (list || []).find(w => w.id === id);
          if (item) this.whatsappForm = { ...item };
          this.spinner.hide();
        },
        error: error => this.handleError('No se pudo cargar el whatsapp', error)
      });
      return;
    }

    this.qrService.getPulseras().subscribe({
      next: list => {
        const item = (list || []).find((p: Pulsera) => p.uuid === this.idParam);
        if (item) this.pulseraForm = { uuid: item.uuid, zona: item.zona, type: item.type, description: item.description, year: item.year };
        this.spinner.hide();
      },
      error: error => this.handleError('No se pudo cargar la pulsera', error)
    });
  }

  private saveAsociacion(): void {
    const payload = {
      name: (this.asociacionForm.name || '').trim(),
      shortName: (this.asociacionForm.shortName || '').trim(),
      logo: (this.asociacionForm.logo || '').trim(),
      zona: (this.asociacionForm.zona || '').trim().toLowerCase(),
      isBatucada: !!this.asociacionForm.isBatucada,
      showPosition: this.asociacionForm.showPosition ?? 0,
      sheet_row: this.asociacionForm.sheet_row
    };

    if (!payload.name || !payload.zona) {
      this.errorModal.openDialog('Nombre y zona son obligatorios');
      return;
    }

    this.spinner.show();
    if (this.idParam) {
      this.asociacionesService.updateAsociacion(Number(this.idParam), payload).subscribe({
        next: () => this.goBack(),
        error: error => this.handleError('Error al guardar asociacion', error)
      });
      return;
    }

    this.asociacionesService.createAsociacion(payload).subscribe({
      next: () => this.goBack(),
      error: error => this.handleError('Error al crear asociacion', error)
    });
  }

  private saveCarroza(): void {
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
    const payload = { nombre: name, zona, status, size, logo, sheet_row: 0 };
    if (this.idParam) {
      this.carrozasService.updateCarroza(Number(this.idParam), payload).subscribe({
        next: () => this.goBack(),
        error: error => this.handleError('Error al guardar carroza', error)
      });
      return;
    }

    this.carrozasService.createCarroza(payload).subscribe({
      next: () => this.goBack(),
      error: error => this.handleError('Error al crear carroza', error)
    });
  }

  private saveTelefono(): void {
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
    if (this.idParam) {
      this.telefonosService.updateTelefono(Number(this.idParam), payload).subscribe({
        next: () => this.goBack(),
        error: error => this.handleError('Error al guardar telefono', error)
      });
      return;
    }

    this.telefonosService.getTelefonos().subscribe({
      next: list => {
        const nextSheetRow = (list?.length || 0) + 2;
        this.telefonosService.createTelefono({ ...payload, sheet_row: nextSheetRow }).subscribe({
          next: () => this.goBack(),
          error: error => this.handleError('Error al crear telefono', error)
        });
      },
      error: error => this.handleError('Error al preparar alta de telefono', error)
    });
  }

  private savePulsera(): void {
    const description = (this.pulseraForm.description || '').trim();
    const zona = this.pulseraForm.zona.trim().toLowerCase();
    const type = this.pulseraForm.type.trim().toLowerCase();
    const uuid = this.pulseraForm.uuid.trim();
    const year = this.pulseraForm.year;

    if (!zona || !type) {
      this.errorModal.openDialog('Zona y tipo son obligatorios');
      return;
    }

    this.spinner.show();
    if (this.idParam) {
      this.qrService.updatePulsera(this.idParam, { zona, type, description, year }).subscribe({
        next: () => this.goBack(),
        error: error => this.handleError('Error al guardar pulsera', error)
      });
      return;
    }

    if (!uuid) {
      let newUuid: string;
      this.qrService.getPulseras().subscribe({
        next: (pulseras: Pulsera[]) => {
          let exists = true;
          while (exists) {
            newUuid = this.generateRandomId(10);
            exists = pulseras.some(p => p.uuid === newUuid);
          }
          this.qrService.createPulsera({ uuid: newUuid, zona, type, description, year }).subscribe({
            next: () => this.goBack(),
            error: error => this.handleError('Error al crear pulsera', error)
          });
        },
        error: error => this.handleError('Error al preparar alta de pulsera', error)
      });
      return;
    }

    this.qrService.createPulsera({ uuid, zona, type, description, year }).subscribe({
      next: () => this.goBack(),
      error: error => this.handleError('Error al crear pulsera', error)
    });
  }

  private saveWhatsapp(): void {
    const payload = {
      zona: (this.whatsappForm.zona || '').trim().toLowerCase(),
      link: this.extractWhatsappGroupId((this.whatsappForm.link || '').trim()),
    };

    

    if (!payload.zona || !payload.link) {
      this.errorModal.openDialog('Zona y link son obligatorios');
      return;
    }

    this.spinner.show();
    if (this.idParam) {
      this.whatsappService.updateWhatsapp(Number(this.idParam), payload).subscribe({
        next: () => this.goBack(),
        error: error => this.handleError('Error al guardar whatsapp', error)
      });
      return;
    }

    this.whatsappService.getWhatsapp().subscribe({
      next: list => {
        const nextSheetRow = (list?.length || 0) + 2;
        this.whatsappService.createWhatsapp({ ...payload, sheet_row: nextSheetRow }).subscribe({
          next: () => this.goBack(),
          error: error => this.handleError('Error al crear whatsapp', error)
        });
      },
      error: error => this.handleError('Error al preparar alta de whatsapp', error)
    });
  }

  private extractWhatsappGroupId(rawLink: string): string {
    const raw = (rawLink || '').trim();
    if (!raw) return '';

    try {
      if (/^https?:\/\//i.test(raw)) {
        const url = new URL(raw);
        const segments = url.pathname.split('/').filter(Boolean);
        return segments.length ? segments[segments.length - 1] : '';
      }
    } catch {
      // Si URL falla, continuamos con parseo manual.
    }

    const noQuery = raw.split('?')[0];
    const cleaned = noQuery.replace(/^\/+|\/+$/g, '');
    const segments = cleaned.split('/').filter(Boolean);
    return segments.length ? segments[segments.length - 1] : cleaned;
  }

  private generateRandomId(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.errorModal.openDialog(typeof error === 'string' ? error : (error?.error?.message || message));
    this.spinner.hide();
  }
}
