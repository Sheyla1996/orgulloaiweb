import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { TelefonosService } from '../../services/telefonos.service';
import { Telefono } from '../../models/telefono.model';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { VersionService } from '../../services/version.service';


@Component({
    selector: 'app-list-telefonos',
    imports: [
      CommonModule,
      FormsModule,
      MatIconModule
    ],
    standalone: true,
    templateUrl: './list-telefonos.component.html',
    styleUrls: ['./list-telefonos.component.scss']
})
export class ListTelefonosComponent implements OnInit {
  telefonos: Telefono[] = [];
  filteredTelefonos: Telefono[] = [];
  searchText = '';
  version = '';

  constructor(private telefonosService: TelefonosService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private versionService: VersionService
  ) {
    this.versionService.getVersion().subscribe(v => this.version = v);
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const cached = localStorage.getItem('telefonos');
      if (cached) {
        this.telefonos = JSON.parse(cached);
        this.filteredTelefonos = this.telefonos;
      }
      this.telefonosService.getTelefonos().subscribe({
        next: data => {
          this.telefonos = data;
          this.filteredTelefonos = data;
          localStorage.setItem('telefonos', JSON.stringify(data));
        },
        error: err => {
          console.error('Error fetching telefonos:', err);
          // Optionally, you can handle the error by showing a message to the user
        }
      });
    }
  }

  onSearchChange(): void {
    const term = this.searchText.toLowerCase();
    this.filteredTelefonos = this.telefonos.filter(t =>
      t.name.toLowerCase().includes(term) || t.zona.toLowerCase().includes(term)
    );
  }

  clearPwaCache() {
    if ('caches' in window) {
      caches.keys().then(names => {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    // Opcional: recarga la página para aplicar los cambios
    window.location.reload();
  }

}
